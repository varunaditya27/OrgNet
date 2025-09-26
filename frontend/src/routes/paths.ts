export const ROUTES = {
  auth: {
    login: '/login',
    register: '/register',
    forgotPassword: '/forgot-password',
  },
  dashboard: {
    home: '/dashboard',
    users: '/dashboard/users',
    teams: '/dashboard/teams',
    messaging: '/dashboard/messaging',
    files: '/dashboard/files',
    admin: '/dashboard/admin',
    auditLogs: '/dashboard/admin/audit-logs',
    settings: '/dashboard/settings',
  },
  notFound: '*',
} as const

type Values<T> = T extends Record<string, infer V> ? V : never

type RouteTreeValues = Values<typeof ROUTES>

type RouteValue = RouteTreeValues extends string
  ? RouteTreeValues
  : RouteTreeValues extends Record<string, unknown>
    ? Values<RouteTreeValues>
    : never

export type AppRoute = RouteValue
