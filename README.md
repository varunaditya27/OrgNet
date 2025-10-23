<div align="center">

# 🌐 OrgNet: Enterprise Collaboration Platform

</div>

OrgNet is a world-class, enterprise-grade collaboration suite for modern organizations. It unites a robust, RBAC-enforced backend (NestJS, PostgreSQL, Prisma) with a production-ready, real-time React frontend (Vite, Zustand, React Query, Tailwind CSS). OrgNet empowers teams with secure communication, dynamic team management, file sharing, and compliance—delivering a seamless, delightful experience for both users and developers.

---


## 🚀 Key Features

- **🔐 Zero-Trust RBAC**: Tree-based, hierarchical role-based access control (ADMIN, MANAGER, EMPLOYEE, INTERN) enforced everywhere—API, WebSocket, UI, and files.
- **💬 Real-Time Messaging**: Socket.IO-powered chat with typing indicators, read receipts, presence, and seamless REST fallback.
- **🧩 Modular Architecture**: Clean separation of concerns—auth, users, teams, messaging, files, admin, audit—all as independent, composable modules.
- **🕵️‍♂️ Audit & Compliance**: Every admin/override action is logged with metadata, IP, and user agent for full traceability and compliance.
- **✨ Modern UI/UX**: shadcn-inspired primitives, dark mode, command palette, and responsive layouts for a delightful user experience.
- **🛠️ Production Discipline**: Strict TypeScript, ESLint, CI-friendly scripts, and Docker/Kubernetes-ready deployment.
- **🛡️ Scalable & Secure**: JWT authentication, S3-compatible file storage, input validation, SQL injection protection, soft delete, and more.

---


---

## 🏗️ Monorepo Structure

```
OrgNet/
├─ backend/    # NestJS API, RBAC, WebSocket, Prisma, PostgreSQL
│  ├─ src/
│  │  ├─ auth/        # Authentication & RBAC
│  │  ├─ users/       # User management & hierarchy
│  │  ├─ teams/       # Team management
│  │  ├─ messaging/   # Real-time & REST messaging
│  │  ├─ files/       # Secure file storage
│  │  ├─ admin/       # Admin override, audit, stats
│  │  ├─ common/      # Guards, decorators, enums
│  │  └─ ...
│  ├─ prisma/         # Database schema
│  └─ ...
├─ frontend/   # React 19 SPA, Vite, Zustand, shadcn, Socket.IO
│  ├─ src/
│  │  ├─ api/         # Axios + REST abstractions
│  │  ├─ components/  # UI primitives, layout
│  │  ├─ hooks/       # React Query, auth, realtime
│  │  ├─ pages/       # Feature modules
│  │  ├─ store/       # Zustand stores
│  │  └─ ...
│  └─ ...
└─ README.md   # (You are here)
```

---


---

## 🛡️ RBAC & Security Philosophy

- **Tree-Based RBAC**: Hierarchical access enforced at every layer (API, WebSocket, UI)
- **Custom Guards & Decorators**: Fine-grained, reusable access control for every scenario
- **Soft Delete**: Users/files are deactivated, not hard deleted (except by admin)
- **Comprehensive Audit Logging**: All admin/override actions are logged for compliance and traceability
- **Input Validation**: DTOs with class-validator (backend), Zod (frontend)
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


---

## 🧰 Tech Stack

- **Backend:** NestJS (TypeScript), Prisma, PostgreSQL, Socket.IO, S3-compatible storage
- **Frontend:** React 19, Vite, Zustand, React Query, Tailwind CSS, shadcn/ui, Radix UI, Socket.IO client
- **DevOps:** Docker, Kubernetes-ready, CI-friendly scripts

---


---

## ⚡ Quickstart

### 1. Clone & Install
```bash
# Clone the repo
$ git clone https://github.com/varunaditya27/OrgNet.git
$ cd OrgNet

# Install backend dependencies
$ cd backend
$ npm install

# Install frontend dependencies
$ cd ../frontend
$ npm install
```

### 2. Environment Setup
- Copy `.env.example` to `.env` in both `backend/` and `frontend/`.
- Set required variables (see module READMEs for details).

### 3. Database & Prisma
```bash
# In backend/
$ npx prisma generate
$ npx prisma migrate dev
```

### 4. Run Development Servers
```bash
# Start backend (http://localhost:3000)
$ cd backend
$ npm run start:dev

# Start frontend (http://localhost:5173)
$ cd ../frontend
$ npm run dev
```

---


---

## 🧩 Core Modules

- **🔑 Authentication**: JWT login, registration, profile, RBAC guards ([auth README](./backend/src/auth/README.md))
- **👤 Users**: CRUD, hierarchy, team integration, soft delete ([users README](./backend/src/users/README.md))
- **🏢 Teams**: Team creation, membership, manager assignment, RBAC ([teams README](./backend/src/teams/README.md))
- **💬 Messaging**: One-to-one, group, real-time chat, REST + WebSocket ([messaging README](./backend/src/messaging/README.md))
- **📁 Files**: Secure upload/download, S3-compatible, RBAC ([files README](./backend/src/files/README.md))
- **🛡️ Admin**: Admin override, audit logs, stats, hierarchy management ([admin README](./backend/src/admin/README.md))

---


---

## 💬 Real-Time Messaging

- **Socket.IO** endpoint: `ws://localhost:3000/messaging`
- JWT authentication required for all connections
- Typing indicators, read receipts, presence, and room management
- All events RBAC-protected (see [WebSocket README](./backend/src/messaging/WEBSOCKET_README.md))

---


---

## 📊 Audit Logging & Compliance

- Every admin/override action is logged with full metadata
- Filterable audit logs by action, user, entity, and date
- IP address and user agent tracking for all sensitive actions

---


---

## 📚 Further Documentation

- [Backend README](./backend/README.md)
- [Frontend README](./frontend/README.md)
- [RBAC System](./backend/src/common/RBAC_README.md)
- [Auth Module](./backend/src/auth/README.md)
- [Users Module](./backend/src/users/README.md)
- [Teams Module](./backend/src/teams/README.md)
- [Messaging Module](./backend/src/messaging/README.md)
- [Files Module](./backend/src/files/README.md)
- [Admin Module](./backend/src/admin/README.md)
- [WebSocket Real-Time](./backend/src/messaging/WEBSOCKET_README.md)

---

## 🤝 Contributing

Contributions are welcome! Please open issues or pull requests for improvements, bug fixes, or new features.

---

## © License

MIT License. See [LICENSE](./LICENSE) for details.
