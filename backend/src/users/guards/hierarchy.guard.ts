import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Role } from '../../common/enums';
import type { AuthenticatedRequest } from '../../common/types';

@Injectable()
export class HierarchyGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user; // From JWT guard
    const targetUserId = parseInt(request.params.id);

    if (!user || !targetUserId) {
      throw new ForbiddenException('Invalid request');
    }

    // Admin can access anyone
    if (user.role === Role.ADMIN) {
      return true;
    }

    // Users can access their own data
    if (user.id === targetUserId) {
      return true;
    }

    // Check if the target user is a direct subordinate
    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      throw new ForbiddenException('User not found');
    }

    // Managers can access their direct subordinates
    if (user.role === Role.MANAGER && targetUser.parentId === user.id) {
      return true;
    }

    throw new ForbiddenException(
      'Access denied: insufficient hierarchy permissions',
    );
  }
}
