import type { AuditLogEntry, PaginatedResponse, SystemStats, Team, User } from '@/types'
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

export const fetchAllUsers = async () => {
  const { data } = await apiClient.get<User[]>(API_ENDPOINTS.admin.users)
  return data
}

export const fetchAllTeams = async () => {
  const { data } = await apiClient.get<Team[]>(API_ENDPOINTS.admin.teams)
  return data
}
