import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import {
  bulkUserOperation,
  checkAdminHealth,
  createAdminTeam,
  createAdminUser,
  deleteAdminTeam,
  deleteAdminUser,
  fetchAllAdminTeams,
  fetchAllAdminUsers,
  fetchAuditLogs,
  fetchSystemStats,
  getAdminUserById,
  recordAdminOverride,
  restructureHierarchy,
  updateAdminUser,
} from '@/api/admin'
import type {
  AdminCreateUserPayload,
  AdminOverridePayload,
  AdminTeamPayload,
  AdminTeamQueryParams,
  AdminUpdateUserPayload,
  AdminUserQueryParams,
  AuditLogQueryParams,
  BulkUserOperationPayload,
  HierarchyRestructurePayload,
} from '@/api/admin'
import { getErrorMessage } from '@/lib/utils'

const ADMIN_QUERY_KEYS = {
  stats: ['admin', 'stats'] as const,
  auditLogs: (params: AuditLogQueryParams) => ['admin', 'audit-logs', params] as const,
  users: (params: AdminUserQueryParams) => ['admin', 'users', params] as const,
  userDetail: (id: number | string) => ['admin', 'users', id] as const,
  teams: (params: AdminTeamQueryParams) => ['admin', 'teams', params] as const,
  health: ['admin', 'health'] as const,
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

export const useAdminUsersQuery = (params: AdminUserQueryParams = {}) =>
  useQuery({
    queryKey: ADMIN_QUERY_KEYS.users(params),
    queryFn: () => fetchAllAdminUsers(params),
    staleTime: 1000 * 60 * 5,
  })

export const useAdminUserQuery = (id: number | string) =>
  useQuery({
    queryKey: ADMIN_QUERY_KEYS.userDetail(id),
    queryFn: () => getAdminUserById(id),
    enabled: Boolean(id),
  })

export const useAdminTeamsQuery = (params: AdminTeamQueryParams = {}) =>
  useQuery({
    queryKey: ADMIN_QUERY_KEYS.teams(params),
    queryFn: () => fetchAllAdminTeams(params),
    staleTime: 1000 * 60 * 5,
  })

export const useAdminHealthQuery = () =>
  useQuery({
    queryKey: ADMIN_QUERY_KEYS.health,
    queryFn: checkAdminHealth,
    staleTime: 1000 * 60 * 2,
  })

export const useCreateAdminUserMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: AdminCreateUserPayload) => createAdminUser(payload),
    onSuccess: (user) => {
      toast.success(`User ${user.name} created`)
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })
}

export const useUpdateAdminUserMutation = (id: number | string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: AdminUpdateUserPayload) => updateAdminUser(id, payload),
    onSuccess: (user) => {
      toast.success(`User ${user.name} updated`)
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.userDetail(id) })
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })
}

export const useDeleteAdminUserMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number | string) => deleteAdminUser(id),
    onSuccess: (data) => {
      toast.success(data.message)
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })
}

export const useBulkUserOperationMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: BulkUserOperationPayload) => bulkUserOperation(payload),
    onSuccess: (data) => {
      toast.success(data.message)
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })
}

export const useCreateAdminTeamMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: AdminTeamPayload) => createAdminTeam(payload),
    onSuccess: (team) => {
      toast.success(`Team ${team.name} created`)
      queryClient.invalidateQueries({ queryKey: ['admin', 'teams'] })
      queryClient.invalidateQueries({ queryKey: ['teams'] })
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })
}

export const useDeleteAdminTeamMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number | string) => deleteAdminTeam(id),
    onSuccess: (data) => {
      toast.success(data.message)
      queryClient.invalidateQueries({ queryKey: ['admin', 'teams'] })
      queryClient.invalidateQueries({ queryKey: ['teams'] })
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })
}

export const useRestructureHierarchyMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: HierarchyRestructurePayload) => restructureHierarchy(payload),
    onSuccess: (data) => {
      toast.success(data.message)
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })
}

export const useRecordAdminOverrideMutation = () => {
  return useMutation({
    mutationFn: (payload: AdminOverridePayload) => recordAdminOverride(payload),
    onSuccess: (data) => {
      toast.success(data.message)
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })
}