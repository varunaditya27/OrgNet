export const API_ENDPOINTS = {
  auth: {
    login: '/auth/login',
    register: '/auth/register',
    profile: '/auth/profile',
    forgotPassword: '/auth/forgot-password',
    refresh: '/auth/refresh',
    logout: '/auth/logout',
  },
  users: {
    base: '/users',
    profile: (id: number | string) => `/users/${id}`,
    hierarchy: (id: number | string) => `/users/${id}/hierarchy`,
    teams: (id: number | string) => `/users/${id}/teams`,
  },
  teams: {
    base: '/teams',
    detail: (id: number | string) => `/teams/${id}`,
    members: (id: number | string) => `/teams/${id}/members`,
    managed: '/teams/managed/my-teams',
  },
  messaging: {
    send: '/messaging/send',
    conversations: '/messaging/conversations',
    messages: '/messaging/messages',
    groups: '/messaging/groups',
  },
  files: {
    base: '/files',
    upload: '/files/upload',
    detail: (id: number | string) => `/files/${id}`,
    download: (id: number | string) => `/files/${id}/download`,
    adminAll: '/files/admin/all',
  },
  admin: {
    users: '/admin/users',
    teams: '/admin/teams',
    auditLogs: '/admin/audit-logs',
    stats: '/admin/stats',
    override: '/admin/override',
  },
} as const
