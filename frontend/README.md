# OrgNet Frontend

Enterprise-grade collaboration portal for OrgNet built with React, TypeScript, and Vite. The application delivers secure role-based access, real-time messaging, rich analytics, and modern UX patterns that mirror the production NestJS backend.

## ✨ Highlights

- **Zero-trust RBAC:** Strict route guards, menu gating, and API enforcement for `ADMIN`, `MANAGER`, `EMPLOYEE`, and `INTERN` roles.
- **Live collaboration:** Socket.IO-powered messaging with typing indicators, read receipts, online presence, and graceful HTTP fallback.
- **Modern UI toolkit:** Tailwind CSS + shadcn-inspired primitives, Command Palette, Radix UI, and lucide-react icons.
- **Data layer excellence:** Axios client with interceptors, React Query caching, optimistic updates, and auto-refetch on socket events.
- **State management strategy:** Zustand for auth/session, custom stores for realtime metadata, and co-located React Query hooks per domain.
- **Production discipline:** Strict ESLint/TypeScript configs, Vite build, SPA routing, dark-mode theming, and CI-friendly commands.

## 🏗 Architecture Overview

```
frontend/
├─ public/              Static assets served by Vite
├─ src/
│  ├─ api/              Axios instance + REST abstractions per module
│  ├─ components/       shadcn-style UI primitives + layout shells
│  ├─ contexts/         Shared React contexts (e.g., messaging realtime)
│  ├─ hooks/            React Query hooks, auth helpers, realtime hooks
│  ├─ layouts/          Auth and application layout scaffolding
│  ├─ pages/            Feature modules (auth, dashboard, messaging, etc.)
│  ├─ routes/           Route definitions, protected route wrappers
│  ├─ store/            Zustand stores (auth session, realtime state)
│  ├─ types/            Shared TypeScript models mirrored from backend
│  └─ utils/            Helpers (API base URL, error formatting, RBAC)
└─ vite.config.ts       Path aliases, Tailwind, React plugin configuration
```

Key architectural decisions:

- **Single source of truth:** REST + React Query for persistence, Socket.IO for push updates, all reconciled via cache invalidation.
- **Role awareness everywhere:** Navigation tree, routes, and feature pages consume the same RBAC utilities to avoid drift.
- **Composable UI:** Design tokens and utility classes ensure consistent theming and easy shadcn-style extension.

## 🚀 Getting Started

### Prerequisites

- Node.js ≥ 20 (LTS recommended)
- npm ≥ 10
- Running OrgNet backend (NestJS) or accessible API endpoint

### Installation

```powershell
git clone https://github.com/varunaditya27/OrgNet.git
cd OrgNet/frontend
npm install
```

### Environment Variables

Create a `.env` file (or `.env.local`) at the project root:

```ini
VITE_API_BASE_URL=http://localhost:3000
```

| Variable             | Description                                                | Default                  |
|----------------------|------------------------------------------------------------|--------------------------|
| `VITE_API_BASE_URL` | Base URL for REST API and Socket.IO namespace `/messaging` | `http://localhost:3000` |

### NPM Scripts

| Command           | Description                                               |
|-------------------|-----------------------------------------------------------|
| `npm run dev`     | Start Vite dev server with HMR                            |
| `npm run build`   | Type-check (`tsc -b`) + production Vite build             |
| `npm run preview` | Serve the production build locally                        |
| `npm run lint`    | Run ESLint with the project configuration                 |

## 🔐 Role-Based Access Control

- Central `src/utils/roles.ts` exposes role constants, labels, and inference helpers.
- `ProtectedRoute` guards ensure users must be authenticated and authorized before mounting feature routes.
- Navigation and layout providers consume the same RBAC policy, ensuring no orphaned links or orphaned APIs.
- Backend JWT token is persisted securely via the auth store; refresh token logic can be layered in without refactoring consumers.

## 💬 Real-Time Messaging

- Socket.IO client connects to `${VITE_API_BASE_URL}/messaging` using JWT auth.
- Features include:
  - Conversation refresh on new messages (REST + socket invalidation)
  - Typing indicators with auto-expiry to prevent ghost states
  - Online presence list and delta updates per user
  - Read receipts and automatic unread counter refresh
  - Graceful fallback to REST API when websocket is unavailable
- All realtime state is centralized in `src/store/messaging-store.ts` and surfaced through `MessagingProvider` + `useMessaging`.

## 📊 Feature Modules

- **Dashboard:** Overview cards, KPI grid, organizational insights.
- **Users:** Directory, filters, hierarchy view, RBAC-aware bulk actions.
- **Teams:** Creation dialogs, membership management, manager filtering.
- **Messaging:** Real-time chat hub with presence, search, conversation filters.
- **Files:** Secure document workspace with RBAC-based access rules.
- **Admin & Audit:** Elevated tooling for overrides, audits, and compliance logs.

Each page is built with consistent patterns: skeleton states, empty states, optimistic toasts, and error boundaries.

## 🧰 Tech Stack

- **Core:** React 19, TypeScript, Vite
- **Styling:** Tailwind CSS, tailwind-merge, tailwindcss-animate
- **UI Toolkit:** Radix UI, shadcn-inspired components, lucide-react icons, cmdk command menu
- **Data Layer:** Axios, React Query, Socket.IO client, Zod validation
- **State Management:** Zustand stores for auth + realtime
- **Notifications:** Sonner toast system with rich colors

## ✅ Quality Gates

- **Type safety:** `npm run build` runs `tsc -b` before bundling.
- **Linting:** Strict ESLint config with React Refresh-friendly exports.
- **Bundle insights:** Vite build emits chunk size warnings to guide code-splitting.

Recommended CI steps:

```powershell
npm ci
npm run lint
npm run build
```

## 📦 Deployment Notes

- `npm run build` outputs static assets in `dist/` ready for any CDN or static host.
- Ensure backend is reachable from the deployed URL (configure CORS + Socket.IO origins).
- Set `VITE_API_BASE_URL` at build time (Netlify/Vercel environment variables, Docker ARG, etc.).
- For self-hosted environments, serve `dist/` via Nginx or the NestJS static assets module.

## 🛠 Troubleshooting

| Symptom                                   | Resolution                                                                 |
|-------------------------------------------|-----------------------------------------------------------------------------
| Socket connection fails                   | Verify JWT validity, CORS for `/messaging`, and matching `VITE_API_BASE_URL` |
| Realtime works locally but not in prod    | Ensure reverse proxy supports WebSocket upgrade (`Connection: Upgrade`)     |
| RBAC denies expected access               | Confirm user role payload from `/auth/profile` matches frontend enums        |
| Styles missing after deploy               | Ensure Tailwind classes aren’t purged—use provided config without pruning    |

## 🤝 Contributing

1. Fork and clone the repository
2. Create a feature branch `git checkout -b feat/my-enhancement`
3. Run `npm run lint` + `npm run build` before pushing
4. Open a pull request against the `backend-setup` branch

## 📚 Further Reading

- Backend realtime spec: `backend/src/messaging/WEBSOCKET_README.md`
- shadcn/ui patterns: https://ui.shadcn.com
- React Query docs: https://tanstack.com/query/latest

---

Built with ❤️ by the OrgNet team to power secure, real-time organizational collaboration.
