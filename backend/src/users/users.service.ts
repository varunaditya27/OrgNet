import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateUserDto,
  UpdateUserDto,
  UserResponseDto,
  UserHierarchyDto,
  UserTeamInfoDto,
} from './dto';
import { Role } from '../common/enums';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    const { name, email, password, role = Role.EMPLOYEE, parentId, isActive = true } = createUserDto;

    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Validate parent exists if parentId is provided
    if (parentId) {
      const parent = await this.prisma.user.findUnique({
        where: { id: parentId },
      });

      if (!parent) {
        throw new BadRequestException('Parent user not found');
      }

      // Validate hierarchy rules
      if (role === Role.ADMIN && parent) {
        throw new BadRequestException('Admin users cannot have a parent');
      }

      // Validate that parent can supervise this role
      await this.validateHierarchyRules(parent.role, role);
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role as any,
        parentId,
        isActive,
      },
    });

    return this.mapToUserResponse(user);
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
    role?: Role,
    isActive?: boolean,
  ): Promise<{ users: UserResponseDto[]; total: number; page: number; limit: number }> {
    const skip = (page - 1) * limit;
    
    const where: any = {};
    if (role) where.role = role;
    if (isActive !== undefined) where.isActive = isActive;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      users: users.map(user => this.mapToUserResponse(user)),
      total,
      page,
      limit,
    };
  }

  async findOne(id: number): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return this.mapToUserResponse(user);
  }

  async findByEmail(email: string): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new NotFoundException(`User with email ${email} not found`);
    }

    return this.mapToUserResponse(user);
  }

  async update(id: number, updateUserDto: UpdateUserDto, requestingUserId: number): Promise<UserResponseDto> {
    const existingUser = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    const requestingUser = await this.prisma.user.findUnique({
      where: { id: requestingUserId },
    });

    if (!requestingUser) {
      throw new NotFoundException('Requesting user not found');
    }

    // Check if requesting user has permission to update this user
    await this.validateUpdatePermission(requestingUser, existingUser);

    // Validate email uniqueness if email is being updated
    if (updateUserDto.email && updateUserDto.email !== existingUser.email) {
      const emailExists = await this.prisma.user.findUnique({
        where: { email: updateUserDto.email },
      });

      if (emailExists) {
        throw new ConflictException('User with this email already exists');
      }
    }

    // Validate parent if parentId is being updated
    if (updateUserDto.parentId !== undefined) {
      if (updateUserDto.parentId === null) {
        // Removing parent is allowed
      } else {
        const parent = await this.prisma.user.findUnique({
          where: { id: updateUserDto.parentId },
        });

        if (!parent) {
          throw new BadRequestException('Parent user not found');
        }

        // Prevent circular references
        if (updateUserDto.parentId === id) {
          throw new BadRequestException('User cannot be their own parent');
        }

        // Check if the new parent would create a circular reference
        const wouldCreateCircle = await this.checkCircularReference(id, updateUserDto.parentId);
        if (wouldCreateCircle) {
          throw new BadRequestException('This parent assignment would create a circular reference');
        }

        // Validate hierarchy rules if role is being updated too
        const newRole = updateUserDto.role || existingUser.role;
        await this.validateHierarchyRules(parent.role, newRole as Role);
      }
    }

    // Update user
    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: updateUserDto,
    });

    return this.mapToUserResponse(updatedUser);
  }

  async remove(id: number, requestingUserId: number): Promise<{ message: string }> {
    const existingUser = await this.prisma.user.findUnique({
      where: { id },
      include: { subordinates: true },
    });

    if (!existingUser) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    const requestingUser = await this.prisma.user.findUnique({
      where: { id: requestingUserId },
    });

    if (!requestingUser) {
      throw new NotFoundException('Requesting user not found');
    }

    // Check permissions
    if (requestingUser.role !== Role.ADMIN && requestingUser.id !== id) {
      throw new ForbiddenException('You can only delete your own account or be an admin');
    }

    // Don't allow deletion if user has subordinates
    if (existingUser.subordinates.length > 0) {
      throw new BadRequestException('Cannot delete user with subordinates. Please reassign subordinates first.');
    }

    // Soft delete by setting isActive to false instead of hard delete
    await this.prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    return { message: 'User successfully deactivated' };
  }

  async getHierarchy(id: number): Promise<UserHierarchyDto> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        parent: true,
        subordinates: {
          where: { isActive: true },
          orderBy: { name: 'asc' },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return {
      ...this.mapToUserResponse(user),
      parent: user.parent ? this.mapToUserResponse(user.parent) : null,
      subordinates: user.subordinates.map(sub => this.mapToUserResponse(sub)),
    };
  }

  async getSuperior(id: number): Promise<UserResponseDto | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { parent: true },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user.parent ? this.mapToUserResponse(user.parent) : null;
  }

  async getSubordinates(id: number): Promise<UserResponseDto[]> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        subordinates: {
          where: { isActive: true },
          orderBy: { name: 'asc' },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user.subordinates.map(sub => this.mapToUserResponse(sub));
  }

  async getTeamInfo(id: number): Promise<UserTeamInfoDto> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        teamsManaged: {
          select: { id: true, name: true, createdAt: true },
        },
        teamMemberships: {
          select: { id: true, name: true, managerId: true, createdAt: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return {
      teamsManaged: user.teamsManaged,
      teamMemberships: user.teamMemberships,
    };
  }

  async changePassword(id: number, oldPassword: string, newPassword: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Verify old password
    const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password);
    if (!isOldPasswordValid) {
      throw new BadRequestException('Old password is incorrect');
    }

    // Hash new password
    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await this.prisma.user.update({
      where: { id },
      data: { password: hashedNewPassword },
    });

    return { message: 'Password successfully changed' };
  }

  // Helper methods
  private async validateHierarchyRules(parentRole: string, childRole: Role): Promise<void> {
    // Define valid parent-child role relationships
    const validRelationships: Record<Role, Role[]> = {
      [Role.ADMIN]: [Role.MANAGER, Role.EMPLOYEE, Role.INTERN],
      [Role.MANAGER]: [Role.EMPLOYEE, Role.INTERN],
      [Role.EMPLOYEE]: [Role.INTERN],
      [Role.INTERN]: [],
    };

    if (!validRelationships[parentRole as Role]?.includes(childRole)) {
      throw new BadRequestException(
        `Invalid hierarchy: ${parentRole} cannot supervise ${childRole}`
      );
    }
  }

  private async validateUpdatePermission(requestingUser: any, targetUser: any): Promise<void> {
    // Admin can update anyone
    if (requestingUser.role === Role.ADMIN) {
      return;
    }

    // Users can update themselves (limited fields)
    if (requestingUser.id === targetUser.id) {
      return;
    }

    // Managers can update their direct subordinates
    if (requestingUser.role === Role.MANAGER && targetUser.parentId === requestingUser.id) {
      return;
    }

    throw new ForbiddenException('You do not have permission to update this user');
  }

  private async checkCircularReference(userId: number, newParentId: number): Promise<boolean> {
    let currentId: number | null = newParentId;
    const visited = new Set<number>();

    while (currentId && !visited.has(currentId)) {
      if (currentId === userId) {
        return true; // Circular reference found
      }

      visited.add(currentId);
      
      const parent = await this.prisma.user.findUnique({
        where: { id: currentId },
        select: { parentId: true },
      });

      currentId = parent?.parentId || null;
    }

    return false;
  }

  /**
   * Get users that the current user can message based on RBAC rules
   * - ADMIN: Can message anyone
   * - MANAGER: Can message subordinates, immediate superior, and peers (same parent)
   * - EMPLOYEE: Can message immediate superior and peers (same parent)
   * - INTERN: Can message immediate superior and peers (same parent)
   */
  async getMessageableUsers(currentUserId: number): Promise<UserResponseDto[]> {
    const currentUser = await this.prisma.user.findUnique({
      where: { id: currentUserId },
      select: {
        id: true,
        role: true,
        parentId: true,
      },
    });

    if (!currentUser) {
      throw new NotFoundException('Current user not found');
    }

    let messageableUserIds: number[] = [];

    if (currentUser.role === Role.ADMIN) {
      // Admins can message everyone
      const allUsers = await this.prisma.user.findMany({
        where: {
          id: { not: currentUserId },
          isActive: true,
        },
        select: { id: true },
      });
      messageableUserIds = allUsers.map(u => u.id);
    } else if (currentUser.role === Role.MANAGER) {
      // Managers can message:
      // 1. All subordinates (direct and indirect)
      const subordinates = await this.prisma.$queryRaw<{ id: number }[]>`
        WITH RECURSIVE subordinate_tree AS (
          SELECT id, "parentId" FROM "User" WHERE "parentId" = ${currentUserId}
          UNION ALL
          SELECT u.id, u."parentId"
          FROM "User" u
          INNER JOIN subordinate_tree st ON u."parentId" = st.id
        )
        SELECT id FROM subordinate_tree
      `;
      
      // 2. Immediate superior
      if (currentUser.parentId) {
        messageableUserIds.push(currentUser.parentId);
      }
      
      // 3. Peers (same parent)
      if (currentUser.parentId) {
        const peers = await this.prisma.user.findMany({
          where: {
            parentId: currentUser.parentId,
            id: { not: currentUserId },
            isActive: true,
          },
          select: { id: true },
        });
        messageableUserIds.push(...peers.map(p => p.id));
      }
      
      messageableUserIds.push(...subordinates.map(s => s.id));
    } else {
      // EMPLOYEE and INTERN can message:
      // 1. Immediate superior
      if (currentUser.parentId) {
        messageableUserIds.push(currentUser.parentId);
      }
      
      // 2. Peers (same parent)
      if (currentUser.parentId) {
        const peers = await this.prisma.user.findMany({
          where: {
            parentId: currentUser.parentId,
            id: { not: currentUserId },
            isActive: true,
          },
          select: { id: true },
        });
        messageableUserIds.push(...peers.map(p => p.id));
      }
    }

    // Remove duplicates and fetch full user details
    const uniqueUserIds = [...new Set(messageableUserIds)];
    
    if (uniqueUserIds.length === 0) {
      return [];
    }

    const users = await this.prisma.user.findMany({
      where: {
        id: { in: uniqueUserIds },
        isActive: true,
      },
      orderBy: [
        { role: 'asc' },
        { name: 'asc' },
      ],
    });

    return users.map(user => this.mapToUserResponse(user));
  }

  private mapToUserResponse(user: any): UserResponseDto {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role as Role,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      parentId: user.parentId,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}