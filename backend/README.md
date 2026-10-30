
# 🏢 OrgNet Backend

OrgNet Backend is a secure, modular server-side platform for organizational communication and collaboration. Built with **NestJS**, **TypeScript**, **PostgreSQL**, **Prisma**, and **Socket.IO**, it enforces a **tree-based RBAC (Role-Based Access Control)** system across all modules.

---

## 🚀 Features at a Glance

- **Authentication**: JWT login, registration, and email-based password reset
- **User Management**: CRUD, parent-child hierarchy, role assignment (admin-only), soft delete
- **Teams**: Team creation, management, membership, and hierarchy enforcement
- **Messaging**: One-to-one, group, and real-time messaging (WebSockets) with RBAC
- **Files**: Upload/download through any S3-compatible storage, role-based visibility, soft delete
- **Admin**: Audit logging, system stats, organization-wide management
- **RBAC Guards & Decorators**: Tree-based, resource, and communication guards
- **Docker**: A Dockerfile and a Compose bundle at the repository root (see the root README)

---

## 📦 Tech Stack

- **Framework:** NestJS (TypeScript)
- **ORM:** Prisma 6 with PostgreSQL
- **Real-time:** Socket.IO
- **File storage:** any S3-compatible service (Cloudflare R2, SeaweedFS in the Compose bundle, others)
- **Email:** Nodemailer over SMTP (Mailpit catches mail in the Compose bundle)
- **Authentication:** JWT + bcrypt
- **Node.js:** 20 or newer

---

## 📚 Modules Overview

### 🔑 Authentication ([README](./src/auth/README.md))
- Registration always creates a root-level EMPLOYEE; roles and reporting lines are assigned by admins and managers
- Login, profile, logout
- Password reset by emailed one-time link

### 👤 Users ([README](./src/users/README.md))
- CRUD, soft delete (deactivation)
- Role, reporting line and status changes are admin-only
- Managers may create only EMPLOYEE and INTERN accounts

### 🏢 Teams ([README](./src/teams/README.md))
- Team creation and management (manager/admin only)
- Add/remove members with hierarchy validation

### 💬 Messaging ([README](./src/messaging/README.md), [WebSocket spec](./src/messaging/WEBSOCKET_README.md))
- One-to-one and group messaging (REST and WebSocket)
- Message history, deletion, group and member management

### 📁 Files ([README](./src/files/README.md))
- Upload, list, search, pre-signed download links, soft delete
- Visibility follows `allowedRole`; search can narrow results but never widens them

### 🛡️ Admin ([README](./src/admin/README.md))
- User/team management, hierarchy restructuring, bulk operations
- Audit logs of admin actions and system statistics

---

## 🛡️ RBAC & Security

- **Tree-Based RBAC**: hierarchical access enforced in controllers, services and the WebSocket gateway ([details](./src/common/RBAC_README.md))
- **Privilege rules**: only admins can create ADMIN/MANAGER accounts or change a user's role, reporting line or active status
- **Soft delete**: users and files are deactivated, not removed
- **Input validation**: global `ValidationPipe` with `whitelist` and `forbidNonWhitelisted`, so unknown fields are rejected
- **Password reset**: tokens are random, stored only as SHA-256 hashes, single-use, and expire after 1 hour; the endpoint answers identically for known and unknown emails
- **Secrets**: the server refuses to start without `JWT_SECRET`

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

- **Socket.IO** namespace: `/messaging` (for example `ws://localhost:3000/messaging`)
- A valid JWT is required to connect; the allowed browser origin is `FRONTEND_URL`
- Send, receive, typing indicators, read receipts and presence are all RBAC-protected

---

## 📁 Folder Structure

```
backend/
├─ src/
│  ├─ auth/          # JWT login, registration, password reset
│  ├─ users/         # User management (CRUD, hierarchy, RBAC)
│  ├─ teams/         # Team management
│  ├─ messaging/     # REST + WebSocket messaging, groups
│  ├─ files/         # S3-compatible upload/download
│  ├─ mail/          # SMTP mail sending (Nodemailer)
│  ├─ admin/         # Admin tools, audit, stats
│  ├─ common/        # Shared guards, decorators, enums, types
│  ├─ main.ts        # Entry point
│  └─ app.module.ts  # Root module
├─ prisma/
│  ├─ schema.prisma  # Database schema
│  ├─ migrations/    # SQL migrations (commit these)
│  └─ seed.ts        # Creates the first admin
├─ Dockerfile
├─ docker-entrypoint.sh  # migrate, seed, start
└─ package.json
```

