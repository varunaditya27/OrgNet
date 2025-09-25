# Teams Module

## Overview

The Teams module provides comprehensive team management functionality for the OrgNet application, allowing managers to create, manage, and organize teams within the organizational hierarchy while enforcing strict RBAC (Role-Based Access Control) rules.

## Features

### Core Team Management
- **Team Creation**: Managers and admins can create teams and become team managers
- **Member Management**: Add/remove team members with hierarchy validation
- **Team Information**: Update team names, descriptions, and metadata
- **Team Discovery**: List and search teams based on user permissions

### RBAC Integration
- **Hierarchical Control**: Managers can only manage their own teams and add subordinates
- **Role-Based Access**: Different access levels for Admin, Manager, and Employee roles
- **Ownership Validation**: Only team managers can modify their teams
- **Subordinate Restriction**: Managers can only add users from their organizational subtree

### Team Organization
- **Manager Assignment**: Each team has a designated manager
- **Member Tracking**: Track team membership and member counts
- **Team Hierarchy**: Teams respect organizational hierarchy rules
- **Search and Filtering**: Find teams by name with role-based visibility

## API Endpoints

### Team Management

#### Create Team
```
POST /teams
```
Create a new team (Manager/Admin only).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Body:**
```json
{
  "name": "Development Team",
  "description": "Frontend and backend developers",
  "memberIds": [123, 456, 789]
}
```

**Response:**
```json
{
  "id": 1,
  "name": "Development Team",
  "description": "Frontend and backend developers",
  "managerId": 100,
  "manager": {
    "id": 100,
    "name": "John Manager",
    "email": "john@company.com",
    "role": "MANAGER",
    "isActive": true,
    "createdAt": "2025-01-01T10:00:00.000Z"
  },
  "members": [
    {
      "id": 123,
      "name": "Alice Developer",
      "email": "alice@company.com",
      "role": "EMPLOYEE",
      "isActive": true,
      "createdAt": "2025-01-01T09:00:00.000Z"
    }
  ],
  "memberCount": 3,
  "createdAt": "2025-01-01T10:00:00.000Z",
  "updatedAt": "2025-01-01T10:00:00.000Z"
}
```

#### List Teams
```
GET /teams?page=1&limit=10&search=dev
```
Get paginated list of teams accessible to the user.

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)
- `search`: Search term for team names

**Response:**
```json
{
  "teams": [
    {
      "id": 1,
      "name": "Development Team",
      "description": "Frontend and backend developers",
      "managerId": 100,
      "manager": {
        "id": 100,
        "name": "John Manager",
        "email": "john@company.com"
      },
      "memberCount": 5,
      "createdAt": "2025-01-01T10:00:00.000Z",
      "updatedAt": "2025-01-01T10:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1
  }
}
```

#### Get Team Details
```
GET /teams/:id
```
Retrieve detailed information about a specific team.

**Response:** Same as Create Team response.

#### Update Team
```
PATCH /teams/:id
```
Update team information (Manager/Admin only).

**Body:**
```json
{
  "name": "Updated Team Name",
  "description": "Updated description"
}
```

### Member Management

#### Add Members
```
POST /teams/:id/members
```
Add members to a team (Manager/Admin only).

**Body:**
```json
{
  "memberIds": [999, 888]
}
```

#### Remove Members
```
DELETE /teams/:id/members
```
Remove members from a team (Manager/Admin only).

**Body:**
```json
{
  "memberIds": [999, 888]
}
```

#### Delete Team
```
DELETE /teams/:id
```
Delete a team (Manager/Admin only).

**Response:**
```json
{
  "message": "Team deleted successfully"
}
```

### Manager-Specific Endpoints

#### Get My Managed Teams
```
GET /teams/managed/my-teams
```
Get all teams managed by the current user (Manager/Admin only).

#### Get Teams by Manager
```
GET /teams/managed/by-manager/:managerId
```
Get teams managed by a specific manager (Admin only).

## RBAC Rules

### Access Control Matrix

| Role | Create Team | View All Teams | View Own Teams | View Member Teams | Manage Own Teams | Manage Any Team |
|------|-------------|----------------|----------------|-------------------|------------------|-----------------|
| ADMIN | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| MANAGER | ✅ | ❌ | ✅ | ❌ | ✅ | ❌ |
| EMPLOYEE | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| INTERN | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |

### Team Visibility Rules

1. **Admin**: Can see and manage all teams in the organization
2. **Manager**: Can see and manage only their own teams
3. **Employee/Intern**: Can see only teams they are members of

### Member Addition Rules

1. **Admin**: Can add any active user to any team
2. **Manager**: Can only add their direct and indirect subordinates to their teams
3. **Hierarchy Validation**: The system recursively checks subordinate relationships
4. **Active Users Only**: Only active users can be added to teams

### Team Management Rules

1. **Team Creation**: Only managers and admins can create teams
2. **Automatic Manager Assignment**: The user creating the team becomes the manager
3. **Manager Restrictions**: Managers can only manage teams they created
4. **Admin Override**: Admins can manage any team
5. **Name Uniqueness**: Team names must be unique per manager

## Service Methods

### Core CRUD Operations
- `create(createTeamDto, managerId)`: Create new team with manager assignment
- `findAll(userId, query)`: Get paginated teams with role-based filtering
- `findOne(teamId, userId)`: Get team details with access validation
- `update(teamId, updateTeamDto, userId)`: Update team information
- `remove(teamId, userId)`: Delete team with permission check

### Member Management
- `addMembers(teamId, addMembersDto, userId)`: Add members with hierarchy validation
- `removeMembers(teamId, removeMembersDto, userId)`: Remove members from team

