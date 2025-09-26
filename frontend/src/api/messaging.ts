import type {
  ConversationSummary,
  Message,
  PaginatedResponse,
  UserSummary,
} from '@/types'
import { apiClient } from './client'
import { API_ENDPOINTS } from './endpoints'

export interface ConversationQueryParams {
  search?: string
}

export const fetchConversations = async (params: ConversationQueryParams = {}) => {
  const { data } = await apiClient.get<ConversationSummary[]>(
    API_ENDPOINTS.messaging.conversations,
    { params },
  )
  return data
}

export interface MessagesQueryParams {
  conversationId: number
  page?: number
  limit?: number
}

export const fetchMessages = async (params: MessagesQueryParams) => {
  const { conversationId, ...rest } = params
  const { data } = await apiClient.get<PaginatedResponse<Message>>(
    API_ENDPOINTS.messaging.messages,
    {
      params: { conversationId, ...rest },
    },
  )
  return data
}

export interface SendMessagePayload {
  content: string
  receiverId?: number
  groupId?: number
}

export const sendMessage = async (payload: SendMessagePayload) => {
  const { data } = await apiClient.post<Message>(
    API_ENDPOINTS.messaging.send,
    payload,
  )
  return data
}

export interface CreateGroupPayload {
  name: string
  memberIds: number[]
  description?: string
}

export const createGroup = async (payload: CreateGroupPayload) => {
  const { data } = await apiClient.post(
    API_ENDPOINTS.messaging.groups,
    payload,
  )
  return data
}

export const fetchGroupMembers = async (groupId: number) => {
  const { data } = await apiClient.get<UserSummary[]>(
    `${API_ENDPOINTS.messaging.groups}/${groupId}/members`,
  )
  return data
}
