import type { PaginatedResponse, Team, User } from '@/types'
import { apiClient } from './client'
import { API_ENDPOINTS } from './endpoints'
import type { Role } from '@/utils/roles'

export interface UserQueryParams {
  page?: number
  limit?: number
  search?: string
  role?: Role | 'ALL'
  isActive?: boolean
  includeInactive?: boolean
}

export interface UpdateUserPayload {
  name?: string
  email?: string
  role?: Role
  parentId?: number | null
  isActive?: boolean
}

export interface ChangePasswordPayload {
  oldPassword: string
  newPassword: string
}

export interface UserHierarchy {
  id: number
  name: string
  email: string
  role: Role
  parent?: User | null
  subordinates?: User[]
}

export interface UserTeamInfo {
  teamsManaged: Array<{
    id: number
    name: string
    createdAt: string
  }>
  teamMemberships: Array<{
    id: number
    name: string
    managerId: number
    createdAt: string
  }>
}

export const listUsers = async (params: UserQueryParams = {}) => {
  const { data } = await apiClient.get<{
    users: User[]
    total: number
    page: number
    limit: number
  }>(API_ENDPOINTS.users.base, { params })
  return data
}

export const getUserById = async (id: number | string) => {
  const { data } = await apiClient.get<User>(API_ENDPOINTS.users.detail(id))
  return data
}

export const updateUser = async (
  id: number | string,
  payload: UpdateUserPayload,
) => {
  const { data } = await apiClient.patch<User>(
    API_ENDPOINTS.users.detail(id),
    payload,
  )
  return data
}

export const getUserHierarchy = async (id: number | string) => {
  const { data } = await apiClient.get<UserHierarchy>(
    API_ENDPOINTS.users.hierarchy(id),
  )
  return data
}

export const getUserSuperior = async (id: number | string) => {
  const { data } = await apiClient.get<User | null>(
    API_ENDPOINTS.users.superior(id),
  )
  return data
}

export const getUserSubordinates = async (id: number | string) => {
  const { data } = await apiClient.get<User[]>(
    API_ENDPOINTS.users.subordinates(id),
  )
  return data
}

export const getUserTeams = async (id: number | string) => {
  const { data } = await apiClient.get<UserTeamInfo>(
    API_ENDPOINTS.users.teams(id),
  )
  return data
}

export const changePassword = async (
  id: number | string,
  payload: ChangePasswordPayload,
) => {
  const { data } = await apiClient.patch<{ message: string }>(
    API_ENDPOINTS.users.changePassword(id),
    payload,
  )
  return data
}

export const getAllUsersAdmin = async (includeInactive?: boolean) => {
  const { data } = await apiClient.get<User[]>(
    API_ENDPOINTS.users.adminAll,
    { params: { includeInactive } },
  )
  return data
}

export const activateUser = async (id: number | string) => {
  const { data } = await apiClient.patch<User>(
    API_ENDPOINTS.users.adminActivate(id),
  )
  return data
}

export const deactivateUser = async (id: number | string) => {
  const { data } = await apiClient.patch<User>(
    API_ENDPOINTS.users.adminDeactivate(id),
  )
  return data
}