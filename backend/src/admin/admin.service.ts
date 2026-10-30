import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '../common/enums';
import * as bcrypt from 'bcrypt';
import type { Prisma, Team, User } from '@prisma/client';
import {
  AdminCreateUserDto,
  AdminUpdateUserDto,
  AdminUserQueryDto,
  AdminTeamDto,
  AdminTeamQueryDto,
  AuditLogQueryDto,
  CreateAuditLogDto,
  SystemStatsDto,
  AdminOverrideDto,
  BulkUserOperationDto,
  HierarchyRestructureDto,
  AdminUserResponseDto,
  AdminTeamResponseDto,
  AuditLogResponseDto,
  PaginatedResponseDto,
} from './dto';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  // ====== AUDIT LOGGING ======

  /**
   * Create an audit log entry
   */
  async createAuditLog(
    userId: number,
    auditData: CreateAuditLogDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId,
          action: auditData.action,
          entity: auditData.entity,
          entityId: auditData.entityId,
          details: auditData.details,
          metadata: auditData.metadata as Prisma.InputJsonValue | undefined,
          ipAddress,
          userAgent,
        },
      });
    } catch (error) {
      console.error('Failed to create audit log:', error);
    }
  }

  /**
   * Get audit logs with pagination and filtering
   */
  async getAuditLogs(
    query: AuditLogQueryDto,
  ): Promise<PaginatedResponseDto<AuditLogResponseDto>> {
    const {
      page = 1,
      limit = 50,
      action,
      userId,
      entity,
      startDate,
      endDate,
    } = query;
    const skip = (page - 1) * limit;

    const whereClause: Prisma.AuditLogWhereInput = {};

    if (action) {
      whereClause.action = { contains: action, mode: 'insensitive' };
    }
    if (userId) {
      whereClause.userId = userId;
    }
    if (entity) {
      whereClause.entity = { contains: entity, mode: 'insensitive' };
    }
    if (startDate || endDate) {
      whereClause.timestamp = {
        ...(startDate && { gte: new Date(startDate) }),
        ...(endDate && { lte: new Date(endDate) }),
      };
    }

    const [auditLogs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: whereClause,
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
        orderBy: { timestamp: 'desc' },
      }),
      this.prisma.auditLog.count({ where: whereClause }),
    ]);

    const formattedLogs: AuditLogResponseDto[] = auditLogs.map((log) => ({
      id: log.id,
      userId: log.userId,
      user: {
        id: log.user.id,
        name: log.user.name,
        email: log.user.email,
        role: log.user.role, // Type assertion to match our enum
      },
      action: log.action,
      entity: log.entity,
      entityId: log.entityId ?? undefined,
      details: log.details ?? undefined,
      metadata: log.metadata,
      ipAddress: log.ipAddress ?? undefined,
      userAgent: log.userAgent ?? undefined,
      timestamp: log.timestamp,
    }));

    return {
      data: formattedLogs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ====== USER MANAGEMENT (ADMIN OVERRIDE) ======

  /**
   * Create a user with admin privileges (bypasses normal RBAC)
   */
  async createUser(
    createUserDto: AdminCreateUserDto,
    adminId: number,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AdminUserResponseDto> {
    // Check if email already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    // Validate parent hierarchy if parentId is provided
    if (createUserDto.parentId) {
      const parent = await this.prisma.user.findUnique({
        where: { id: createUserDto.parentId, isActive: true },
      });

      if (!parent) {
        throw new BadRequestException('Parent user not found or inactive');
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(createUserDto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        name: createUserDto.name,
        email: createUserDto.email,
        password: hashedPassword,
        role: createUserDto.role,
        parentId: createUserDto.parentId,
        isActive: createUserDto.isActive ?? true,
      },
      include: {
        parent: {
          select: { id: true, name: true, role: true },
        },
        _count: {
          select: {
            subordinates: true,
            teamsManaged: true,
            teamMemberships: true,
          },
        },
      },
    });

    // Create audit log
    await this.createAuditLog(
      adminId,
      {
        action: 'ADMIN_CREATE_USER',
        entity: 'User',
        entityId: user.id,
        details: `Created user ${user.name} (${user.email}) with role ${user.role}`,
        metadata: { targetUserId: user.id, role: user.role },
      },
      ipAddress,
      userAgent,
    );

    return this.formatUserResponse(user);
  }

  /**
   * Update any user with admin privileges
   */
  async updateUser(
    userId: number,
    updateUserDto: AdminUpdateUserDto,
    adminId: number,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AdminUserResponseDto> {
    const existingUser = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    // Check email uniqueness if updating email
    if (updateUserDto.email && updateUserDto.email !== existingUser.email) {
      const emailExists = await this.prisma.user.findUnique({
        where: { email: updateUserDto.email },
      });

      if (emailExists) {
        throw new ConflictException('Email already exists');
      }
    }

    // Validate parent hierarchy if updating parentId
    if (updateUserDto.parentId !== undefined) {
      if (updateUserDto.parentId !== null) {
        const parent = await this.prisma.user.findUnique({
          where: { id: updateUserDto.parentId, isActive: true },
        });

        if (!parent) {
          throw new BadRequestException('Parent user not found or inactive');
        }

        // Prevent circular reference
        if (updateUserDto.parentId === userId) {
          throw new BadRequestException('User cannot be their own parent');
        }
      }
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: updateUserDto,
      include: {
        parent: {
          select: { id: true, name: true, role: true },
        },
        _count: {
          select: {
            subordinates: true,
            teamsManaged: true,
            teamMemberships: true,
          },
        },
      },
    });

    // Create audit log
    await this.createAuditLog(
      adminId,
      {
        action: 'ADMIN_UPDATE_USER',
        entity: 'User',
        entityId: userId,
        details: `Updated user ${updatedUser.name} (${updatedUser.email})`,
        metadata: {
          targetUserId: userId,
          changes: updateUserDto,
          oldRole: existingUser.role,
          newRole: updatedUser.role,
        },
      },
      ipAddress,
      userAgent,
    );

    return this.formatUserResponse(updatedUser);
  }

  /**
   * Get all users with admin privileges (bypasses RBAC)
   */
  async getAllUsers(
    query: AdminUserQueryDto,
  ): Promise<PaginatedResponseDto<AdminUserResponseDto>> {
    const {
      page = 1,
      limit = 20,
      role,
      isActive,
      search,
      includeDeleted = false,
    } = query;
    const skip = (page - 1) * limit;

    const whereClause: Prisma.UserWhereInput = {};

    if (role) {
      whereClause.role = role;
    }
    if (isActive !== undefined) {
      whereClause.isActive = isActive;
    }
    if (!includeDeleted) {
      whereClause.isActive = true;
    }
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where: whereClause,
        skip,
        take: limit,
        include: {
          parent: {
            select: { id: true, name: true, role: true },
          },
          _count: {
            select: {
              subordinates: true,
              teamsManaged: true,
              teamMemberships: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where: whereClause }),
    ]);

    const formattedUsers = users.map((user) => this.formatUserResponse(user));

    return {
      data: formattedUsers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Hard delete a user (admin only, bypasses soft delete)
   */
  async getUserById(id: number): Promise<AdminUserResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        parent: {
          select: { id: true, name: true, role: true },
        },
        _count: {
          select: {
            subordinates: true,
            teamsManaged: true,
            teamMemberships: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return this.formatUserResponse(user);
  }

  async deleteUser(
    userId: number,
    adminId: number,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        subordinates: true,
        teamsManaged: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if user has subordinates or managed teams
    if (user.subordinates.length > 0) {
      throw new BadRequestException(
        'Cannot delete user with subordinates. Please reassign them first.',
      );
    }

    if (user.teamsManaged.length > 0) {
      throw new BadRequestException(
        'Cannot delete user who manages teams. Please reassign team management first.',
      );
    }

    await this.prisma.user.delete({
      where: { id: userId },
    });

    // Create audit log
    await this.createAuditLog(
      adminId,
      {
        action: 'ADMIN_DELETE_USER',
        entity: 'User',
        entityId: userId,
        details: `Permanently deleted user ${user.name} (${user.email})`,
        metadata: {
          targetUserId: userId,
          userName: user.name,
          userEmail: user.email,
        },
      },
      ipAddress,
      userAgent,
    );

    return { message: 'User deleted successfully' };
  }

  /**
   * Bulk operations on users
   */
  async bulkUserOperation(
    operationDto: BulkUserOperationDto,
    adminId: number,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ message: string; affectedUsers: number }> {
    const { userIds, operation, newParentId, reason } = operationDto;

    if (userIds.length === 0) {
      throw new BadRequestException('No user IDs provided');
    }

    let updateData: Prisma.UserUncheckedUpdateManyInput = {};
    let actionName = '';

    switch (operation) {
      case 'activate':
        updateData = { isActive: true };
        actionName = 'ADMIN_BULK_ACTIVATE_USERS';
        break;
      case 'deactivate':
        updateData = { isActive: false };
        actionName = 'ADMIN_BULK_DEACTIVATE_USERS';
        break;
      case 'reassign': {
        if (!newParentId) {
          throw new BadRequestException(
            'New parent ID required for reassign operation',
          );
        }
        // Validate new parent exists
        const newParent = await this.prisma.user.findUnique({
          where: { id: newParentId, isActive: true },
        });
        if (!newParent) {
          throw new BadRequestException(
            'New parent user not found or inactive',
          );
        }
        updateData = { parentId: newParentId };
        actionName = 'ADMIN_BULK_REASSIGN_USERS';
        break;
      }
      default:
        throw new BadRequestException('Invalid operation');
    }

    const result = await this.prisma.user.updateMany({
      where: {
        id: { in: userIds },
      },
      data: updateData,
    });

    // Create audit log
    await this.createAuditLog(
      adminId,
      {
        action: actionName,
        entity: 'User',
        details: `Bulk ${operation} operation on ${result.count} users. Reason: ${reason}`,
        metadata: {
          userIds,
          operation,
          newParentId,
          reason,
          affectedCount: result.count,
        },
      },
      ipAddress,
      userAgent,
    );

    return {
      message: `Successfully performed ${operation} on ${result.count} users`,
      affectedUsers: result.count,
    };
  }

  // ====== TEAM MANAGEMENT (ADMIN OVERRIDE) ======

  /**
   * Create a team with admin privileges (can assign any manager)
   */
  async createTeam(
    teamDto: AdminTeamDto,
    adminId: number,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AdminTeamResponseDto> {
    // Validate manager exists
    const manager = await this.prisma.user.findUnique({
      where: { id: teamDto.managerId, isActive: true },
    });

    if (!manager) {
      throw new BadRequestException('Manager not found or inactive');
    }

    // Validate members if provided
    if (teamDto.memberIds && teamDto.memberIds.length > 0) {
      const members = await this.prisma.user.findMany({
        where: {
          id: { in: teamDto.memberIds },
          isActive: true,
        },
      });

      if (members.length !== teamDto.memberIds.length) {
        const foundIds = members.map((m) => m.id);
        const missingIds = teamDto.memberIds.filter(
          (id) => !foundIds.includes(id),
        );
        throw new BadRequestException(
          `Users not found or inactive: ${missingIds.join(', ')}`,
        );
      }
    }

    const team = await this.prisma.team.create({
      data: {
        name: teamDto.name,
        description: teamDto.description,
        managerId: teamDto.managerId,
        members: teamDto.memberIds
          ? {
              connect: teamDto.memberIds.map((id) => ({ id })),
            }
          : undefined,
      },
      include: {
        manager: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        members: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    // Create audit log
    await this.createAuditLog(
      adminId,
      {
        action: 'ADMIN_CREATE_TEAM',
        entity: 'Team',
        entityId: team.id,
        details: `Created team ${team.name} with manager ${manager.name}`,
        metadata: {
          teamId: team.id,
          managerId: teamDto.managerId,
          memberIds: teamDto.memberIds,
        },
      },
      ipAddress,
      userAgent,
    );

    return this.formatTeamResponse(team);
  }

  /**
   * Get all teams with admin privileges
   */
  async getAllTeams(
    query: AdminTeamQueryDto,
  ): Promise<PaginatedResponseDto<AdminTeamResponseDto>> {
    const { page = 1, limit = 20, search, managerId } = query;
    const skip = (page - 1) * limit;

    const whereClause: Prisma.TeamWhereInput = {};

    if (search) {
      whereClause.name = { contains: search, mode: 'insensitive' };
    }
    if (managerId) {
      whereClause.managerId = managerId;
    }

    const [teams, total] = await Promise.all([
      this.prisma.team.findMany({
        where: whereClause,
        skip,
        take: limit,
        include: {
          manager: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
          members: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.team.count({ where: whereClause }),
    ]);

    const formattedTeams = teams.map((team) => this.formatTeamResponse(team));

    return {
      data: formattedTeams,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Delete any team with admin privileges
   */
  async deleteTeam(
    teamId: number,
    adminId: number,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ message: string }> {
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
      include: {
        manager: {
          select: { name: true },
        },
      },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    await this.prisma.team.delete({
      where: { id: teamId },
    });

    // Create audit log
    await this.createAuditLog(
      adminId,
      {
        action: 'ADMIN_DELETE_TEAM',
        entity: 'Team',
        entityId: teamId,
        details: `Deleted team ${team.name} (managed by ${team.manager.name})`,
        metadata: { teamId, teamName: team.name },
      },
      ipAddress,
      userAgent,
    );

    return { message: 'Team deleted successfully' };
  }

  // ====== SYSTEM STATISTICS ======

  /**
   * Get comprehensive system statistics
   */
  async getSystemStats(): Promise<SystemStatsDto> {
    const [userStats, teamStats, messageStats, fileStats] = await Promise.all([
      this.getUserStats(),
      this.getTeamStats(),
      this.getMessageStats(),
      this.getFileStats(),
    ]);

    return {
      users: userStats,
      teams: teamStats,
      messages: messageStats,
      files: fileStats,
      system: {
        uptimeMinutes: Math.floor(process.uptime() / 60),
        lastBackup: undefined, // This would be set from your backup system
        databaseSize: undefined, // This would require custom query
      },
    };
  }

  // ====== HIERARCHY MANAGEMENT ======

  /**
   * Restructure hierarchy with admin privileges
   */
  async restructureHierarchy(
    restructureDto: HierarchyRestructureDto,
    adminId: number,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ message: string }> {
    const { userId, newParentId, reason, moveSubordinates } = restructureDto;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        subordinates: true,
        parent: {
          select: { id: true, name: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Validate new parent if provided
    if (newParentId) {
      const newParent = await this.prisma.user.findUnique({
        where: { id: newParentId, isActive: true },
      });

      if (!newParent) {
        throw new BadRequestException('New parent user not found or inactive');
      }

      // Prevent circular reference
      if (newParentId === userId) {
        throw new BadRequestException('User cannot be their own parent');
      }
    }

    // Update user's parent
    await this.prisma.user.update({
      where: { id: userId },
      data: { parentId: newParentId },
    });

    // Handle subordinates if requested
    if (moveSubordinates && user.subordinates.length > 0) {
      await this.prisma.user.updateMany({
        where: {
          parentId: userId,
        },
        data: {
          parentId: newParentId, // Move subordinates to new parent or null
        },
      });
    }

    // Create audit log
    await this.createAuditLog(
      adminId,
      {
        action: 'ADMIN_RESTRUCTURE_HIERARCHY',
        entity: 'User',
        entityId: userId,
        details: `Restructured hierarchy for ${user.name}. Reason: ${reason}`,
        metadata: {
          userId,
          oldParentId: user.parentId,
          newParentId,
          moveSubordinates,
          subordinatesCount: user.subordinates.length,
          reason,
        },
      },
      ipAddress,
      userAgent,
    );

    return { message: 'Hierarchy restructured successfully' };
  }

  // ====== ADMIN OVERRIDES ======

  /**
   * Record an admin override action
   */
  async recordAdminOverride(
    overrideDto: AdminOverrideDto,
    adminId: number,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ message: string }> {
    // Create audit log for the override
    await this.createAuditLog(
      adminId,
      {
        action: 'ADMIN_RBAC_OVERRIDE',
        entity: overrideDto.targetEntity,
        entityId: overrideDto.targetEntityId,
        details: `Admin override: ${overrideDto.overrideType}. Reason: ${overrideDto.reason}`,
        metadata: {
          overrideType: overrideDto.overrideType,
          reason: overrideDto.reason,
          targetEntity: overrideDto.targetEntity,
          targetEntityId: overrideDto.targetEntityId,
          ...(overrideDto.metadata as Record<string, unknown> | undefined),
        },
      },
      ipAddress,
      userAgent,
    );

    return { message: 'Admin override recorded successfully' };
  }

  // ====== PRIVATE HELPER METHODS ======

  private async getUserStats() {
    const [total, active, roleStats, recentlyCreated] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.user.groupBy({
        by: ['role'],
        _count: true,
      }),
      this.prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
          },
        },
      }),
    ]);

    const byRole = roleStats.reduce(
      (acc, stat) => {
        acc[stat.role] = stat._count;
        return acc;
      },
      {} as Record<Role, number>,
    );

    return {
      total,
      active,
      byRole,
      recentlyCreated,
    };
  }

  private async getTeamStats() {
    const [total, memberStats, emptyTeams] = await Promise.all([
      this.prisma.team.count(),
      this.prisma.team.findMany({
        include: {
          _count: {
            select: { members: true },
          },
        },
      }),
      this.prisma.team.count({
        where: {
          members: {
            none: {},
          },
        },
      }),
    ]);

    const totalMembers = memberStats.reduce(
      (sum, team) => sum + team._count.members,
      0,
    );
    const averageTeamSize = total > 0 ? totalMembers / total : 0;

    return {
      total,
      totalMembers,
      averageTeamSize: Math.round(averageTeamSize * 100) / 100,
      teamsWithoutMembers: emptyTeams,
    };
  }

  private async getMessageStats() {
    const [totalSent, todaysSent, topSenders] = await Promise.all([
      this.prisma.message.count(),
      this.prisma.message.count({
        where: {
          timestamp: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
      this.prisma.message.groupBy({
        by: ['senderId'],
        _count: true,
        orderBy: { _count: { senderId: 'desc' } },
        take: 5,
      }),
    ]);

    const senderIds = topSenders.map((s) => s.senderId);
    const senderUsers = await this.prisma.user.findMany({
      where: { id: { in: senderIds } },
      select: { id: true, name: true },
    });

    const topSendersWithNames = topSenders.map((sender) => {
      const user = senderUsers.find((u) => u.id === sender.senderId);
      return {
        userId: sender.senderId,
        name: user?.name || 'Unknown User',
        count: sender._count,
      };
    });

    return {
      totalSent,
      todaysSent,
      topSenders: topSendersWithNames,
    };
  }

  private async getFileStats() {
    const [totalFiles, activeFiles, sizeResult, downloadResult] =
      await Promise.all([
        this.prisma.file.count(),
        this.prisma.file.count({ where: { isActive: true } }),
        this.prisma.file.aggregate({
          _sum: { size: true },
        }),
        this.prisma.file.aggregate({
          _sum: { downloadCount: true },
        }),
      ]);

    return {
      totalFiles,
      totalSize: sizeResult._sum.size || 0,
      downloadCount: downloadResult._sum.downloadCount || 0,
      activeFiles,
    };
  }

  private formatUserResponse(
    user: User & {
      parent?: AdminUserResponseDto['parent'];
      _count?: {
        subordinates: number;
        teamsManaged: number;
        teamMemberships: number;
      };
    },
  ): AdminUserResponseDto {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      parentId: user.parentId,
      parent: user.parent,
      subordinatesCount: user._count?.subordinates || 0,
      teamsManaged: user._count?.teamsManaged || 0,
      teamMemberships: user._count?.teamMemberships || 0,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private formatTeamResponse(
    team: Team & {
      manager: AdminTeamResponseDto['manager'];
      members: AdminTeamResponseDto['members'];
    },
  ): AdminTeamResponseDto {
    return {
      id: team.id,
      name: team.name,
      description: team.description,
      managerId: team.managerId,
      manager: team.manager,
      members: team.members,
      memberCount: team.members.length,
      createdAt: team.createdAt,
      updatedAt: team.updatedAt,
    };
  }
}