### Utility Methods
- `getTeamsByManager(managerId)`: Get all teams managed by specific user
- `validateMembers(memberIds, managerId, managerRole)`: Validate member additions
- `getAllSubordinates(userId)`: Recursively get all subordinates
- `formatTeamResponse(team)`: Format team data for API response

## Integration with Other Modules

### User Module Integration
- **Hierarchy Validation**: Teams respect user parent-child relationships
- **Role Enforcement**: User roles determine team management permissions
- **Active User Check**: Only active users can be team members

### Auth Module Integration
- **JWT Protection**: All endpoints require valid JWT tokens
- **Role Guards**: Endpoints protected with appropriate role requirements
- **User Context**: Current user information available for permission checks

### Messaging Module Integration
- **Team Communication**: Teams can be used for group messaging context
- **Member Lookup**: Team membership can determine messaging permissions
- **Manager Communication**: Team managers can communicate with all team members

## Error Handling

The module provides comprehensive error handling:

- **404 Not Found**: Team, user, or manager not found
- **403 Forbidden**: Insufficient permissions for requested action
- **409 Conflict**: Duplicate team names or existing members
- **400 Bad Request**: Invalid member IDs or validation failures

### Common Error Scenarios

```json
// Team not found
{
  "statusCode": 404,
  "message": "Team not found",
  "error": "Not Found"
}

// Permission denied
{
  "statusCode": 403,
  "message": "Only the team manager or admin can update team information",
  "error": "Forbidden"
}

// Invalid members
{
  "statusCode": 400,
  "message": "Users not found or inactive: 999, 888",
  "error": "Bad Request"
}

// Hierarchy violation
{
  "statusCode": 403,
  "message": "Managers can only add their subordinates to teams",
  "error": "Forbidden"
}
```

## Usage Examples

### Creating a Team with Members

```typescript
// Manager creating a team with subordinates
const teamData = {
  name: "Product Development Team",
  description: "Team responsible for product features",
  memberIds: [101, 102, 103] // Manager's subordinates
};

const team = await teamsController.create(teamData, managerId);
```

### Adding Members with Hierarchy Validation

```typescript
// Manager adding more subordinates to existing team
const addMembersData = {
  memberIds: [104, 105] // Must be manager's subordinates
};

const updatedTeam = await teamsController.addMembers(
  teamId, 
  addMembersData, 
  managerId
);
```

### Role-Based Team Listing

```typescript
// Different users see different teams
const adminTeams = await teamsController.findAll(adminId, query); // All teams
const managerTeams = await teamsController.findAll(managerId, query); // Own teams
const employeeTeams = await teamsController.findAll(employeeId, query); // Member teams
```

## Security Features

1. **RBAC Enforcement**: Strict role-based access control at every endpoint
2. **Hierarchy Validation**: Recursive subordinate checking prevents unauthorized access
3. **Input Validation**: Comprehensive DTO validation with class-validator
4. **SQL Injection Protection**: Prisma ORM provides parameterized queries
5. **Permission Auditing**: All access attempts can be logged for compliance

## Database Schema

The Teams module uses the following Prisma model:

```prisma
model Team {
  id        Int      @id @default(autoincrement())
  name      String
  managerId Int
  members   User[]   @relation("TeamMembers")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  manager User @relation(fields: [managerId], references: [id])
}
```

### Key Relationships
- **Manager**: Each team has one manager (User)
- **Members**: Many-to-many relationship with Users
- **Hierarchy**: Teams respect User parent-child relationships

## Performance Considerations

1. **Indexing**: Ensure proper indexes on `managerId` and team name fields
2. **Recursive Queries**: Subordinate validation uses optimized recursive SQL
3. **Pagination**: Large team lists are paginated for performance
4. **Member Counts**: Efficient counting using Prisma's `_count` functionality
5. **Query Optimization**: Selective field loading to minimize data transfer

## Testing

The Teams module can be tested with different user scenarios:

```typescript
// Test data setup
const admin = { id: 1, role: 'ADMIN' };
const manager = { id: 2, role: 'MANAGER', parentId: 1 };
const employee = { id: 3, role: 'EMPLOYEE', parentId: 2 };

// Test team creation
const team = await teamsService.create({
  name: "Test Team",
  memberIds: [3] // Employee under manager
}, manager.id);

// Test hierarchy enforcement
expect(() => teamsService.addMembers(team.id, { memberIds: [4] }, manager.id))
  .toThrow('Managers can only add their subordinates to teams');
```

## Future Enhancements

1. **Team Templates**: Predefined team structures for common organizational patterns
2. **Team Analytics**: Statistics on team performance and collaboration
3. **Team Workflows**: Integration with task and project management
4. **Team Calendar**: Shared team events and meetings
5. **Cross-Team Collaboration**: Controlled interaction between different teams

## Migration Guide

When upgrading existing systems:

1. **Database Migration**: Run Prisma migrations to create Team model
2. **Permission Audit**: Review existing user permissions and roles
3. **Data Migration**: Import existing team structures if applicable
4. **Testing**: Validate RBAC rules with your organizational structure
5. **Documentation**: Update internal documentation with new team features

## Troubleshooting

### Common Issues

1. **Permission Denied**: Verify user roles and hierarchy relationships
2. **Member Addition Fails**: Check if users are active and within hierarchy
3. **Team Not Visible**: Confirm user has appropriate access level
4. **Duplicate Team Names**: Ensure unique names per manager
5. **Database Errors**: Verify Prisma schema and migrations are up to date

The Teams module provides a robust foundation for organizational team management while maintaining strict security and hierarchy enforcement throughout the OrgNet application.