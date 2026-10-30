import type { Request } from 'express';
import type { UserResponseDto } from '../auth/dto/auth-response.dto';
import type { Role } from './enums';

/** The minimum a permission check needs to know about a user. */
export interface HierarchyUser {
  id: number;
  role: Role;
  parentId: number | null;
  isActive?: boolean;
}

/** An Express request after JwtAuthGuard has attached the authenticated user. */
export type AuthenticatedRequest = Request & { user: UserResponseDto };
