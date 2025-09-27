import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import {
  addTeamMembers,
  createTeam,
  deleteTeam,
  getTeamById,
  getTeamsByManager,
  listManagedTeams,
  listTeams,
  removeTeamMembers,
  updateTeam,
} from '@/api/teams'
import type {
  AddMembersPayload,
  CreateTeamPayload,
  RemoveMembersPayload,
  TeamQueryParams,
  UpdateTeamPayload,
} from '@/api/teams'
import { getErrorMessage } from '@/lib/utils'

const TEAMS_QUERY_KEYS = {
  list: (params: TeamQueryParams) => ['teams', params] as const,
  managed: ['teams', 'managed'] as const,
  detail: (id: number | string) => ['teams', id] as const,
  byManager: (managerId: number | string) => ['teams', 'by-manager', managerId] as const,
}

export const useTeamsQuery = (params: TeamQueryParams) =>
  useQuery({
    queryKey: TEAMS_QUERY_KEYS.list(params),
    queryFn: () => listTeams(params),
    placeholderData: (previous) => previous,
  })

export const useTeamQuery = (id: number | string) =>
  useQuery({
    queryKey: TEAMS_QUERY_KEYS.detail(id),
    queryFn: () => getTeamById(id),
    enabled: Boolean(id),
  })

export const useManagedTeamsQuery = (options?: { enabled?: boolean }) =>
  useQuery({
    queryKey: TEAMS_QUERY_KEYS.managed,
    queryFn: () => listManagedTeams(),
    enabled: options?.enabled ?? true,
  })

export const useTeamsByManagerQuery = (managerId: number | string) =>
  useQuery({
    queryKey: TEAMS_QUERY_KEYS.byManager(managerId),
    queryFn: () => getTeamsByManager(managerId),
    enabled: Boolean(managerId),
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

export const useAddTeamMembersMutation = (teamId: number | string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: AddMembersPayload) => addTeamMembers(teamId, payload),
    onSuccess: () => {
      toast.success('Members added to team')
      queryClient.invalidateQueries({ queryKey: TEAMS_QUERY_KEYS.detail(teamId) })
      queryClient.invalidateQueries({ queryKey: ['teams'] })
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })
}

export const useRemoveTeamMembersMutation = (teamId: number | string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: RemoveMembersPayload) => removeTeamMembers(teamId, payload),
    onSuccess: () => {
      toast.success('Members removed from team')
      queryClient.invalidateQueries({ queryKey: TEAMS_QUERY_KEYS.detail(teamId) })
      queryClient.invalidateQueries({ queryKey: ['teams'] })
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })
}

export const useDeleteTeamMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number | string) => deleteTeam(id),
    onSuccess: () => {
      toast.success('Team deleted')
      queryClient.invalidateQueries({ queryKey: ['teams'] })
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })
}

export const useGroupsQuery = () =>
  useQuery({
    queryKey: MESSAGING_QUERY_KEYS.groups,
    queryFn: () => getUserGroups(),
    staleTime: 1000 * 60 * 5,
  })

export const useGroupQuery = (groupId: number | string) =>
  useQuery({
    queryKey: MESSAGING_QUERY_KEYS.groupDetail(groupId),
    queryFn: () => getGroupById(groupId),
    enabled: Boolean(groupId),
  })

export const useCreateGroupMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateGroupPayload) => createGroup(payload),
    onSuccess: () => {
      toast.success('Group created')
      queryClient.invalidateQueries({ queryKey: ['messaging', 'conversations'] })
      queryClient.invalidateQueries({ queryKey: ['messaging', 'groups'] })
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })
}

export const useUpdateGroupMutation = (groupId: number | string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: UpdateGroupPayload) => updateGroup(groupId, payload),
    onSuccess: () => {
      toast.success('Group updated')
      queryClient.invalidateQueries({ queryKey: MESSAGING_QUERY_KEYS.groupDetail(groupId) })
      queryClient.invalidateQueries({ queryKey: ['messaging', 'groups'] })
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })
}

export const useAddGroupMembersMutation = (groupId: number | string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: AddGroupMembersPayload) => addGroupMembers(groupId, payload),
    onSuccess: () => {
      toast.success('Members added to group')
      queryClient.invalidateQueries({ queryKey: MESSAGING_QUERY_KEYS.groupDetail(groupId) })
      queryClient.invalidateQueries({ queryKey: ['messaging', 'groups'] })
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })
}

export const useRemoveGroupMembersMutation = (groupId: number | string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: RemoveGroupMembersPayload) => removeGroupMembers(groupId, payload),
    onSuccess: () => {
      toast.success('Members removed from group')
      queryClient.invalidateQueries({ queryKey: MESSAGING_QUERY_KEYS.groupDetail(groupId) })
      queryClient.invalidateQueries({ queryKey: ['messaging', 'groups'] })
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })
}