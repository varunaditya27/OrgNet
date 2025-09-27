import type { PaginatedResponse, Team, TeamMember } from '@/types'
import { apiClient } from './client'
import { API_ENDPOINTS } from './endpoints'

export interface TeamQueryParams {
  page?: number
  limit?: number
  search?: string
  managerId?: number
}

export interface CreateTeamPayload {
  name: string
  description?: string
  memberIds?: number[]
}

export interface UpdateTeamPayload {
  name?: string
  description?: string
}

export interface AddMembersPayload {
  memberIds: number[]
}

export interface RemoveMembersPayload {
  memberIds: number[]
}

export const listTeams = async (params: TeamQueryParams = {}) => {
  const { data } = await apiClient.get<PaginatedResponse<Team>>(
    API_ENDPOINTS.teams.base,
    { params },
  )
  return data
}

export const getTeamById = async (id: number | string) => {
  const { data } = await apiClient.get<Team>(API_ENDPOINTS.teams.detail(id))
  return data
}

export const createTeam = async (payload: CreateTeamPayload) => {
  const { data } = await apiClient.post<Team>(API_ENDPOINTS.teams.base, payload)
  return data
}

export const updateTeam = async (
  id: number | string,
  payload: UpdateTeamPayload,
) => {
  const { data } = await apiClient.patch<Team>(
    API_ENDPOINTS.teams.detail(id),
    payload,
  )
  return data
}

export const addTeamMembers = async (
  teamId: number | string,
  payload: AddMembersPayload,
) => {
  const { data } = await apiClient.post<Team>(
    API_ENDPOINTS.teams.members(teamId),
    payload,
  )
  return data
}

export const removeTeamMembers = async (
  teamId: number | string,
  payload: RemoveMembersPayload,
) => {
  const { data } = await apiClient.delete<Team>(
    API_ENDPOINTS.teams.members(teamId),
    { data: payload },
  )
  return data
}

export const listManagedTeams = async () => {
  const { data } = await apiClient.get<Team[]>(API_ENDPOINTS.teams.managed)
  return data
}

export const getTeamsByManager = async (managerId: number | string) => {
  const { data } = await apiClient.get<Team[]>(
    API_ENDPOINTS.teams.managedByManager(managerId),
  )
  return data
}

export const deleteTeam = async (id: number | string) => {
  const { data } = await apiClient.delete<{ message: string }>(
    API_ENDPOINTS.teams.detail(id),
  )
  return data
}