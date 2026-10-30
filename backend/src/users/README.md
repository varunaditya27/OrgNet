# User Management Module

This module provides comprehensive user management functionality for the OrgNet application with hierarchical RBAC enforcement and seamless integration with the Authentication module.

## Features

- **CRUD Operations**: Complete user management (Create, Read, Update, Delete)
- **Hierarchical Structure**: Support for parent-child relationships in organizational hierarchy
- **Role Management**: Support for ADMIN, MANAGER, EMPLOYEE, INTERN roles
- **RBAC Enforcement**: Tree-based role-based access control with hierarchy guards
- **Team Integration**: Fetch user's team memberships and managed teams
- **Password Management**: Secure password change functionality
- **Pagination**: Efficient pagination for user listings
- **Soft Delete**: Users are deactivated rather than hard deleted

## API Endpoints

### Core User Management

#### POST /users
Create a new user (Admin/Manager only). Managers may create only `EMPLOYEE` and `INTERN` accounts; creating `ADMIN` or `MANAGER` accounts is admin-only (403 otherwise).

**Request Body:**
```json
{
  "name": "Jane Smith",
  "email": "jane@example.com",
  "password": "securepassword123",
  "role": "EMPLOYEE",
  "parentId": 1,
  "isActive": true
}
```

#### GET /users
Get paginated list of users (Admin/Manager only).

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)
- `role`: Filter by role (ADMIN, MANAGER, EMPLOYEE, INTERN)
- `isActive`: Filter by active status (true/false)

#### GET /users/profile
Get current user's profile (requires authentication).

#### GET /users/:id
Get specific user details (hierarchy-protected).

#### PATCH /users/:id
Update user information (hierarchy-protected). Users can edit themselves and managers can edit their direct subordinates, but **changing `role`, `parentId` or `isActive` requires an admin** (403 otherwise). Sending a field with its current value is accepted, so edit forms that always send every field keep working.

#### DELETE /users/:id
Deactivate user (Admin only).

### Hierarchy Management

#### GET /users/:id/hierarchy
Get user with their parent and subordinates.

**Response:**
```json
{
  "id": 1,
  "name": "John Manager",
  "email": "john@example.com",
  "role": "MANAGER",
  "parent": {
    "id": 2,
    "name": "Admin User",
    "role": "ADMIN"
  },
  "subordinates": [
    {
      "id": 3,
      "name": "Employee One",
      "role": "EMPLOYEE"
    }
  ]
}
```

#### GET /users/:id/superior
Get user's immediate superior.

#### GET /users/:id/subordinates
Get user's direct subordinates.

#### GET /users/:id/teams
Get user's team information (managed teams and memberships).

**Response:**
```json
{
  "teamsManaged": [
    {
      "id": 1,
      "name": "Development Team",
      "createdAt": "2025-01-01T10:00:00.000Z"
    }
  ],
  "teamMemberships": [
    {
      "id": 2,
      "name": "Product Team",
      "managerId": 5,
      "createdAt": "2025-01-01T10:00:00.000Z"
    }
  ]
}
```

### Password Management

#### PATCH /users/:id/change-password
Change user password. The body is validated (the new password needs at least 8 characters); changing someone else's password returns 403. To recover a forgotten password, use `POST /auth/forgot-password` instead.

**Request Body:**
```json
{
  "oldPassword": "currentpassword",
  "newPassword": "newsecurepassword123"
}
```

### Admin Endpoints

#### GET /users/admin/all-users
Get all users (Admin only).

**Query Parameters:**
- `includeInactive`: Include deactivated users (true/false)

#### PATCH /users/admin/:id/activate
Activate a deactivated user (Admin only).

#### PATCH /users/admin/:id/deactivate
Deactivate a user (Admin only).

## RBAC & Hierarchy Rules

### Role Hierarchy
```
ADMIN
├── MANAGER
│   ├── EMPLOYEE
│   │   └── INTERN
│   └── INTERN
└── EMPLOYEE
    └── INTERN
```

### Access Control Rules

