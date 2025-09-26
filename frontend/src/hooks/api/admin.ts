import { useQuery } from '@tanstack/react-query'

import {
  fetchAllTeams,
  fetchAllUsers,
  fetchAuditLogs,
  fetchSystemStats,
} from '@/api/admin'
import type { AuditLogQueryParams } from '@/api/admin'

const ADMIN_QUERY_KEYS = {
  stats: ['admin', 'stats'] as const,
  auditLogs: (params: AuditLogQueryParams) => ['admin', 'audit-logs', params] as const,
  users: ['admin', 'users'] as const,
  teams: ['admin', 'teams'] as const,
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

export const useAdminUsersQuery = () =>
  useQuery({
    queryKey: ADMIN_QUERY_KEYS.users,
    queryFn: fetchAllUsers,
    staleTime: 1000 * 60 * 5,
  })

export const useAdminTeamsQuery = () =>
  useQuery({
    queryKey: ADMIN_QUERY_KEYS.teams,
    queryFn: fetchAllTeams,
    staleTime: 1000 * 60 * 5,
  })
