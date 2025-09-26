import type { PaginatedResponse, Team, TeamMember } from '@/types'
import { apiClient } from './client'
import { API_ENDPOINTS } from './endpoints'

export interface TeamQueryParams {
  page?: number
  limit?: number
  search?: string
  managerId?: number
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

export interface CreateTeamPayload {
  name: string
  description?: string
  managerId: number
  memberIds?: number[]
}

export const createTeam = async (payload: CreateTeamPayload) => {
  const { data } = await apiClient.post<Team>(API_ENDPOINTS.teams.base, payload)
  return data
}

export interface UpdateTeamPayload {
  name?: string
  description?: string
  managerId?: number
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

export const listManagedTeams = async () => {
  const { data } = await apiClient.get<Team[]>(API_ENDPOINTS.teams.managed)
  return data
}

export const addTeamMember = async (
  teamId: number | string,
  memberId: number,
) => {
  const { data } = await apiClient.post<TeamMember>(
    `${API_ENDPOINTS.teams.members(teamId)}`,
    { memberId },
  )
  return data
}

export const removeTeamMember = async (
  teamId: number | string,
  memberId: number,
) => {
  await apiClient.delete(`${API_ENDPOINTS.teams.members(teamId)}/${memberId}`)
}
