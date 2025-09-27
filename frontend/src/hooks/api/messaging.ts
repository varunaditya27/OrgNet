import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import {
  addGroupMembers,
  createGroup,
  deleteMessage,
  fetchConversations,
  fetchMessages,
  getGroupById,
  getUserGroups,
  removeGroupMembers,
  sendMessage,
  updateGroup,
} from '@/api/messaging'
import type {
  AddGroupMembersPayload,
  ConversationQueryParams,
  CreateGroupPayload,
  MessagesQueryParams,
  RemoveGroupMembersPayload,
  SendMessagePayload,
  UpdateGroupPayload,
} from '@/api/messaging'
import { getErrorMessage } from '@/lib/utils'

const MESSAGING_QUERY_KEYS = {
  conversations: (params: ConversationQueryParams) => ['messaging', 'conversations', params] as const,
  messages: (params: MessagesQueryParams) => ['messaging', 'messages', params] as const,
  groups: ['messaging', 'groups'] as const,
  groupDetail: (id: number | string) => ['messaging', 'groups', id] as const,
}

export const useConversationsQuery = (params: ConversationQueryParams = {}) =>
  useQuery({
    queryKey: MESSAGING_QUERY_KEYS.conversations(params),
    queryFn: () => fetchConversations(params),
    refetchInterval: 1000 * 30,
  })

export const useMessagesQuery = (params: MessagesQueryParams) =>
  useQuery({
    queryKey: MESSAGING_QUERY_KEYS.messages(params),
    queryFn: () => fetchMessages(params),
    enabled: Boolean(params.receiverId || params.groupId),
    refetchInterval: 1000 * 15,
    placeholderData: (previous) => previous,
  })

export const useSendMessageMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: SendMessagePayload) => sendMessage(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messaging', 'messages'] })
      queryClient.invalidateQueries({ queryKey: ['messaging', 'conversations'] })
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })
}

export const useDeleteMessageMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (messageId: number | string) => deleteMessage(messageId),
    onSuccess: () => {
      toast.success('Message deleted')
      queryClient.invalidateQueries({ queryKey: ['messaging', 'messages'] })
      queryClient.invalidateQueries({ queryKey: ['messaging', 'conversations'] })
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