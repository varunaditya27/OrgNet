# RBAC (Role-Based Access Control) System

## Overview

The OrgNet RBAC system provides comprehensive tree-based access control that enforces organizational hierarchy rules across all modules. It includes multiple specialized guards and decorators for different access control scenarios.

## Architecture

### Core Components

1. **TreeBasedRBACGuard**: Primary guard for hierarchical access control
2. **CommunicationGuard**: Specialized guard for messaging permissions
3. **ResourceAccessGuard**: General resource ownership and access control
4. **RBAC Decorators**: Easy-to-use decorators for applying guards

### Hierarchy Rules

```
ADMIN (Full Access)
├── MANAGER (Team + Subordinate Access)
│   ├── EMPLOYEE (Peer + Superior Access)
│   │   └── INTERN (Self Access Only)
│   └── INTERN (Self Access Only)
└── EMPLOYEE (Peer + Superior Access)
    └── INTERN (Self Access Only)
```

## Guards

### 1. TreeBasedRBACGuard

Enforces tree-based access control based on organizational hierarchy.

**Permissions:**
- `SELF`: Access to own data
- `DIRECT_SUBORDINATES`: Access to immediate reports
- `ALL_SUBORDINATES`: Access to entire subordinate tree
- `DIRECT_SUPERIOR`: Access to immediate boss
- `PEERS`: Access to same-level users
- `TEAM_MEMBERS`: Access to team members
- `ALL_USERS`: Full access (admin only)

**Usage:**
```typescript
@Get(':id')
@UseGuards(JwtAuthGuard, TreeBasedRBACGuard)
@RequireHierarchyAccess([
  HierarchyPermission.SELF,
  HierarchyPermission.DIRECT_SUBORDINATES,
  HierarchyPermission.ALL_USERS,
])
async getUser(@Param('id') id: number) {
  // Implementation
}
```

### 2. CommunicationGuard

Validates messaging permissions based on OrgNet communication rules.

**Communication Rules:**
- **Employees**: Can message peers + immediate superior only
- **Managers**: Can message their own team only
- **Admin**: Full access to all communications

**Usage:**
```typescript
@Post('send')
@UseGuards(JwtAuthGuard, CommunicationGuard)
@RequireCommunicationPermission()
async sendMessage(@Body() dto: SendMessageDto) {
  // Implementation
}
```

### 3. ResourceAccessGuard

Controls access to resources based on ownership and hierarchy.

**Permissions:**
- `OWNER`: Must be the resource owner
- `HIERARCHY_ACCESS`: Based on organizational hierarchy
- `SAME_TEAM`: Must be in the same team
- `READ_ONLY`: Read access only
- `ADMIN_OVERRIDE`: Admin can always access

**Usage:**
```typescript
@Delete('messages/:messageId')
@RequireResourceAccess('message', [
  ResourcePermission.OWNER,
  ResourcePermission.ADMIN_OVERRIDE,
], { ownerField: 'senderId' })
async deleteMessage(@Param('messageId') messageId: number) {
  // Implementation
}
```

## Decorators

### Hierarchy Access Decorators

```typescript
// Basic hierarchy access
@RequireHierarchyAccess([HierarchyPermission.SELF, HierarchyPermission.DIRECT_SUBORDINATES])

// Convenience decorators
@AllowSelfOnly()                    // Self access only
@AllowDirectSubordinates()          // Self + direct subordinates
@AllowAllSubordinates()             // Self + entire subordinate tree
@AllowPeers()                       // Self + peers
@AllowDirectSuperior()              // Self + immediate superior
@AllowTeamMembers()                 // Self + team members
@ManagerAccess()                    // Manager-level permissions
@EmployeeAccess()                   // Employee-level permissions
@AdminAccess()                      // Full admin access
```

### Resource Access Decorators

```typescript
// Basic resource access
@RequireResourceAccess('user', [ResourcePermission.OWNER, ResourcePermission.HIERARCHY_ACCESS])

// Convenience decorators
@RequireOwnership('message', 'senderId')        // Must own the resource
@RequireHierarchyResourceAccess('user')         // Hierarchy-based access
@RequireTeamAccess('project')                   // Team-based access
@AllowReadOnlyHierarchy('document')             // Read-only with hierarchy
```

### Communication Decorators

```typescript
// Communication permission
@RequireCommunicationPermission()               // Messaging permissions

// Combined decorators for common scenarios
@UserProfileAccess()                            // User profile endpoints
@MessageAccess()                                // Message endpoints
@GroupManagementAccess()                        // Group management endpoints
```

## Implementation Examples

### User Management Endpoint

```typescript
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  
  @Get(':id')
  @UseGuards(TreeBasedRBACGuard)
  @RequireHierarchyAccess([
    HierarchyPermission.SELF,
    HierarchyPermission.DIRECT_SUBORDINATES,
    HierarchyPermission.DIRECT_SUPERIOR,
    HierarchyPermission.ALL_USERS,
  ])
  async getUser(@Param('id') id: number) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(TreeBasedRBACGuard, ResourceAccessGuard)
  @RequireHierarchyAccess([HierarchyPermission.SELF, HierarchyPermission.ALL_USERS])
  @RequireResourceAccess('user', [ResourcePermission.OWNER, ResourcePermission.ADMIN_OVERRIDE])
  async updateUser(@Param('id') id: number, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }
}
```

