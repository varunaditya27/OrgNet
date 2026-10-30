import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Role } from '../../common/enums';
import type { HierarchyUser } from '../types';
import type { AuthenticatedRequest } from '../types';

type IdLike = string | number;

interface CommunicationInput {
  receiverId?: IdLike;
  groupId?: IdLike;
  memberIds?: IdLike[];
}

const toInt = (value: IdLike): number => parseInt(String(value), 10);

@Injectable()
export class CommunicationGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const currentUser = request.user;

    if (!currentUser) {
      throw new ForbiddenException('Authentication required');
    }

    // Extract communication parameters based on the endpoint
    const communicationContext = this.extractCommunicationContext(request);

    return await this.validateCommunicationPermission(
      currentUser,
      communicationContext,
    );
  }

  private extractCommunicationContext(request: AuthenticatedRequest): {
    type: 'direct' | 'group' | 'group_management';
    targetUserId?: number;
    groupId?: number;
    memberIds?: number[];
  } {
    const body = (request.body ?? {}) as CommunicationInput;
    const params = request.params as { groupId?: string };
    const query = request.query as { groupId?: string };

    // Direct message
    if (body.receiverId) {
      return {
        type: 'direct',
        targetUserId: toInt(body.receiverId),
      };
    }

    // Group message
    if (body.groupId || params.groupId || query.groupId) {
      const groupId = toInt(body.groupId || params.groupId || query.groupId!);
      return {
        type: 'group',
        groupId,
      };
    }

    // Group management (adding/removing members, or creating a group when there is no groupId)
    if (body.memberIds && Array.isArray(body.memberIds)) {
      return {
        type: 'group_management',
        groupId: params.groupId ? toInt(params.groupId) : undefined,
        memberIds: body.memberIds.map(toInt),
      };
    }

    throw new BadRequestException('Unable to determine communication context');
  }

  private async validateCommunicationPermission(
    currentUser: HierarchyUser,
    context: {
      type: string;
      targetUserId?: number;
      groupId?: number;
      memberIds?: number[];
    },
  ): Promise<boolean> {
    const currentUserDetails = await this.prisma.user.findUnique({
      where: { id: currentUser.id },
      select: { id: true, role: true, parentId: true, isActive: true },
    });

    if (!currentUserDetails || !currentUserDetails.isActive) {
      throw new ForbiddenException('Current user is not active');
    }

    switch (context.type) {
      case 'direct':
        return await this.validateDirectCommunication(
          currentUserDetails,
          context.targetUserId!,
        );

      case 'group':
        return await this.validateGroupCommunication(
          currentUserDetails,
          context.groupId!,
        );

      case 'group_management':
        return await this.validateGroupManagement(
          currentUserDetails,
          context.groupId,
          context.memberIds!,
        );

      default:
        return false;
    }
  }

  private async validateDirectCommunication(
    currentUser: HierarchyUser,
    targetUserId: number,
  ): Promise<boolean> {
    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, role: true, parentId: true, isActive: true },
    });

    if (!targetUser || !targetUser.isActive) {
      throw new BadRequestException('Target user not found or inactive');
    }

    return await this.canCommunicateWith(currentUser, targetUser);
  }

  private async validateGroupCommunication(
    currentUser: HierarchyUser,
    groupId: number,
  ): Promise<boolean> {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      include: {
        members: {
          select: { id: true, role: true, parentId: true, isActive: true },
        },
      },
    });

    if (!group) {
      throw new BadRequestException('Group not found');
    }

    // Check if user is a member of the group
    const isMember = group.members.some(
      (member) => member.id === currentUser.id,
    );
    if (!isMember) {
      throw new ForbiddenException('You are not a member of this group');
    }

    // Validate that user can communicate with all group members
    for (const member of group.members) {
      if (
        member.id !== currentUser.id &&
        !(await this.canCommunicateWith(currentUser, member))
      ) {
        throw new ForbiddenException(
          'You cannot communicate with all members of this group',
        );
      }
    }

    return true;
  }

  private async validateGroupManagement(
    currentUser: HierarchyUser,
    groupId: number | undefined,
    memberIds: number[],
  ): Promise<boolean> {
    // For group creation
    if (!groupId) {
      return await this.validateGroupCreation(currentUser, memberIds);
    }

    // For adding/removing members
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      include: {
        members: {
          select: { id: true, role: true, parentId: true, isActive: true },
        },
      },
    });

    if (!group) {
      throw new BadRequestException('Group not found');
    }

    const isMember = group.members.some(
      (member) => member.id === currentUser.id,
    );
    if (!isMember && currentUser.role !== Role.ADMIN) {
      throw new ForbiddenException(
        'You must be a group member or admin to manage group membership',
      );
    }

    // Validate communication with new members
    const newMembers = await this.prisma.user.findMany({
      where: { id: { in: memberIds } },
      select: { id: true, role: true, parentId: true, isActive: true },
    });

    for (const member of newMembers) {
      if (!(await this.canCommunicateWith(currentUser, member))) {
        throw new ForbiddenException(
          `You cannot add user ${member.id} to the group - insufficient permissions`,
        );
      }
    }

    return true;
  }

  private async validateGroupCreation(
    currentUser: HierarchyUser,
    memberIds: number[],
  ): Promise<boolean> {
    const members = await this.prisma.user.findMany({
      where: { id: { in: memberIds } },
      select: { id: true, role: true, parentId: true, isActive: true },
    });

    if (members.length !== memberIds.length) {
      throw new BadRequestException('Some members were not found');
    }

    // Validate that user can communicate with all proposed members
    for (const member of members) {
      if (
        member.id !== currentUser.id &&
        !(await this.canCommunicateWith(currentUser, member))
      ) {
        throw new ForbiddenException(
          `You cannot create a group with user ${member.id} - insufficient permissions`,
        );
      }
    }

    return true;
  }

  /**
   * Core communication permission logic based on OrgNet hierarchy rules
   */
  private async canCommunicateWith(
    user1: HierarchyUser,
    user2: HierarchyUser,
  ): Promise<boolean> {
    // Same user can always communicate with themselves
    if (user1.id === user2.id) {
      return true;
    }

    // Admin can communicate with anyone
    if (user1.role === Role.ADMIN || user2.role === Role.ADMIN) {
      return true;
    }

    // Manager can communicate with direct subordinates
    if (user1.role === Role.MANAGER && user2.parentId === user1.id) {
      return true;
    }
    if (user2.role === Role.MANAGER && user1.parentId === user2.id) {
      return true;
    }

    // Employee can communicate with immediate superior
    if (user1.parentId === user2.id || user2.parentId === user1.id) {
      return true;
    }

    // Peers (same parent) can communicate with each other
    if (user1.parentId && user2.parentId && user1.parentId === user2.parentId) {
      return true;
    }

    // Users with same role at root level (no parent) can communicate
    if (!user1.parentId && !user2.parentId && user1.role === user2.role) {
      return true;
    }

    // Special case: Managers can communicate with other managers in their hierarchy
    if (user1.role === Role.MANAGER && user2.role === Role.MANAGER) {
      return await this.areInSameHierarchyBranch(user1.id, user2.id);
    }

    return false;
  }

  private async areInSameHierarchyBranch(
    user1Id: number,
    user2Id: number,
  ): Promise<boolean> {
    // Check if two managers are in the same hierarchy branch (have common ancestor)
    const result = await this.prisma.$queryRaw<Array<{ count: number }>>`
      WITH RECURSIVE user1_ancestors AS (
        SELECT id, "parentId", 0 as level
        FROM "User"
        WHERE id = ${user1Id}
        
        UNION ALL
        
        SELECT u.id, u."parentId", ua.level + 1
        FROM "User" u
        INNER JOIN user1_ancestors ua ON u.id = ua."parentId"
        WHERE ua."parentId" IS NOT NULL
      ),
      user2_ancestors AS (
        SELECT id, "parentId", 0 as level
        FROM "User"
        WHERE id = ${user2Id}
        
        UNION ALL
        
        SELECT u.id, u."parentId", ua.level + 1
        FROM "User" u
        INNER JOIN user2_ancestors ua ON u.id = ua."parentId"
        WHERE ua."parentId" IS NOT NULL
      )
      SELECT COUNT(*) as count
      FROM user1_ancestors u1
      INNER JOIN user2_ancestors u2 ON u1.id = u2.id
    `;

    return result[0]?.count > 0;
  }
}
