# Authentication Module

This module provides JWT-based authentication for the OrgNet application with role-based access control (RBAC).

## Features

- **User Registration**: Create new user accounts with email/password
- **User Login**: Authenticate users and issue JWT tokens
- **Password Security**: Bcrypt hashing with salt rounds for secure password storage
- **JWT Authentication**: Stateless authentication using JSON Web Tokens
- **Role-Based Access Control**: Support for ADMIN, MANAGER, EMPLOYEE, INTERN roles
- **Profile Management**: Get authenticated user profile information
- **Hierarchical Structure**: Support for parent-child relationships in user hierarchy

## API Endpoints

### POST /auth/register
Register a new user account.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com", 
  "password": "securepassword123",
  "role": "EMPLOYEE", // optional, defaults to EMPLOYEE
  "parentId": 1 // optional, for hierarchy
}
```

**Response:**
```json
{
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "role": "EMPLOYEE",
    "isActive": true,
    "lastLoginAt": "2025-01-01T10:00:00.000Z",
    "parentId": null,
    "createdAt": "2025-01-01T10:00:00.000Z",
    "updatedAt": "2025-01-01T10:00:00.000Z"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### POST /auth/login
Login with email and password.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "securepassword123"
}
```

**Response:** Same as registration response.

### GET /auth/profile
Get the authenticated user's profile (requires JWT token).

**Headers:** 
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "id": 1,
  "name": "John Doe",
  "email": "john@example.com",
  "role": "EMPLOYEE",
  "isActive": true,
  "lastLoginAt": "2025-01-01T10:00:00.000Z",
  "parentId": null,
  "createdAt": "2025-01-01T10:00:00.000Z",
  "updatedAt": "2025-01-01T10:00:00.000Z"
}
```

### POST /auth/logout
Logout (JWT tokens are handled client-side).

**Headers:** 
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "message": "Logged out successfully"
}
```

## Usage in Other Modules

### Protecting Routes

```typescript
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('protected')
export class ProtectedController {
  @Get()
  @UseGuards(JwtAuthGuard)
  getProtectedData(@Request() req) {
    // req.user contains the authenticated user
    return req.user;
  }
}
```

### Role-Based Protection

```typescript
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums';

@Controller('admin')
export class AdminController {
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  getAdminData() {
    // Only ADMIN and MANAGER roles can access
    return { message: 'Admin data' };
  }
}
```

## Environment Variables

Make sure to set these environment variables:

```bash
JWT_SECRET="your-super-secure-jwt-secret-key"
JWT_EXPIRES_IN="24h"
DATABASE_URL="postgresql://username:password@localhost:5432/orgnet_db"
```

## Database Setup

The module requires the User model in your Prisma schema. Make sure to run:

```bash
npx prisma generate --schema=../database/schema.prisma
npx prisma migrate dev --schema=../database/schema.prisma
```

## Error Handling

The module includes comprehensive error handling:

- **ConflictException**: When trying to register with an existing email
- **UnauthorizedException**: For invalid credentials or inactive accounts
- **BadRequestException**: For validation errors or invalid parent relationships
- **ForbiddenException**: For insufficient role permissions

## Security Features

- **Password Hashing**: Uses bcrypt with 12 salt rounds
- **JWT Expiration**: Tokens expire after 24 hours (configurable)
- **Input Validation**: All DTOs include validation decorators
- **SQL Injection Protection**: Prisma ORM provides built-in protection
- **CORS Protection**: Configurable CORS settings for frontend integration