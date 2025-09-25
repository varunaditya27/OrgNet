
# 🏢 OrgNet Backend

OrgNet Backend is a secure, modular, and scalable server-side platform for organizational communication and collaboration. Built with **NestJS**, **TypeScript**, **PostgreSQL**, **Prisma**, and **WebSockets**, it enforces a strict **tree-based RBAC (Role-Based Access Control)** system across all modules.

---

## 🚀 Features at a Glance

- **Authentication & RBAC**: JWT authentication, role-based and hierarchy-based access, secure password hashing
- **User Management**: Full CRUD, parent-child hierarchy, role assignment, soft delete, team integration
- **Teams**: Team creation, management, membership, and hierarchy enforcement
- **Messaging**: One-to-one, group, and real-time messaging (WebSockets) with RBAC
- **Files**: Secure upload/download, S3-compatible storage, RBAC on files, metadata, and soft delete
- **Admin**: Admin override, audit logging, system stats, organization-wide management
- **Audit Logging**: All admin and override actions are logged for compliance
- **RBAC Guards & Decorators**: Tree-based, resource, and communication guards for all modules
- **Scalability**: Modular architecture, Docker-ready, real-time via WebSockets

---

## 📦 Tech Stack

- **Backend Framework:** NestJS (TypeScript)
- **ORM:** Prisma
- **Database:** PostgreSQL
- **Real-Time Messaging:** WebSockets (Socket.IO)
- **File Storage:** S3-compatible (Cloudflare R2 or local)
- **Authentication:** JWT + bcrypt
- **RBAC:** Tree-based, enforced via custom guards
- **Deployment:** Docker, Kubernetes-ready

---

## 📚 Modules Overview

### 🔑 Authentication
- JWT-based registration, login, and profile
- Password hashing (bcrypt)
- Role assignment (ADMIN, MANAGER, EMPLOYEE, INTERN)
- Hierarchical parent-child relationships

### 👤 Users
- CRUD operations, soft delete (deactivation)
- Hierarchical RBAC: parent, subordinates, superior, peers
- Team membership and management
- Password change, pagination, and validation

### 🏢 Teams
- Team creation and management (manager/admin only)
- Add/remove members with hierarchy validation
- Team discovery, search, and filtering
- Manager assignment and member tracking

### 💬 Messaging
- One-to-one and group messaging (REST & WebSocket)
- Message history, deletion, and threading
- Group creation, member management, and info
- RBAC: Only authorized users can message or join groups

### 📁 Files
- Secure upload/download, S3-compatible storage
- RBAC on file access (`allowedRole` field)
- File metadata, pre-signed URLs, soft delete
- Admin override for file management

### 🛡️ Admin
- Admin override of RBAC for all modules
- User/team management, hierarchy restructuring
- Bulk operations, audit logging, system statistics
- Comprehensive audit trail for all admin actions

---

## 🛡️ RBAC & Security

- **Tree-Based RBAC**: Hierarchical access enforced everywhere
- **Guards**: TreeBasedRBACGuard, CommunicationGuard, ResourceAccessGuard, AdminGuard, AdminOverrideGuard
- **Decorators**: @Roles, @RequireHierarchyAccess, @RequireResourceAccess, @RequireCommunicationPermission, and more
- **Audit Logging**: All admin/override actions are logged with metadata, IP, and user agent
- **Soft Delete**: Users and files are deactivated, not hard deleted (except by admin)
- **Input Validation**: DTOs with class-validator
- **SQL Injection Protection**: Prisma ORM

### RBAC Hierarchy
```
ADMIN (Full Access)
├── MANAGER (Team + Subordinate Access)
│   ├── EMPLOYEE (Peer + Superior Access)
│   │   └── INTERN (Self Access Only)
│   └── INTERN (Self Access Only)
└── EMPLOYEE (Peer + Superior Access)
    └── INTERN (Self Access Only)
```

---

## 🔌 Real-Time Messaging (WebSockets)

- **Socket.IO** endpoint: `ws://localhost:3000/messaging`
- JWT authentication required for all connections
- All WebSocket events (send, receive, typing, read receipts, presence) are RBAC-protected
- Room management, presence, and typing indicators
- Error handling and automatic cleanup on disconnect

---

## 📁 Folder Structure

