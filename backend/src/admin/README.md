# Admin Module

The Admin Module provides comprehensive administrative capabilities for the OrgNet application, enabling admins to override RBAC restrictions, manage users and teams, view audit logs, and monitor system statistics.

## Features

### 🔐 **RBAC Override**
- Admins can bypass normal role-based access control restrictions
- All override actions are logged for audit purposes
- Comprehensive permission escalation tracking

### 👥 **Advanced User Management**
- Create users with any role (bypasses normal hierarchy restrictions)
- Update any user's information, role, or hierarchy position
- Bulk operations: activate, deactivate, or reassign multiple users
- Hard delete users with dependency checks
- View detailed user statistics and relationships

### 🏢 **Team Oversight**
- Create teams with any manager assignment
- View all teams across the organization
- Delete teams regardless of ownership
- Comprehensive team statistics and member counts

### 📊 **System Statistics**
- Real-time user, team, message, and file statistics
- Role distribution analysis
- Recent activity tracking
- System health monitoring

### 📋 **Audit Logging**
- Complete audit trail of all admin actions
- Filterable logs by action, user, entity, and date range
- IP address and user agent tracking
- Detailed metadata for forensic analysis

### 🏗️ **Hierarchy Management**
- Restructure organizational hierarchy
- Move users and their subordinates
- Prevent circular references
- Bulk hierarchy operations

## API Endpoints

### User Management
```
POST   /admin/users                    # Create user with admin privileges
GET    /admin/users                    # Get all users (with filtering)
GET    /admin/users/:id                # Get user by ID
PUT    /admin/users/:id                # Update any user
DELETE /admin/users/:id                # Hard delete user
POST   /admin/users/bulk-operation     # Bulk user operations
```

### Team Management
```
POST   /admin/teams                    # Create team with admin privileges
GET    /admin/teams                    # Get all teams (with filtering)
DELETE /admin/teams/:id                # Delete team
```

### Hierarchy Management
```
PUT    /admin/hierarchy/restructure    # Restructure user hierarchy
```

### Audit & Monitoring
```
GET    /admin/audit-logs               # Get audit logs (with filtering)
GET    /admin/stats                    # Get system statistics
```

### Admin Overrides
```
POST   /admin/override                 # Record admin RBAC override
```

### Health Check
```
GET    /admin/health                   # Admin module health check
```

## Security Features

### Authentication & Authorization
- Requires JWT authentication for all endpoints
- Admin role required for all operations
- Request IP and user agent logging
- Comprehensive audit trail

### RBAC Override Protection
- All override actions are logged with reasons
- Detailed metadata tracking
- IP address and timestamp recording
- Override type categorization

## Data Models

### AuditLog
```typescript
{
  id: number
  userId: number
  action: string
  entity: string
  entityId?: number
  details?: string
  metadata: object
  ipAddress?: string
  userAgent?: string
  timestamp: Date
  user: UserBasicInfo
}
```

### System Statistics
```typescript
{
  users: {
    total: number
    active: number
    byRole: Record<Role, number>
    recentlyCreated: number
  }
  teams: {
    total: number
    totalMembers: number
    averageTeamSize: number
    teamsWithoutMembers: number
  }
  messages: {
    totalSent: number
    todaysSent: number
    topSenders: Array<{userId: number, name: string, count: number}>
  }
  files: {
    totalFiles: number
    totalSize: number
    downloadCount: number
    activeFiles: number
  }
  system: {
    uptimeMinutes: number
    lastBackup?: string
    databaseSize?: number
  }
}
```

## Usage Examples

### Create Admin User
```bash
curl -X POST /admin/users \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "System Admin",
    "email": "admin@company.com",
    "password": "secure-password",
    "role": "ADMIN",
    "isActive": true
  }'
```

### Bulk User Deactivation
```bash
curl -X POST /admin/users/bulk-operation \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "userIds": [1, 2, 3, 4],
    "operation": "deactivate",
    "reason": "End of employment batch process"
  }'
```

### Restructure Hierarchy
```bash
curl -X PUT /admin/hierarchy/restructure \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 5,
    "newParentId": 2,
    "reason": "Organizational restructuring",
    "moveSubordinates": true
  }'
```

### Get Audit Logs
```bash
curl -X GET "/admin/audit-logs?action=ADMIN_CREATE_USER&startDate=2024-01-01&limit=50" \
  -H "Authorization: Bearer <admin-token>"
```

## Configuration

### Environment Variables
The Admin module uses the following configuration:
- Database connection (via Prisma)
- JWT authentication settings
- Audit log retention policies

### Guards
- `AdminGuard`: Ensures admin role for all operations
- `AdminOverrideGuard`: Logs RBAC override actions

## Error Handling

### Common Errors
- `401 Unauthorized`: Invalid or missing JWT token
- `403 Forbidden`: Non-admin user attempting admin operations
- `404 Not Found`: User, team, or resource not found
- `409 Conflict`: Email already exists, circular hierarchy reference
- `400 Bad Request`: Invalid data, dependency conflicts

### Audit Logging
- All errors are logged with context
- Failed operations include reason and metadata
- IP address tracking for security analysis

## Development

### Testing
```bash
# Run admin module tests
npm run test -- admin

# Run integration tests
npm run test:e2e -- admin
```

### Database Schema
The module adds the `AuditLog` model to track admin actions:
```prisma
model AuditLog {
  id         Int      @id @default(autoincrement())
  userId     Int
  action     String
  entity     String
  entityId   Int?
  details    String?
  metadata   Json     @default("{}")
  ipAddress  String?
  userAgent  String?
  timestamp  DateTime @default(now())
  user       User     @relation(fields: [userId], references: [id])
}
```

## Migration Guide

### From Previous Versions
1. Run database migration: `npx prisma migrate dev --name add-audit-log`
2. Update AppModule imports to include AdminModule
3. Ensure admin users exist in the system
4. Configure audit log retention policies

### Best Practices
- Always provide detailed reasons for override actions
- Regularly review audit logs for suspicious activity
- Use bulk operations for efficiency
- Monitor system statistics for performance insights
- Implement backup procedures for audit logs

## Security Considerations

### Audit Trail Integrity
- Audit logs cannot be modified by users
- Complete action history with metadata
- IP address and user agent tracking
- Timestamp precision for forensic analysis

### Access Control
- Strict admin-only access to all endpoints
- JWT token validation on every request
- Role verification at guard level
- Request context logging

### Data Protection
- Sensitive data masking in logs
- Secure password handling
- Email uniqueness enforcement
- Hierarchy validation to prevent cycles

## Support

For issues related to the Admin module:
1. Check audit logs for detailed error information
2. Verify admin role assignments
3. Review system statistics for anomalies
4. Consult the API documentation for endpoint specifications

The Admin module is designed to provide comprehensive administrative capabilities while maintaining security, auditability, and operational transparency.