---

## 🛠️ Getting Started

1. **Install dependencies**
   ```bash
   cd backend
   npm install
   ```
2. **Configure environment variables**: copy `.env.example` to `.env` and fill it in (see the table below). `DATABASE_URL`, `DIRECT_URL` and `JWT_SECRET` are required.
3. **Set up the database**
   ```bash
   npx prisma generate
   npx prisma migrate dev
   ```
4. **Create the first admin** (set `ADMIN_EMAIL` and `ADMIN_PASSWORD` first; safe to run again)
   ```bash
   npm run seed
   ```
5. **Start the development server**
   ```bash
   npm run start:dev
   ```
   The API listens on `http://localhost:3000` unless `PORT` is set.

---

## ⚙️ Environment Variables

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL`, `DIRECT_URL` | yes | PostgreSQL connection (the direct URL is used for migrations) |
| `JWT_SECRET` | yes | Signs login tokens; the server will not start without it |
| `JWT_EXPIRES_IN` | no | Token lifetime (default `24h`) |
| `PORT` | no | Listening port (default `3000`) |
| `FRONTEND_URL` | no | Browser origin allowed by CORS and used in reset links (default `http://localhost:5173`) |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME` | for `npm run seed` | The first admin account |
| `R2_ENDPOINT`, `R2_REGION`, `R2_BUCKET_NAME`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` | for files | S3-compatible storage (the names say R2, but any S3 API works) |
| `R2_PUBLIC_ENDPOINT` | no | Address used to sign download links when browsers reach storage by a different address than the server (Docker) |
| `R2_FORCE_PATH_STYLE` | no | `true` for S3 servers that need path-style URLs (SeaweedFS, most local servers) |
| `MAX_FILE_SIZE`, `ALLOWED_FILE_TYPES` | no | Upload limits (default 10 MB, all types) |
| `SMTP_HOST`, `SMTP_PORT` | for email | Mail server (default `localhost:587`) |
| `SMTP_USER`, `SMTP_PASS` | no | SMTP login for relays |
| `SMTP_SECURE`, `SMTP_IGNORE_TLS` | no | `SMTP_SECURE=true` for implicit TLS (port 465); `SMTP_IGNORE_TLS=true` to skip STARTTLS on trusted networks |
| `MAIL_FROM` | no | Sender shown on emails, for example `OrgNet <noreply@example.com>` |

---

## 📖 API Endpoints Overview

| Module      | Endpoint Prefix | Key Endpoints (see module README for the full list) |
|-------------|----------------|-----------------------------------------------------|
| Auth        | /auth          | /register, /login, /profile, /logout, /forgot-password, /reset-password |
| Users       | /users         | /, /:id, /profile, /:id/hierarchy, /:id/teams       |
| Teams       | /teams         | /, /:id, /:id/members, /managed/my-teams            |
| Messaging   | /messaging     | /send, /conversations, /messages, /groups           |
| Files       | /files         | /upload, /, /:id, /:id/download, /admin/all         |
| Admin       | /admin         | /users, /teams, /audit-logs, /stats, /override      |

---

## 🧪 Development & Testing

- **Unit tests**: `npm run test` (the e2e suite, `npm run test:e2e`, needs a running database)
- **Lint**: `npm run lint` (auto-fixes; the codebase currently reports no problems)
- **Format**: `npm run format`
- **Migrations**: `npx prisma migrate dev --name <description>`
- **API docs**: controllers carry Swagger decorators, but no Swagger UI is mounted

---

## 🔮 Roadmap / Future Enhancements

- Rate limiting on public endpoints such as `/auth/forgot-password`
- Invalidating login tokens after a password reset
- End-to-end encryption for messaging
- Persisted read receipts and unread counts

---

## 🤝 Contributing

- Follow NestJS and TypeScript best practices
- Ensure new features respect RBAC and hierarchy
- Write tests for new behaviour and keep `npm run lint` clean

---

## 📜 License

OrgNet Backend is licensed under the MIT License.
