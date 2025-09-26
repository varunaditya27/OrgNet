import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import {
  addTeamMember,
  createTeam,
  listManagedTeams,
  listTeams,
  removeTeamMember,
  updateTeam,
} from '@/api/teams'
import type {
  CreateTeamPayload,
  TeamQueryParams,
  UpdateTeamPayload,
} from '@/api/teams'
import { getErrorMessage } from '@/lib/utils'

const TEAMS_QUERY_KEYS = {
  list: (params: TeamQueryParams) => ['teams', params] as const,
  managed: ['teams', 'managed'] as const,
  detail: (id: number | string) => ['teams', id] as const,
}

export const useTeamsQuery = (params: TeamQueryParams) =>
  useQuery({
    queryKey: TEAMS_QUERY_KEYS.list(params),
    queryFn: () => listTeams(params),
    placeholderData: (previous) => previous,
  })

export const useManagedTeamsQuery = (options?: { enabled?: boolean }) =>
  useQuery({
    queryKey: TEAMS_QUERY_KEYS.managed,
    queryFn: () => listManagedTeams(),
    enabled: options?.enabled ?? true,
  })

export const useCreateTeamMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateTeamPayload) => createTeam(payload),
    onSuccess: (team) => {
      toast.success(`Team ${team.name} created`)
      queryClient.invalidateQueries({ queryKey: ['teams'] })
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })
}

export const useUpdateTeamMutation = (id: number | string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: UpdateTeamPayload) => updateTeam(id, payload),
    onSuccess: (team) => {
      toast.success(`Team ${team.name} updated`)
      queryClient.invalidateQueries({ queryKey: ['teams'] })
      queryClient.invalidateQueries({ queryKey: TEAMS_QUERY_KEYS.detail(id) })
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })
}

export const useAddTeamMemberMutation = (teamId: number | string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (memberId: number) => addTeamMember(teamId, memberId),
    onSuccess: () => {
      toast.success('Member added to team')
      queryClient.invalidateQueries({ queryKey: TEAMS_QUERY_KEYS.detail(teamId) })
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })
}

export const useRemoveTeamMemberMutation = (teamId: number | string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (memberId: number) => removeTeamMember(teamId, memberId),
    onSuccess: () => {
      toast.success('Member removed from team')
      queryClient.invalidateQueries({ queryKey: TEAMS_QUERY_KEYS.detail(teamId) })
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })
}
