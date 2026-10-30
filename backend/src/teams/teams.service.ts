import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '../common/enums';
import {
  CreateTeamDto,
  UpdateTeamDto,
  AddMembersDto,
  RemoveMembersDto,
  TeamResponseDto,
  TeamListResponseDto,
  PaginatedTeamsResponseDto,
  TeamQueryDto,
  UserResponseDto,
} from './dto';
import type { Prisma, Team } from '@prisma/client';

@Injectable()
export class TeamsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new team (Manager/Admin only)
   * Only managers can create teams, and they become the team manager
   */
  async create(
    createTeamDto: CreateTeamDto,
    managerId: number,
  ): Promise<TeamResponseDto> {
    // Verify the user is a manager or admin
    const manager = await this.prisma.user.findUnique({
      where: { id: managerId, isActive: true },
    });

    if (!manager) {
      throw new NotFoundException('Manager not found');
    }

    if (manager.role !== Role.MANAGER && manager.role !== Role.ADMIN) {
      throw new ForbiddenException('Only managers and admins can create teams');
    }

    // Check if team name already exists for this manager
    const existingTeam = await this.prisma.team.findFirst({
      where: {
        name: createTeamDto.name,
        managerId: managerId,
      },
    });

    if (existingTeam) {
      throw new ConflictException('Team with this name already exists');
    }

    // Validate member IDs if provided
    if (createTeamDto.memberIds && createTeamDto.memberIds.length > 0) {
      await this.validateMembers(
        createTeamDto.memberIds,
        managerId,
        manager.role as Role,
      );
    }

    // Create the team
    const team = await this.prisma.team.create({
      data: {
        name: createTeamDto.name,
        managerId: managerId,
        members: createTeamDto.memberIds
          ? {
              connect: createTeamDto.memberIds.map((id) => ({ id })),
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
            isActive: true,
            createdAt: true,
          },
        },
        members: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
            createdAt: true,
          },
        },
      },
    });

    return this.formatTeamResponse(team);
  }

  /**
   * Get all teams (Admin gets all, Managers get their own teams)
   */
  async findAll(
    userId: number,
    query: TeamQueryDto,
  ): Promise<PaginatedTeamsResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const { page = 1, limit = 10, search } = query;
    const skip = (page - 1) * limit;

    const whereClause: Prisma.TeamWhereInput = {};

    // Role-based filtering
    if (user.role === Role.ADMIN) {
      // Admins can see all teams
      if (search) {
        whereClause.name = { contains: search, mode: 'insensitive' };
      }
    } else if (user.role === Role.MANAGER) {
      // Managers see only their own teams
      whereClause.managerId = userId;
      if (search) {
        whereClause.name = { contains: search, mode: 'insensitive' };
      }
    } else {
      // Employees/Interns see teams they are members of
      whereClause.members = { some: { id: userId } };
      if (search) {
        whereClause.name = { contains: search, mode: 'insensitive' };
      }
    }

    const [teams, total] = await Promise.all([
      this.prisma.team.findMany({
        where: whereClause,
        skip,
        take: limit,
        include: {
          manager: {
            select: { id: true, name: true, email: true },
          },
          _count: {
            select: { members: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.team.count({ where: whereClause }),
    ]);

    const formattedTeams: TeamListResponseDto[] = teams.map((team) => ({
      id: team.id,
      name: team.name,
      description: team.description || undefined,
      managerId: team.managerId,
      manager: team.manager,
      memberCount: team._count.members,
      createdAt: team.createdAt,
      updatedAt: team.updatedAt,
    }));

    return {
      teams: formattedTeams,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a specific team by ID with RBAC enforcement
   */
  async findOne(teamId: number, userId: number): Promise<TeamResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
      include: {
        manager: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
            createdAt: true,
          },
        },
        members: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
            createdAt: true,
          },
        },
      },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    // RBAC: Check if user can access this team
    const canAccess =
      user.role === Role.ADMIN || // Admins can see all teams
      team.managerId === userId || // Manager can see their team
      team.members.some((member) => member.id === userId); // Members can see their team

    if (!canAccess) {
      throw new ForbiddenException(
        'You do not have permission to view this team',
      );
    }

    return this.formatTeamResponse(team);
  }

  /**
   * Update team information (Manager/Admin only)
   */
  async update(
    teamId: number,
    updateTeamDto: UpdateTeamDto,
    userId: number,
  ): Promise<TeamResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    // RBAC: Only the team manager or admin can update
    if (user.role !== Role.ADMIN && team.managerId !== userId) {
      throw new ForbiddenException(
        'Only the team manager or admin can update team information',
      );
    }

    // Check for name conflicts if name is being updated
    if (updateTeamDto.name && updateTeamDto.name !== team.name) {
      const existingTeam = await this.prisma.team.findFirst({
        where: {
          name: updateTeamDto.name,
          managerId: team.managerId,
          id: { not: teamId },
        },
      });

      if (existingTeam) {
        throw new ConflictException('Team with this name already exists');
      }
    }

    const updatedTeam = await this.prisma.team.update({
      where: { id: teamId },
      data: updateTeamDto,
      include: {
        manager: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
            createdAt: true,
          },
        },
        members: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
            createdAt: true,
          },
        },
      },
    });

    return this.formatTeamResponse(updatedTeam);
  }

  /**
   * Add members to a team (Manager/Admin only)
   */
  async addMembers(
    teamId: number,
    addMembersDto: AddMembersDto,
    userId: number,
  ): Promise<TeamResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
      include: { members: { select: { id: true } } },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    // RBAC: Only the team manager or admin can add members
    if (user.role !== Role.ADMIN && team.managerId !== userId) {
      throw new ForbiddenException(
        'Only the team manager or admin can add members',
      );
    }

    // Validate new members
    await this.validateMembers(
      addMembersDto.memberIds,
      team.managerId,
      user.role,
    );

    // Check for existing members
    const existingMemberIds = team.members.map((m) => m.id);
    const newMemberIds = addMembersDto.memberIds.filter(
      (id) => !existingMemberIds.includes(id),
    );

    if (newMemberIds.length === 0) {
      throw new BadRequestException(
        'All specified users are already team members',
      );
    }

    const updatedTeam = await this.prisma.team.update({
      where: { id: teamId },
      data: {
        members: {
          connect: newMemberIds.map((id) => ({ id })),
        },
      },
      include: {
        manager: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
            createdAt: true,
          },
        },
        members: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
            createdAt: true,
          },
        },
      },
    });

    return this.formatTeamResponse(updatedTeam);
  }

  /**
   * Remove members from a team (Manager/Admin only)
   */
  async removeMembers(
    teamId: number,
    removeMembersDto: RemoveMembersDto,
    userId: number,
  ): Promise<TeamResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
      include: { members: { select: { id: true } } },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    // RBAC: Only the team manager or admin can remove members
    if (user.role !== Role.ADMIN && team.managerId !== userId) {
      throw new ForbiddenException(
        'Only the team manager or admin can remove members',
      );
    }

    // Check if members exist in the team
    const existingMemberIds = team.members.map((m) => m.id);
    const membersToRemove = removeMembersDto.memberIds.filter((id) =>
      existingMemberIds.includes(id),
    );

    if (membersToRemove.length === 0) {
      throw new BadRequestException(
        'None of the specified users are team members',
      );
    }

    const updatedTeam = await this.prisma.team.update({
      where: { id: teamId },
      data: {
        members: {
          disconnect: membersToRemove.map((id) => ({ id })),
        },
      },
      include: {
        manager: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
            createdAt: true,
          },
        },
        members: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
            createdAt: true,
          },
        },
      },
    });

    return this.formatTeamResponse(updatedTeam);
  }

  /**
   * Delete a team (Manager/Admin only)
   */
  async remove(teamId: number, userId: number): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    // RBAC: Only the team manager or admin can delete
    if (user.role !== Role.ADMIN && team.managerId !== userId) {
      throw new ForbiddenException(
        'Only the team manager or admin can delete the team',
      );
    }

    await this.prisma.team.delete({
      where: { id: teamId },
    });

    return { message: 'Team deleted successfully' };
  }

  /**
   * Get teams managed by a specific manager
   */
  async getTeamsByManager(managerId: number): Promise<TeamListResponseDto[]> {
    const teams = await this.prisma.team.findMany({
      where: { managerId },
      include: {
        manager: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: { members: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return teams.map((team) => ({
      id: team.id,
      name: team.name,
      description: team.description || undefined,
      managerId: team.managerId,
      manager: team.manager,
      memberCount: team._count.members,
      createdAt: team.createdAt,
      updatedAt: team.updatedAt,
    }));
  }

  // Private helper methods
  private async validateMembers(
    memberIds: number[],
    managerId: number,
    managerRole: Role,
  ): Promise<void> {
    if (memberIds.length === 0) return;

    // Check if all member IDs exist and are active
    const members = await this.prisma.user.findMany({
      where: {
        id: { in: memberIds },
        isActive: true,
      },
    });

    if (members.length !== memberIds.length) {
      const foundIds = members.map((m) => m.id);
      const missingIds = memberIds.filter((id) => !foundIds.includes(id));
      throw new BadRequestException(
        `Users not found or inactive: ${missingIds.join(', ')}`,
      );
    }

    // RBAC: For managers, ensure they can only add their subordinates
    if (managerRole === Role.MANAGER) {
      // Get all subordinates of the manager (recursively)
      const subordinates = await this.getAllSubordinates(managerId);
      const subordinateIds = subordinates.map((s) => s.id);

      const invalidMembers = memberIds.filter(
        (id) => !subordinateIds.includes(id) && id !== managerId,
      );
      if (invalidMembers.length > 0) {
        throw new ForbiddenException(
          'Managers can only add their subordinates to teams',
        );
      }
    }

    // Admins can add anyone, so no additional validation needed
  }

  private async getAllSubordinates(
    userId: number,
  ): Promise<Array<{ id: number }>> {
    // Recursive query to get all subordinates
    const subordinates = await this.prisma.$queryRaw<Array<{ id: number }>>`
      WITH RECURSIVE subordinate_tree AS (
        SELECT id, "parentId" FROM "User" WHERE "parentId" = ${userId}
        UNION ALL
        SELECT u.id, u."parentId" 
        FROM "User" u
        INNER JOIN subordinate_tree st ON u."parentId" = st.id
      )
      SELECT id FROM subordinate_tree
    `;

    return subordinates;
  }

  private formatTeamResponse(
    team: Team & { manager: object; members: object[] },
  ): TeamResponseDto {
    return {
      id: team.id,
      name: team.name,
      description: team.description || undefined,
      managerId: team.managerId,
      manager: team.manager as UserResponseDto,
      members: team.members as UserResponseDto[],
      memberCount: team.members.length,
      createdAt: team.createdAt,
      updatedAt: team.updatedAt,
    };
  }
}