```
backend/
├─ src/
│  ├─ auth/          # Authentication (JWT, login, registration)
│  ├─ users/         # User management (CRUD, hierarchy, RBAC)
│  ├─ teams/         # Team management (creation, membership, RBAC)
│  ├─ messaging/     # Messaging (REST, WebSocket, groups)
│  ├─ files/         # File upload/download (S3, RBAC)
│  ├─ admin/         # Admin (override, audit, stats)
│  ├─ common/        # Shared guards, decorators, enums, utils
│  ├─ main.ts        # Entry point
│  └─ app.module.ts  # Root module
├─ prisma/
│  └─ schema.prisma   # Database schema
├─ .env               # Environment variables
├─ package.json
└─ README.md
```

---

## 🛠️ Getting Started

1. **Install dependencies**
   ```bash
   cd backend
   npm install
   ```
2. **Configure environment variables**
   ```bash
   # .env example
   DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/orgnet
   JWT_SECRET=your_jwt_secret_key
   # (Add S3/R2 config for files if needed)
   ```
3. **Setup Prisma**
   ```bash
   npx prisma generate
   npx prisma migrate dev --name init
   ```
4. **Seed database (optional)**
   ```bash
   npx ts-node prisma/seed.ts
   ```
5. **Start development server**
   ```bash
   npm run start:dev
   ```
   The backend should now be running at `http://localhost:3000`.

---

## 📖 API Endpoints Overview

| Module      | Endpoint Prefix | Key Endpoints (see module README for full list) |
|-------------|----------------|-------------------------------------------------|
| Auth        | /auth          | /register, /login, /profile, /logout            |
| Users       | /users         | /, /:id, /profile, /:id/hierarchy, /:id/teams   |
| Teams       | /teams         | /, /:id, /:id/members, /managed/my-teams        |
| Messaging   | /messaging     | /send, /conversations, /messages, /groups       |
| Files       | /files         | /upload, /, /:id, /:id/download, /admin/all     |
| Admin       | /admin         | /users, /teams, /audit-logs, /stats, /override  |

---

## 🧪 Development & Testing

- **Unit & E2E Tests**: `npm run test`, `npm run test:e2e`
- **Swagger API Docs**: Available at `/api` (if enabled)
- **Database Migrations**: `npx prisma migrate dev --name <desc>`
- **Linting**: `npm run lint`
- **Format**: `npm run format`

---

## 🛡️ Best Practices & Security

- Use RBAC guards and decorators for all endpoints
- Always validate input with DTOs
- Use soft delete for users/files unless admin override
- Regularly review audit logs for suspicious activity
- Use strong JWT secrets and secure environment variables
- Monitor system statistics for performance and security

---

## 🔮 Roadmap / Future Enhancements

- End-to-end encryption (Signal Protocol) for messaging
- Advanced admin dashboards and analytics
- Voice/video chat integration
- Plugin system for internal tools (HR, polls, attendance)

---

## 🤝 Contributing

- Follow NestJS and TypeScript best practices
- Ensure all new features respect RBAC and hierarchy
- Write unit and e2e tests for all modules

---

## 📜 License

OrgNet Backend is licensed under the MIT License.

---

## 🔧 Getting Started

### 1. Install dependencies

```bash
cd backend
npm install
```

### 2. Configure environment variables

```bash
# .env example
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/orgnet
JWT_SECRET=your_jwt_secret_key
```

### 3. Setup Prisma

```bash
npx prisma generate
npx prisma migrate dev --name init
```

### 4. Seed database (optional)

```bash
npx ts-node prisma/seed.ts
```

### 5. Start development server

```bash
npm run start:dev
```

The backend should now be running at `http://localhost:3000`.

---

## 🛠️ RBAC Enforcement Notes

* Use **Guards** to enforce tree-based RBAC at controller routes.
* Guards should check:

  * User role.
  * Parent/subordinate relationships.
  * Team membership.
* Ensure all modules (Messaging, Files, Teams) utilize these guards.

---

## 🔮 Roadmap / Future Enhancements

* End-to-end encryption (Signal Protocol) for production-ready messaging.
* Advanced audit logging and monitoring.
* Admin dashboards with analytics.
* Voice/Video chat integration.
* Plugin system for internal tools (HR, polls, attendance).

---

## 🤝 Contributing

* Follow NestJS best practices.
* Ensure all new features respect RBAC and hierarchy.
* Use TypeScript strict typing.
* Write unit and e2e tests for all modules.

---

## 📜 License

OrgNet Backend is licensed under the MIT License.
