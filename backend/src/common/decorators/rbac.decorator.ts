import { SetMetadata } from '@nestjs/common';
import { HierarchyPermission, RBACConfig } from '../guards/tree-based-rbac.guard';
import { ResourcePermission, ResourceConfig } from '../guards/resource-access.guard';

// RBAC Decorator Keys
export const RBAC_KEY = 'rbac';
export const RESOURCE_KEY = 'resource';
export const COMMUNICATION_KEY = 'communication';

/**
 * Decorator for tree-based RBAC enforcement
 * @param permissions Array of hierarchy permissions required
 * @param options Additional configuration options
 */
export const RequireHierarchyAccess = (
  permissions: HierarchyPermission[],
  options: Partial<RBACConfig> = {},
) => {
  const config: RBACConfig = {
    permissions,
    allowSelfAccess: true,
    ...options,
  };
  return SetMetadata(RBAC_KEY, config);
};

/**
 * Decorator for resource access control
 * @param resource Resource type (e.g., 'user', 'message', 'group')
 * @param permissions Array of resource permissions required
 * @param options Additional configuration options
 */
export const RequireResourceAccess = (
  resource: string,
  permissions: ResourcePermission[],
  options: Partial<Omit<ResourceConfig, 'resource' | 'permissions'>> = {},
) => {
  const config: ResourceConfig = {
    resource,
    permissions,
    ...options,
  };
  return SetMetadata(RESOURCE_KEY, config);
};

/**
 * Decorator for communication permissions (messaging)
 * Uses the CommunicationGuard to validate messaging permissions
 */
export const RequireCommunicationPermission = () => {
  return SetMetadata(COMMUNICATION_KEY, true);
};

// Convenience decorators for common scenarios

/**
 * Allow access to own data only
 */
export const AllowSelfOnly = () => 
  RequireHierarchyAccess([HierarchyPermission.SELF]);

/**
 * Allow access to direct subordinates (for managers)
 */
export const AllowDirectSubordinates = () => 
  RequireHierarchyAccess([HierarchyPermission.SELF, HierarchyPermission.DIRECT_SUBORDINATES]);

/**
 * Allow access to entire subordinate tree (for managers)
 */
export const AllowAllSubordinates = () => 
  RequireHierarchyAccess([HierarchyPermission.SELF, HierarchyPermission.ALL_SUBORDINATES]);

/**
 * Allow access to peers (same level in hierarchy)
 */
export const AllowPeers = () => 
  RequireHierarchyAccess([HierarchyPermission.SELF, HierarchyPermission.PEERS]);

/**
 * Allow access to direct superior
 */
export const AllowDirectSuperior = () => 
  RequireHierarchyAccess([HierarchyPermission.SELF, HierarchyPermission.DIRECT_SUPERIOR]);

/**
 * Allow access to team members
 */
export const AllowTeamMembers = () => 
  RequireHierarchyAccess([HierarchyPermission.SELF, HierarchyPermission.TEAM_MEMBERS]);

/**
 * Manager-level access (self + direct subordinates + peers)
 */
export const ManagerAccess = () => 
  RequireHierarchyAccess([
    HierarchyPermission.SELF,
    HierarchyPermission.DIRECT_SUBORDINATES,
    HierarchyPermission.PEERS,
    HierarchyPermission.DIRECT_SUPERIOR,
  ]);

/**
 * Employee-level access (self + immediate superior + peers)
 */
export const EmployeeAccess = () => 
  RequireHierarchyAccess([
    HierarchyPermission.SELF,
    HierarchyPermission.DIRECT_SUPERIOR,
    HierarchyPermission.PEERS,
  ]);

/**
 * Admin access (full access)
 */
export const AdminAccess = () => 
  RequireHierarchyAccess([HierarchyPermission.ALL_USERS]);

// Resource-specific decorators

/**
 * Allow access if user owns the resource
 */
export const RequireOwnership = (resource: string, ownerField?: string) =>
  RequireResourceAccess(resource, [ResourcePermission.OWNER], { ownerField });

/**
 * Allow access based on hierarchy rules
 */
export const RequireHierarchyResourceAccess = (resource: string) =>
  RequireResourceAccess(resource, [
    ResourcePermission.OWNER,
    ResourcePermission.HIERARCHY_ACCESS,
    ResourcePermission.ADMIN_OVERRIDE,
  ]);

/**
 * Allow access for team members
 */
export const RequireTeamAccess = (resource: string) =>
  RequireResourceAccess(resource, [
    ResourcePermission.OWNER,
    ResourcePermission.SAME_TEAM,
    ResourcePermission.ADMIN_OVERRIDE,
  ]);

/**
 * Read-only access with hierarchy rules
 */
export const AllowReadOnlyHierarchy = (resource: string) =>
  RequireResourceAccess(resource, [
    ResourcePermission.OWNER,
    ResourcePermission.HIERARCHY_ACCESS,
    ResourcePermission.READ_ONLY,
    ResourcePermission.ADMIN_OVERRIDE,
  ]);

// Combined decorators for common use cases

/**
 * For user profile endpoints - can access own profile + hierarchy rules
 */
export const UserProfileAccess = () => [
  RequireHierarchyAccess([
    HierarchyPermission.SELF,
    HierarchyPermission.DIRECT_SUBORDINATES,
    HierarchyPermission.DIRECT_SUPERIOR,
    HierarchyPermission.ALL_USERS, // For admin
  ]),
  RequireResourceAccess('user', [
    ResourcePermission.OWNER,
    ResourcePermission.HIERARCHY_ACCESS,
    ResourcePermission.ADMIN_OVERRIDE,
  ]),
];

/**
 * For message endpoints - requires communication permissions
 */
export const MessageAccess = () => [
  RequireCommunicationPermission(),
  RequireResourceAccess('message', [
    ResourcePermission.OWNER,
    ResourcePermission.ADMIN_OVERRIDE,
  ], { ownerField: 'senderId' }),
];

/**
 * For group management endpoints
 */
export const GroupManagementAccess = () => [
  RequireCommunicationPermission(),
  RequireResourceAccess('group', [
    ResourcePermission.HIERARCHY_ACCESS,
    ResourcePermission.ADMIN_OVERRIDE,
  ]),
];