### Messaging Endpoints

```typescript
@Controller('messaging')
@UseGuards(JwtAuthGuard)
export class MessagingController {

  @Post('send')
  @UseGuards(CommunicationGuard)
  @RequireCommunicationPermission()
  async sendMessage(@Body() dto: SendMessageDto, @User('id') userId: number) {
    return this.messagingService.sendMessage(dto, userId);
  }

  @Delete('messages/:messageId')
  @UseGuards(ResourceAccessGuard)
  @RequireResourceAccess('message', [
    ResourcePermission.OWNER,
    ResourcePermission.ADMIN_OVERRIDE,
  ], { ownerField: 'senderId' })
  async deleteMessage(@Param('messageId') messageId: number) {
    return this.messagingService.deleteMessage(messageId);
  }

  @Post('groups')
  @UseGuards(CommunicationGuard)
  @RequireCommunicationPermission()
  async createGroup(@Body() dto: CreateGroupDto, @User('id') userId: number) {
    return this.messagingService.createGroup(dto, userId);
  }
}
```

## Permission Matrix

### User Access Permissions

| Role     | Self | Direct Sub | All Sub | Superior | Peers | Team | All Users |
|----------|------|------------|---------|----------|-------|------|-----------|
| INTERN   | ✅   | ❌         | ❌      | ✅       | ✅    | ❌   | ❌        |
| EMPLOYEE | ✅   | ❌         | ❌      | ✅       | ✅    | ✅   | ❌        |
| MANAGER  | ✅   | ✅         | ✅      | ✅       | ✅    | ✅   | ❌        |
| ADMIN    | ✅   | ✅         | ✅      | ✅       | ✅    | ✅   | ✅        |

### Communication Permissions

| From/To  | INTERN | EMPLOYEE | MANAGER | ADMIN |
|----------|--------|----------|---------|-------|
| INTERN   | Peers  | Superior | Superior| ✅    |
| EMPLOYEE | Sub    | Peers    | Superior| ✅    |
| MANAGER  | Sub    | Sub      | Peers   | ✅    |
| ADMIN    | ✅     | ✅       | ✅      | ✅    |

## Advanced Features

### Dynamic Permission Extraction

The guards automatically extract target user IDs from:
- URL parameters (`/users/:id`)
- Query parameters (`?userId=123`)
- Request body (`{ receiverId: 123 }`)
- Message-specific fields (`{ senderId: 123 }`)

### Recursive Hierarchy Queries

For complex hierarchy checks, the system uses recursive SQL queries:
```sql
WITH RECURSIVE subordinate_tree AS (
  SELECT id, "parentId" FROM "User" WHERE "parentId" = $managerId
  UNION ALL
  SELECT u.id, u."parentId" 
  FROM "User" u
  INNER JOIN subordinate_tree st ON u."parentId" = st.id
)
SELECT id FROM subordinate_tree WHERE id = $targetUserId
```

### Team-Based Access

The system supports team-based access control:
- Team managers can access all team members
- Team members can communicate with each other
- Cross-team communication follows hierarchy rules

## Security Features

1. **SQL Injection Protection**: All queries use Prisma ORM with parameterized queries
2. **Input Validation**: All inputs validated through DTOs
3. **Error Handling**: Proper error messages without information leakage
4. **Audit Trail**: All access attempts can be logged
5. **Performance Optimized**: Efficient database queries with proper indexing

## Integration with Existing Modules

### Authentication Module
- Seamless integration with JWT guards
- User context automatically available in guards
- Role information extracted from JWT payload

### Users Module
- Hierarchy information used for permission calculations
- Parent-child relationships enforced
- Team memberships considered

### Messaging Module
- Communication rules strictly enforced
- Group membership validation
- Message ownership verification

## Usage Guidelines

1. **Always use JwtAuthGuard first** to ensure user authentication
2. **Combine guards appropriately** for comprehensive protection
3. **Use convenience decorators** for common scenarios
4. **Test permissions thoroughly** across different user roles
5. **Consider performance implications** of complex hierarchy queries

## Testing

The RBAC system can be tested with different user scenarios:

```typescript
// Test data setup
const admin = { id: 1, role: 'ADMIN', parentId: null };
const manager = { id: 2, role: 'MANAGER', parentId: 1 };
const employee = { id: 3, role: 'EMPLOYEE', parentId: 2 };
const intern = { id: 4, role: 'INTERN', parentId: 3 };

// Test hierarchy access
expect(canAccessUser(manager, employee)).toBe(true);   // Manager -> subordinate ✅
expect(canAccessUser(employee, manager)).toBe(true);   // Employee -> superior ✅
expect(canAccessUser(employee, intern)).toBe(false);   // Employee -> non-subordinate ❌
```

## Performance Considerations

1. **Database Indexing**: Ensure proper indexes on `parentId` and `role` fields
2. **Query Optimization**: Complex hierarchy queries are cached when possible
3. **Guard Ordering**: Place lightweight guards before heavy ones
4. **Resource Caching**: User permissions can be cached for session duration

## Future Enhancements

1. **Dynamic Permissions**: Runtime permission configuration
2. **Audit Logging**: Comprehensive access logging
3. **Permission Caching**: Redis-based permission caching
4. **Multi-Tenant Support**: Organization-specific RBAC rules
5. **Advanced Team Structures**: Matrix organizations support