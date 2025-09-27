import type { AuditLogEntry, PaginatedResponse, SystemStats, Team, User } from '@/types'
import { apiClient } from './client'
import { API_ENDPOINTS } from './endpoints'
import type { Role } from '@/utils/roles'

export interface AuditLogQueryParams {
  page?: number
  limit?: number
  userId?: number
  action?: string
  entity?: string
  startDate?: string
  endDate?: string
}

export interface AdminCreateUserPayload {
  name: string
  email: string
  password: string
  role: Role
  parentId?: number
  isActive?: boolean
}

export interface AdminUpdateUserPayload {
  name?: string
  email?: string
  role?: Role
  parentId?: number
  isActive?: boolean
}

export interface AdminUserQueryParams {
  page?: number
  limit?: number
  role?: Role
  isActive?: boolean
  search?: string
  includeDeleted?: boolean
}

export interface AdminTeamPayload {
  name: string
  description?: string
  managerId: number
  memberIds?: number[]
}

export interface AdminTeamQueryParams {
  page?: number
  limit?: number
  search?: string
  managerId?: number
}

export interface BulkUserOperationPayload {
  userIds: number[]
  operation: 'activate' | 'deactivate' | 'delete' | 'reassign'
  newParentId?: number
  reason?: string
}

export interface HierarchyRestructurePayload {
  userId: number
  newParentId?: number
  reason: string
  moveSubordinates?: boolean
}

export interface AdminOverridePayload {
  reason: string
  targetEntity: string
  targetEntityId: number
  overrideType: string
  metadata?: any
}

export const fetchSystemStats = async () => {
  const { data } = await apiClient.get<SystemStats>(API_ENDPOINTS.admin.stats)
  return data
}

export const fetchAuditLogs = async (params: AuditLogQueryParams = {}) => {
  const { data } = await apiClient.get<PaginatedResponse<AuditLogEntry>>(
    API_ENDPOINTS.admin.auditLogs,
    { params },
  )
  return data
}

export const createAdminUser = async (payload: AdminCreateUserPayload) => {
  const { data } = await apiClient.post<User>(
    API_ENDPOINTS.admin.users,
    payload,
  )
  return data
}

export const fetchAllAdminUsers = async (params: AdminUserQueryParams = {}) => {
  const { data } = await apiClient.get<PaginatedResponse<User>>(
    API_ENDPOINTS.admin.users,
    { params },
  )
  return data
}

export const getAdminUserById = async (id: number | string) => {
  const { data } = await apiClient.get<User>(
    API_ENDPOINTS.admin.userDetail(id),
  )
  return data
}

export const updateAdminUser = async (
  id: number | string,
  payload: AdminUpdateUserPayload,
) => {
  const { data } = await apiClient.put<User>(
    API_ENDPOINTS.admin.userDetail(id),
    payload,
  )
  return data
}

export const deleteAdminUser = async (id: number | string) => {
  const { data } = await apiClient.delete<{ message: string }>(
    API_ENDPOINTS.admin.userDetail(id),
  )
  return data
}

export const bulkUserOperation = async (payload: BulkUserOperationPayload) => {
  const { data } = await apiClient.post<{
    message: string
    affectedUsers: number
  }>(API_ENDPOINTS.admin.bulkOperation, payload)
  return data
}

export const createAdminTeam = async (payload: AdminTeamPayload) => {
  const { data } = await apiClient.post<Team>(
    API_ENDPOINTS.admin.teams,
    payload,
  )
  return data
}

export const fetchAllAdminTeams = async (params: AdminTeamQueryParams = {}) => {
  const { data } = await apiClient.get<PaginatedResponse<Team>>(
    API_ENDPOINTS.admin.teams,
    { params },
  )
  return data
}

export const deleteAdminTeam = async (id: number | string) => {
  const { data } = await apiClient.delete<{ message: string }>(
    API_ENDPOINTS.admin.teamDetail(id),
  )
  return data
}

export const restructureHierarchy = async (payload: HierarchyRestructurePayload) => {
  const { data } = await apiClient.put<{ message: string }>(
    API_ENDPOINTS.admin.hierarchyRestructure,
    payload,
  )
  return data
}

export const recordAdminOverride = async (payload: AdminOverridePayload) => {
  const { data } = await apiClient.post<{ message: string }>(
    API_ENDPOINTS.admin.override,
    payload,
  )
  return data
}

export const checkAdminHealth = async () => {
  const { data } = await apiClient.get<{
    status: string
    timestamp: string
    version: string
  }>(API_ENDPOINTS.admin.health)
  return data
}