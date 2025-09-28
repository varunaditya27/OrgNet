import { useQuery } from '@tanstack/react-query'

import {
  fetchAllTeams,
  fetchAllUsers,
  fetchAuditLogs,
  fetchSystemStats,
} from '@/api/admin'
import type {
  AdminTeamQueryParams,
  AdminUserQueryParams,
  AuditLogQueryParams,
} from '@/api/admin'

const ADMIN_QUERY_KEYS = {
  stats: ['admin', 'stats'] as const,
  auditLogs: (params: AuditLogQueryParams) => ['admin', 'audit-logs', params] as const,
  users: (params: AdminUserQueryParams) => ['admin', 'users', params] as const,
  teams: (params: AdminTeamQueryParams) => ['admin', 'teams', params] as const,
}

export const useSystemStatsQuery = () =>
  useQuery({
    queryKey: ADMIN_QUERY_KEYS.stats,
    queryFn: fetchSystemStats,
    staleTime: 1000 * 60,
  })

export const useAuditLogsQuery = (params: AuditLogQueryParams) =>
  useQuery({
    queryKey: ADMIN_QUERY_KEYS.auditLogs(params),
    queryFn: () => fetchAuditLogs(params),
    placeholderData: (previous) => previous,
  })

export const useAdminUsersQuery = (params?: AdminUserQueryParams) => {
  const queryParams: AdminUserQueryParams = {
    limit: 100,
    ...params,
  }

  return useQuery({
    queryKey: ADMIN_QUERY_KEYS.users(queryParams),
    queryFn: () => fetchAllUsers(queryParams),
    staleTime: 1000 * 60 * 5,
  })
}

export const useAdminTeamsQuery = (params?: AdminTeamQueryParams) => {
  const queryParams: AdminTeamQueryParams = {
    limit: 100,
    ...params,
  }

  return useQuery({
    queryKey: ADMIN_QUERY_KEYS.teams(queryParams),
    queryFn: () => fetchAllTeams(queryParams),
    staleTime: 1000 * 60 * 5,
  })
}
