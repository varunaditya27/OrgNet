import { Injectable, CanActivate, ExecutionContext, ForbiddenException, BadRequestException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { Role } from '../../common/enums';

export enum ResourcePermission {
  OWNER = 'owner',                    // Must be the resource owner
  HIERARCHY_ACCESS = 'hierarchy',     // Based on organizational hierarchy
  SAME_TEAM = 'same_team',           // Must be in the same team
  READ_ONLY = 'read_only',           // Read access only
  ADMIN_OVERRIDE = 'admin_override',  // Admin can always access
}

export interface ResourceConfig {
  resource: string;                   // Resource name (e.g., 'user', 'message', 'group')
  permissions: ResourcePermission[];
  ownerField?: string;               // Field that contains owner ID (default: 'userId' or 'senderId')
  idSource?: 'params' | 'body' | 'query'; // Where to find the resource ID
  idField?: string;                  // Field name for resource ID (default: 'id')
}

@Injectable()
export class ResourceAccessGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const resourceConfig = this.reflector.getAllAndOverride<ResourceConfig>('resource', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!resourceConfig) {
      // If no resource config is specified, allow access
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const currentUser = request.user;

    if (!currentUser) {
      throw new ForbiddenException('Authentication required');
    }

    // Admin override if specified
    if (resourceConfig.permissions.includes(ResourcePermission.ADMIN_OVERRIDE) && 
        currentUser.role === Role.ADMIN) {
      return true;
    }

    const resourceId = this.extractResourceId(request, resourceConfig);
    if (!resourceId) {
      throw new BadRequestException('Resource ID not found');
    }

    return await this.validateResourceAccess(currentUser, resourceId, resourceConfig);
  }

  private extractResourceId(request: any, config: ResourceConfig): number | null {
    const { idSource = 'params', idField = 'id' } = config;
    let source: any;

    switch (idSource) {
      case 'params':
        source = request.params;
        break;
      case 'body':
        source = request.body;
        break;
      case 'query':
        source = request.query;
        break;
      default:
        source = request.params;
    }

    const id = source?.[idField];
    return id ? parseInt(id, 10) : null;
  }

  private async validateResourceAccess(
    currentUser: any,
    resourceId: number,
    config: ResourceConfig,
  ): Promise<boolean> {
    const { resource, permissions, ownerField } = config;

    // Get resource data
    const resourceData = await this.getResourceData(resource, resourceId);
    if (!resourceData) {
      throw new BadRequestException(`${resource} not found`);
    }

    // Check each permission type
    for (const permission of permissions) {
      if (await this.checkResourcePermission(permission, currentUser, resourceData, ownerField)) {
        return true;
      }
    }

    throw new ForbiddenException(`Insufficient permissions to access ${resource}`);
  }

  private async getResourceData(resource: string, resourceId: number): Promise<any> {
    const resourceMap: Record<string, any> = {
      user: () => this.prisma.user.findUnique({
        where: { id: resourceId },
        select: { id: true, parentId: true, role: true, isActive: true },
      }),
      message: () => this.prisma.message.findUnique({
        where: { id: resourceId },
        select: { id: true, senderId: true, receiverId: true, groupId: true },
      }),
      group: () => this.prisma.group.findUnique({
        where: { id: resourceId },
        include: {
          members: { select: { id: true, role: true, parentId: true } },
        },
      }),
      team: () => this.prisma.team.findUnique({
        where: { id: resourceId },
        include: {
          manager: { select: { id: true, role: true, parentId: true } },
          members: { select: { id: true, role: true, parentId: true } },
        },
      }),
    };

    const fetcher = resourceMap[resource.toLowerCase()];
    if (!fetcher) {
      throw new BadRequestException(`Unknown resource type: ${resource}`);
    }

    return await fetcher();
  }

  private async checkResourcePermission(
    permission: ResourcePermission,
    currentUser: any,
    resourceData: any,
    ownerField?: string,
  ): Promise<boolean> {
    switch (permission) {
      case ResourcePermission.OWNER:
        return this.checkOwnership(currentUser, resourceData, ownerField);

      case ResourcePermission.HIERARCHY_ACCESS:
        return await this.checkHierarchyAccess(currentUser, resourceData);

      case ResourcePermission.SAME_TEAM:
        return await this.checkSameTeam(currentUser, resourceData);

      case ResourcePermission.READ_ONLY:
        // Read-only access - can be combined with other permissions
        return true;

      case ResourcePermission.ADMIN_OVERRIDE:
        return currentUser.role === Role.ADMIN;

      default:
        return false;
    }
  }

  private checkOwnership(currentUser: any, resourceData: any, ownerField?: string): boolean {
    const possibleOwnerFields = [
      ownerField,
      'userId',
      'senderId',
      'managerId',
      'ownerId',
      'createdBy',
    ].filter(Boolean);

    for (const field of possibleOwnerFields) {
      if (field && resourceData[field] === currentUser.id) {
        return true;
      }
    }

    // Check if current user is the resource itself (for user resources)
    if (resourceData.id === currentUser.id) {
      return true;
    }

    return false;
  }

  private async checkHierarchyAccess(currentUser: any, resourceData: any): Promise<boolean> {
    // Get current user details
    const currentUserDetails = await this.prisma.user.findUnique({
      where: { id: currentUser.id },
      select: { id: true, role: true, parentId: true },
    });

    if (!currentUserDetails) {
      return false;
    }

    // Admin has full access
    if (currentUserDetails.role === Role.ADMIN) {
      return true;
    }

    // For user resources
    if (resourceData.parentId !== undefined) {
      // Manager can access direct subordinates
      if (currentUserDetails.role === Role.MANAGER && resourceData.parentId === currentUser.id) {
        return true;
      }

      // Employee can access their superior
      if (currentUserDetails.parentId === resourceData.id) {
        return true;
      }

      // Peers (same parent) can access each other
      if (currentUserDetails.parentId && resourceData.parentId === currentUserDetails.parentId) {
        return true;
      }
    }

    // For other resources, check if user has access to the owner/sender
    if (resourceData.senderId || resourceData.userId || resourceData.managerId) {
      const resourceOwnerId = resourceData.senderId || resourceData.userId || resourceData.managerId;
      const resourceOwner = await this.prisma.user.findUnique({
        where: { id: resourceOwnerId },
        select: { id: true, role: true, parentId: true },
      });

      if (resourceOwner) {
        return await this.canAccessUser(currentUserDetails, resourceOwner);
      }
    }

    return false;
  }

  private async checkSameTeam(currentUser: any, resourceData: any): Promise<boolean> {
    // Get user's teams
    const userTeams = await this.prisma.team.findMany({
      where: {
        OR: [
          { managerId: currentUser.id },
          { members: { some: { id: currentUser.id } } },
        ],
      },
      select: { id: true },
    });

    if (userTeams.length === 0) {
      return false;
    }

    const teamIds = userTeams.map(team => team.id);

    // For team resources
    if (resourceData.members) {
      return teamIds.includes(resourceData.id);
    }

    // For user resources, check if the user is in same teams
    if (resourceData.id) {
      const resourceUserTeams = await this.prisma.team.findMany({
        where: {
          id: { in: teamIds },
          OR: [
            { managerId: resourceData.id },
            { members: { some: { id: resourceData.id } } },
          ],
        },
      });

      return resourceUserTeams.length > 0;
    }

    // For other resources, check resource owner's team membership
    const resourceOwnerId = resourceData.senderId || resourceData.userId || resourceData.managerId;
    if (resourceOwnerId) {
      const resourceOwnerTeams = await this.prisma.team.findMany({
        where: {
          id: { in: teamIds },
          OR: [
            { managerId: resourceOwnerId },
            { members: { some: { id: resourceOwnerId } } },
          ],
        },
      });

      return resourceOwnerTeams.length > 0;
    }

    return false;
  }

  private async canAccessUser(currentUser: any, targetUser: any): Promise<boolean> {
    // Same user
    if (currentUser.id === targetUser.id) {
      return true;
    }

    // Admin can access anyone
    if (currentUser.role === Role.ADMIN) {
      return true;
    }

    // Manager can access direct subordinates
    if (currentUser.role === Role.MANAGER && targetUser.parentId === currentUser.id) {
      return true;
    }

    // Employee can access immediate superior
    if (currentUser.parentId === targetUser.id) {
      return true;
    }

    // Peers (same parent) can access each other
    if (currentUser.parentId && targetUser.parentId === currentUser.parentId) {
      return true;
    }

    return false;
  }
}