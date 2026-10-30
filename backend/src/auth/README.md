# Authentication Module

This module provides JWT-based authentication for the OrgNet application with role-based access control (RBAC).

## Features

- **User Registration**: Public sign-up creates a root-level EMPLOYEE account
- **Password Reset**: Emailed single-use link, valid for 1 hour
- **User Login**: Authenticate users and issue JWT tokens
- **Password Security**: Bcrypt hashing with salt rounds for secure password storage
- **JWT Authentication**: Stateless authentication using JSON Web Tokens
- **Role-Based Access Control**: Support for ADMIN, MANAGER, EMPLOYEE, INTERN roles
- **Profile Management**: Get authenticated user profile information
- **Hierarchical Structure**: Roles and reporting lines are assigned by admins and managers (see the Users module)

## API Endpoints

### POST /auth/register
Register a new user account. Public sign-up always creates a root-level `EMPLOYEE`; a request that includes `role` or `parentId` is rejected with 400. Admins and managers create other roles through `POST /users`, and the first admin comes from `npm run seed`.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepassword123"
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

### POST /auth/forgot-password
Request a password-reset email.

**Request Body:**
```json
{ "email": "john@example.com" }
```

**Response (200, identical whether or not the email has an account):**
```json
{ "message": "If an account exists for that email, a reset link has been sent." }
```

If the account exists and is active, a one-time token is generated and emailed as `FRONTEND_URL/reset-password?token=...`. Requesting again invalidates the earlier link. The email is sent in the background, so a slow or failing mail server never changes the response; failures are logged.

### POST /auth/reset-password
Set a new password using the emailed token.

**Request Body:**
```json
{ "token": "<token from the email>", "password": "newsecurepassword123" }
```

**Response (200):** `{ "message": "Your password has been reset. You can now sign in." }`

Returns 400 if the token is unknown, already used, expired, or the account is inactive. Login tokens issued before the reset stay valid until they expire.

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
JWT_SECRET="your-super-secure-jwt-secret-key"   # required; the server will not start without it
JWT_EXPIRES_IN="24h"
DATABASE_URL="postgresql://username:password@localhost:5432/orgnet_db"
FRONTEND_URL="http://localhost:5173"            # used in password-reset links
SMTP_HOST="localhost"                           # plus SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM
```

The full list, including mail settings, is in the [backend README](../../README.md).

## Database Setup

The module uses the `User` and `PasswordResetToken` models in `prisma/schema.prisma`. From `backend/`:

```bash
npx prisma generate
npx prisma migrate dev
npm run seed   # creates the first admin from ADMIN_EMAIL / ADMIN_PASSWORD
```

## Error Handling

The module includes comprehensive error handling:

- **ConflictException**: When trying to register with an existing email
- **UnauthorizedException**: For invalid credentials or inactive accounts
- **BadRequestException**: For validation errors (including unknown fields) or an invalid, used, or expired reset token
- **ForbiddenException**: For insufficient role permissions

## Security Features

- **Password Hashing**: Uses bcrypt with 12 salt rounds
- **JWT Expiration**: Tokens expire after 24 hours (configurable)
- **Reset Tokens**: 32 random bytes, stored only as a SHA-256 hash, single-use, 1-hour expiry; claiming a token is atomic so two simultaneous uses cannot both succeed
- **No Account Enumeration**: `/auth/forgot-password` answers identically for known and unknown emails
- **Input Validation**: All DTOs include validation decorators
- **SQL Injection Protection**: Prisma ORM provides built-in protection
- **CORS Protection**: Configurable CORS settings for frontend integration