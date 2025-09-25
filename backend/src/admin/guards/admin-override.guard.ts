import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AdminService } from '../admin.service';
import { Role } from '../../common/enums';

interface AdminOverrideRequest {
  user: {
    sub: number;
    email: string;
    role: Role;
  };
  adminOverride?: {
    reason: string;
    overrideType: string;
    targetEntity: string;
    targetEntityId?: number;
  };
  ip?: string;
  get?: (header: string) => string | undefined;
}

/**
 * Guard that allows admins to override RBAC restrictions and logs the action
 */
@Injectable()
export class AdminOverrideGuard implements CanActivate {
  private readonly logger = new Logger(AdminOverrideGuard.name);

  constructor(
    private reflector: Reflector,
    private adminService: AdminService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest() as AdminOverrideRequest;
    const user = request.user;

    // Only admins can use override
    if (!user || user.role !== Role.ADMIN) {
      return false;
    }

    // Log the override action if override data is present
    if (request.adminOverride) {
      try {
        await this.adminService.recordAdminOverride(
          {
            overrideType: request.adminOverride.overrideType,
            reason: request.adminOverride.reason,
            targetEntity: request.adminOverride.targetEntity,
            targetEntityId: request.adminOverride.targetEntityId || 0,
            metadata: {},
          },
          user.sub,
          request.ip,
          request.get?.('User-Agent'),
        );

        this.logger.warn(`Admin override executed by ${user.email}: ${request.adminOverride.reason}`);
      } catch (error) {
        this.logger.error('Failed to log admin override:', error);
      }
    }

    return true;
  }
}