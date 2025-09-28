import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import {
  createGroup,
  fetchConversations,
  fetchMessages,
  sendMessage,
} from '@/api/messaging'
import type {
  ConversationQueryParams,
  CreateGroupPayload,
  MessagesQueryParams,
  SendMessagePayload,
} from '@/api/messaging'
import { getErrorMessage } from '@/lib/utils'

const MESSAGING_QUERY_KEYS = {
  conversations: (params: ConversationQueryParams) => ['messaging', 'conversations', params] as const,
  messages: (params: MessagesQueryParams) => ['messaging', 'messages', params] as const,
}

export const useConversationsQuery = (params: ConversationQueryParams) =>
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
      toast.success('Message sent')
      queryClient.invalidateQueries({ queryKey: ['messaging', 'messages'] })
      queryClient.invalidateQueries({ queryKey: ['messaging', 'conversations'] })
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })
}

export const useCreateGroupMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateGroupPayload) => createGroup(payload),
    onSuccess: () => {
      toast.success('Group created')
      queryClient.invalidateQueries({ queryKey: ['messaging', 'conversations'] })
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })
}
