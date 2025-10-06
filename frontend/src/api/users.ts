import type { PaginatedResponse, Team, User } from '@/types'
import { apiClient } from './client'
import { API_ENDPOINTS } from './endpoints'
import type { Role } from '@/utils/roles'

export interface UserQueryParams {
  page?: number
  limit?: number
  search?: string
  role?: Role | 'ALL'
  includeInactive?: boolean
}

export const listUsers = async (params: UserQueryParams = {}) => {
  const { data } = await apiClient.get<PaginatedResponse<User>>(
    API_ENDPOINTS.users.base,
    {
      params,
    },
  )
  return data
}

export const getUserById = async (id: number | string) => {
  const { data } = await apiClient.get<User>(API_ENDPOINTS.users.profile(id))
  return data
}

export const getMessageableUsers = async () => {
  const { data } = await apiClient.get<User[]>(
    `${API_ENDPOINTS.users.base}/messageable`,
  )
  return data
}

export interface UpdateUserPayload {
  name?: string
  email?: string
  role?: Role
  parentId?: number | null
  isActive?: boolean
}

export const updateUser = async (
  id: number | string,
  payload: UpdateUserPayload,
) => {
  const { data } = await apiClient.patch<User>(
    API_ENDPOINTS.users.profile(id),
    payload,
  )
  return data
}

export const fetchUserTeams = async (id: number | string) => {
  const { data } = await apiClient.get<Team[]>(API_ENDPOINTS.users.teams(id))
  return data
}

export const fetchUserHierarchy = async (id: number | string) => {
  const { data } = await apiClient.get<User[]>(
    API_ENDPOINTS.users.hierarchy(id),
  )
  return data
}

export const deactivateUser = async (id: number | string) => {
  const { data } = await apiClient.post<User>(
    `${API_ENDPOINTS.users.profile(id)}/deactivate`,
  )
  return data
}

export const reactivateUser = async (id: number | string) => {
  const { data } = await apiClient.post<User>(
    `${API_ENDPOINTS.users.profile(id)}/reactivate`,
  )
  return data
}
