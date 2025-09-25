// Guards
export { TreeBasedRBACGuard, HierarchyPermission } from './guards/tree-based-rbac.guard';
export type { RBACConfig } from './guards/tree-based-rbac.guard';
export { CommunicationGuard } from './guards/communication.guard';
export { ResourceAccessGuard, ResourcePermission } from './guards/resource-access.guard';
export type { ResourceConfig } from './guards/resource-access.guard';

// Decorators
export * from './decorators/rbac.decorator';

// Re-export existing guards and decorators for convenience
export { RolesGuard } from '../auth/guards/roles.guard';
export { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
export { HierarchyGuard } from '../users/guards/hierarchy.guard';
export { Roles, ROLES_KEY } from './decorators/roles.decorator';
export { User } from './decorators/user.decorator';