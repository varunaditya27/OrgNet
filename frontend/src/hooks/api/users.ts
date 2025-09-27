import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import {
  activateUser,
  changePassword,
  deactivateUser,
  getAllUsersAdmin,
  getUserById,
  getUserHierarchy,
  getUserSubordinates,
  getUserSuperior,
  getUserTeams,
  listUsers,
  updateUser,
} from '@/api/users'
import type {
  ChangePasswordPayload,
  UpdateUserPayload,
  UserQueryParams,
} from '@/api/users'
import { getErrorMessage } from '@/lib/utils'

const USERS_QUERY_KEYS = {
  list: (params: UserQueryParams) => ['users', params] as const,
  detail: (id: number | string) => ['users', id] as const,
  hierarchy: (id: number | string) => ['users', 'hierarchy', id] as const,
  superior: (id: number | string) => ['users', 'superior', id] as const,
  subordinates: (id: number | string) => ['users', 'subordinates', id] as const,
  teams: (id: number | string) => ['users', 'teams', id] as const,
  adminAll: ['users', 'admin', 'all'] as const,
}

export const useUsersQuery = (params: UserQueryParams) => {
  return useQuery({
    queryKey: USERS_QUERY_KEYS.list(params),
    queryFn: () => listUsers(params),
    placeholderData: (previousData) => previousData,
  })
}

export const useUserQuery = (id: number | string) => {
  return useQuery({
    queryKey: USERS_QUERY_KEYS.detail(id),
    queryFn: () => getUserById(id),
    enabled: Boolean(id),
  })
}

export const useUserHierarchyQuery = (id: number | string) => {
  return useQuery({
    queryKey: USERS_QUERY_KEYS.hierarchy(id),
    queryFn: () => getUserHierarchy(id),
    enabled: Boolean(id),
  })
}

export const useUserSuperiorQuery = (id: number | string) => {
  return useQuery({
    queryKey: USERS_QUERY_KEYS.superior(id),
    queryFn: () => getUserSuperior(id),
    enabled: Boolean(id),
  })
}

export const useUserSubordinatesQuery = (id: number | string) => {
  return useQuery({
    queryKey: USERS_QUERY_KEYS.subordinates(id),
    queryFn: () => getUserSubordinates(id),
    enabled: Boolean(id),
  })
}

export const useUserTeamsQuery = (id: number | string) => {
  return useQuery({
    queryKey: USERS_QUERY_KEYS.teams(id),
    queryFn: () => getUserTeams(id),
    enabled: Boolean(id),
  })
}

export const useAdminUsersQuery = (includeInactive?: boolean) => {
  return useQuery({
    queryKey: USERS_QUERY_KEYS.adminAll,
    queryFn: () => getAllUsersAdmin(includeInactive),
    staleTime: 1000 * 60 * 5,
  })
}

export const useUpdateUserMutation = (id: number | string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: UpdateUserPayload) => updateUser(id, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEYS.detail(id) })
      toast.success(`${data.name} updated`)
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })
}

export const useChangePasswordMutation = (id: number | string) => {
  return useMutation({
    mutationFn: (payload: ChangePasswordPayload) => changePassword(id, payload),
    onSuccess: (data) => {
      toast.success(data.message)
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })
}

export const useActivateUserMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number | string) => activateUser(id),
    onSuccess: (user) => {
      toast.success(`${user.name} activated`)
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })
}

export const useDeactivateUserMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number | string) => deactivateUser(id),
    onSuccess: (user) => {
      toast.success(`${user.name} deactivated`)
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })
}