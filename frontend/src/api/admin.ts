import type { AuditLogEntry, PaginatedResponse, SystemStats, Team, User } from '@/types'
import type { Role } from '@/utils/roles'
import { apiClient } from './client'
import { API_ENDPOINTS } from './endpoints'

export const fetchSystemStats = async () => {
  const { data } = await apiClient.get<SystemStats>(API_ENDPOINTS.admin.stats)
  return data
}

export interface AuditLogQueryParams {
  page?: number
  limit?: number
  userId?: number
  action?: string
  entity?: string
}

export const fetchAuditLogs = async (params: AuditLogQueryParams = {}) => {
  const { data } = await apiClient.get<PaginatedResponse<AuditLogEntry>>(
    API_ENDPOINTS.admin.auditLogs,
    { params },
  )
  return data
}

export interface AdminUserQueryParams {
  page?: number
  limit?: number
  role?: Role
  isActive?: boolean
  search?: string
  includeDeleted?: boolean
}

export const fetchAllUsers = async (params: AdminUserQueryParams = {}) => {
  const { data } = await apiClient.get<PaginatedResponse<User>>(
    API_ENDPOINTS.admin.users,
    { params },
  )
  return data
}

export interface AdminTeamQueryParams {
  page?: number
  limit?: number
  search?: string
  managerId?: number
}

export const fetchAllTeams = async (params: AdminTeamQueryParams = {}) => {
  const { data } = await apiClient.get<PaginatedResponse<Team>>(
    API_ENDPOINTS.admin.teams,
    { params },
  )
  return data
}
