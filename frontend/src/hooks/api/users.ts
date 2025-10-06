import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import {
  deactivateUser,
  getMessageableUsers,
  listUsers,
  reactivateUser,
  updateUser,
} from '@/api/users'
import type { UpdateUserPayload, UserQueryParams } from '@/api/users'
import { getErrorMessage } from '@/lib/utils'
import type { Role } from '@/utils/roles'

const USERS_QUERY_KEYS = {
  list: (params: UserQueryParams) => ['users', params] as const,
  detail: (id: number | string) => ['users', id] as const,
  messageable: ['users', 'messageable'] as const,
}

export const useUsersQuery = (params: UserQueryParams) => {
  return useQuery({
    queryKey: USERS_QUERY_KEYS.list(params),
    queryFn: () => listUsers(params),
    placeholderData: (previousData) => previousData,
  })
}

export const useMessageableUsersQuery = () => {
  return useQuery({
    queryKey: USERS_QUERY_KEYS.messageable,
    queryFn: () => getMessageableUsers(),
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

export const useReactivateUserMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number | string) => reactivateUser(id),
    onSuccess: (user) => {
      toast.success(`${user.name} reactivated`)
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })
}

export const useFilteredUsers = (params: UserQueryParams & { roleFilter?: Role | 'ALL' }) => {
  return useUsersQuery(params)
}