1. **ADMIN**: Can access and manage all users, and is the only role that can change roles, reporting lines or account status
2. **MANAGER**: Can access their direct subordinates and create EMPLOYEE/INTERN users under them
3. **EMPLOYEE**: Can access their own data and view their immediate superior
4. **INTERN**: Can access only their own data

### Hierarchy Validation

- **Parent Assignment**: A user can only be assigned a parent who can supervise their role
- **Circular Reference Prevention**: System prevents circular parent-child relationships
- **Subordinate Protection**: Users with subordinates cannot be deleted until subordinates are reassigned

## Guards

### HierarchyGuard

Enforces tree-based access control for user-specific operations:

```typescript
@Get(':id')
@UseGuards(JwtAuthGuard, HierarchyGuard)
async findOne(@Param('id') id: number) {
  // Only accessible if user has hierarchy permission to view target user
}
```

### Usage with Roles

```typescript
@Post()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.MANAGER)
async create(@Body() createUserDto: CreateUserDto) {
  // Only admins and managers can create users
}
```

## Service Methods

### Core CRUD
- `create(createUserDto, requestingRole)`: Create new user (non-admins limited to EMPLOYEE/INTERN)
- `findAll(page, limit, role, isActive)`: Get paginated users
- `findOne(id)`: Get user by ID
- `findByEmail(email)`: Get user by email
- `update(id, updateUserDto, requestingUserId)`: Update user
- `remove(id, requestingUserId)`: Deactivate user

### Hierarchy Methods
- `getHierarchy(id)`: Get user with parent and subordinates
- `getSuperior(id)`: Get user's immediate superior
- `getSubordinates(id)`: Get user's direct subordinates
- `getTeamInfo(id)`: Get user's team information

### Utility Methods
- `changePassword(id, oldPassword, newPassword)`: Change user password
- `validateHierarchyRules(parentRole, childRole)`: Validate role hierarchy
- `checkCircularReference(userId, newParentId)`: Prevent circular references

## Integration with Auth Module

The User module seamlessly integrates with the Authentication module:

1. **JWT Guards**: All endpoints protected with JWT authentication
2. **User Context**: Current user information available via `@Request() req`
3. **Role Validation**: Uses shared Role enum and RolesGuard
4. **Password Hashing**: Consistent bcrypt usage for password security

## Error Handling

Comprehensive error handling with specific exception types:

- **NotFoundException**: User not found (404)
- **ConflictException**: Email already exists (409)
- **BadRequestException**: Invalid hierarchy assignments (400)
- **ForbiddenException**: Insufficient permissions (403)

## Security Features

- **Hierarchy Enforcement**: Tree-based access control prevents unauthorized access
- **Password Security**: Bcrypt hashing with 12 salt rounds
- **Circular Reference Prevention**: Validates parent-child assignments
- **Soft Delete**: Users are deactivated rather than permanently deleted
- **Input Validation**: Comprehensive DTO validation with class-validator
- **Privilege Protection**: Role, reporting-line and status changes are admin-only, so users cannot promote themselves

## Database Integration

- **Prisma ORM**: Type-safe database operations
- **Optimized Queries**: Efficient pagination and filtering
- **Relationship Loading**: Proper handling of parent-child relationships
- **Transaction Support**: Safe multi-step operations

## Usage Examples

### Creating a User with Hierarchy

```typescript
const newUser = await usersService.create({
  name: "New Employee",
  email: "employee@company.com",
  password: "securepassword",
  role: Role.EMPLOYEE,
  parentId: managerId, // Immediate superior
});
```

### Getting User Hierarchy

```typescript
const hierarchy = await usersService.getHierarchy(userId);
console.log(`User: ${hierarchy.name}`);
console.log(`Superior: ${hierarchy.parent?.name}`);
console.log(`Subordinates: ${hierarchy.subordinates?.length}`);
```

### Validating Permissions

The HierarchyGuard automatically validates that users can only access:
- Their own data
- Their direct subordinates (for managers)
- Any user data (for admins)

This ensures the tree-based RBAC system is enforced at every endpoint.