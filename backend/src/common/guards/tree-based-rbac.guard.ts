import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { Role } from '../../common/enums';
import type { HierarchyUser } from '../types';
import type { AuthenticatedRequest } from '../types';

export enum HierarchyPermission {
  SELF = 'self', // Access to own data
  DIRECT_SUBORDINATES = 'direct_subordinates', // Access to direct reports
  ALL_SUBORDINATES = 'all_subordinates', // Access to entire subtree
  DIRECT_SUPERIOR = 'direct_superior', // Access to immediate boss
  PEERS = 'peers', // Access to same-level users
  TEAM_MEMBERS = 'team_members', // Access to team members
  ALL_USERS = 'all_users', // Full access (admin only)
}

export interface RBACConfig {
  permissions: HierarchyPermission[];
  allowSelfAccess?: boolean;
  requireOwnership?: boolean;
  resourceType?: string;
}

@Injectable()
export class TreeBasedRBACGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const rbacConfig = this.reflector.getAllAndOverride<RBACConfig>('rbac', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!rbacConfig) {
      // If no RBAC config is specified, allow access (backward compatibility)
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const currentUser = request.user;

    if (!currentUser) {
      throw new ForbiddenException('Authentication required');
    }

    // Extract target user ID from various possible sources
    const targetUserId = this.extractTargetUserId(request, rbacConfig);

    // Validate access based on hierarchy permissions
    return await this.validateHierarchyAccess(
      currentUser,
      targetUserId,
      rbacConfig,
    );
  }

  private extractTargetUserId(
    request: AuthenticatedRequest,
    config: RBACConfig,
  ): number | null {
    const body = (request.body ?? {}) as {
      userId?: string | number;
      receiverId?: string | number;
    };

    // Checked in order: URL params, query string, then request body
    const candidates: Array<string | number | undefined> = [
      request.params.id,
      request.params.userId,
      request.query.userId as string | undefined,
      body.userId,
      body.receiverId,
    ];

    for (const candidate of candidates) {
      if (candidate) {
        const id = parseInt(String(candidate), 10);
        if (!isNaN(id)) return id;
      }
    }

    // If no target user is specified and self access is allowed, return current user ID
    if (config.allowSelfAccess !== false) {
      return request.user.id;
    }

    return null;
  }

  private async validateHierarchyAccess(
    currentUser: HierarchyUser,
    targetUserId: number | null,
    config: RBACConfig,
  ): Promise<boolean> {
    const { permissions } = config;

    // Admin has all access unless explicitly restricted
    if (
      currentUser.role === Role.ADMIN &&
      permissions.includes(HierarchyPermission.ALL_USERS)
    ) {
      return true;
    }

    // If no target user specified, check if general access is allowed
    if (!targetUserId) {
      return (
        permissions.includes(HierarchyPermission.ALL_USERS) &&
        currentUser.role === Role.ADMIN
      );
    }

    // Self access
    if (
      targetUserId === currentUser.id &&
      permissions.includes(HierarchyPermission.SELF)
    ) {
      return true;
    }

    // Get current user's full details
    const currentUserDetails = await this.prisma.user.findUnique({
      where: { id: currentUser.id },
      select: { id: true, role: true, parentId: true, isActive: true },
    });

    if (!currentUserDetails || !currentUserDetails.isActive) {
      throw new ForbiddenException('Current user is not active');
    }

    // Get target user's details
    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, role: true, parentId: true, isActive: true },
    });

    if (!targetUser) {
      throw new BadRequestException('Target user not found');
    }

    // Check specific permission types
    for (const permission of permissions) {
      if (
        await this.checkPermission(permission, currentUserDetails, targetUser)
      ) {
        return true;
      }
    }

    throw new ForbiddenException('Insufficient hierarchy permissions');
  }

  private async checkPermission(
    permission: HierarchyPermission,
    currentUser: HierarchyUser,
    targetUser: HierarchyUser,
  ): Promise<boolean> {
    switch (permission) {
      case HierarchyPermission.SELF:
        return currentUser.id === targetUser.id;

      case HierarchyPermission.ALL_USERS:
        return currentUser.role === Role.ADMIN;

      case HierarchyPermission.DIRECT_SUBORDINATES:
        return await this.isDirectSubordinate(currentUser.id, targetUser.id);

      case HierarchyPermission.ALL_SUBORDINATES:
        return await this.isSubordinateInTree(currentUser.id, targetUser.id);

      case HierarchyPermission.DIRECT_SUPERIOR:
        return await this.isDirectSuperior(currentUser.id, targetUser.id);

      case HierarchyPermission.PEERS:
        return this.arePeers(currentUser, targetUser);

      case HierarchyPermission.TEAM_MEMBERS:
        return await this.areTeamMembers(currentUser.id, targetUser.id);

      default:
        return false;
    }
  }

  private async isDirectSubordinate(
    managerId: number,
    subordinateId: number,
  ): Promise<boolean> {
    const subordinate = await this.prisma.user.findUnique({
      where: { id: subordinateId },
      select: { parentId: true },
    });

    return subordinate?.parentId === managerId;
  }

  private async isSubordinateInTree(
    managerId: number,
    subordinateId: number,
  ): Promise<boolean> {
    // Recursive query to check if subordinateId is anywhere in managerId's tree
    const result = await this.prisma.$queryRaw<Array<{ id: number }>>`
      WITH RECURSIVE subordinate_tree AS (
        -- Base case: direct subordinates
        SELECT id, "parentId"
        FROM "User"
        WHERE "parentId" = ${managerId}
        
        UNION ALL
        
        -- Recursive case: subordinates of subordinates
        SELECT u.id, u."parentId"
        FROM "User" u
        INNER JOIN subordinate_tree st ON u."parentId" = st.id
      )
      SELECT id
      FROM subordinate_tree
      WHERE id = ${subordinateId}
    `;

    return result.length > 0;
  }

  private async isDirectSuperior(
    subordinateId: number,
    superiorId: number,
  ): Promise<boolean> {
    const subordinate = await this.prisma.user.findUnique({
      where: { id: subordinateId },
      select: { parentId: true },
    });

    return subordinate?.parentId === superiorId;
  }

  private arePeers(user1: HierarchyUser, user2: HierarchyUser): boolean {
    // Users are peers if they have the same parent
    if (!user1.parentId || !user2.parentId) {
      // Root level users with same role are peers
      return user1.role === user2.role && !user1.parentId && !user2.parentId;
    }

    return user1.parentId === user2.parentId;
  }

  private async areTeamMembers(
    user1Id: number,
    user2Id: number,
  ): Promise<boolean> {
    // Check if users are in the same team (either managed by same person or in same team table)
    const user1Teams = await this.prisma.team.findMany({
      where: {
        OR: [{ managerId: user1Id }, { members: { some: { id: user1Id } } }],
      },
      select: { id: true },
    });

    if (user1Teams.length === 0) {
      return false;
    }

    const teamIds = user1Teams.map((team) => team.id);
    const user2InTeams = await this.prisma.team.findMany({
      where: {
        id: { in: teamIds },
        OR: [{ managerId: user2Id }, { members: { some: { id: user2Id } } }],
      },
    });

    return user2InTeams.length > 0;
  }
}
