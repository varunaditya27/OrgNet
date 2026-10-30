import type {
  ConversationSummary,
  Group,
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
  const [direct, groups] = await Promise.all([
    apiClient.get<ConversationSummary[]>(API_ENDPOINTS.messaging.conversations),
    apiClient.get<Group[]>(API_ENDPOINTS.messaging.groups),
  ])

  // The conversations endpoint only lists direct chats, so groups are merged in here.
  const groupConversations = groups.data.map(
    (group): ConversationSummary => ({
      participantId: 0,
      participantName: group.name,
      participantEmail: '',
      lastMessage: group.lastMessage ?? null,
      unreadCount: 0,
      isGroup: true,
      groupId: group.id,
    }),
  )

  const term = params.search?.trim().toLowerCase()
  const all = [...direct.data, ...groupConversations]
  return term
    ? all.filter((conversation) => conversation.participantName.toLowerCase().includes(term))
    : all
}

export interface MessagesQueryParams {
  receiverId?: number
  groupId?: number
  page?: number
  limit?: number
}

interface PaginatedMessagesResponse {
  messages: Message[]
  total: number
  page: number
  limit: number
  hasMore: boolean
}

export const fetchMessages = async (params: MessagesQueryParams) => {
  const { receiverId, groupId, page = 1, limit = 50 } = params

  if (!receiverId && !groupId) {
    throw new Error('Either receiverId or groupId must be provided')
  }

  const queryParams: Record<string, number> = {
    page,
    limit,
  }

  if (receiverId) {
    queryParams.receiverId = receiverId
  }

  if (groupId) {
    queryParams.groupId = groupId
  }

  const { data } = await apiClient.get<PaginatedMessagesResponse>(
    API_ENDPOINTS.messaging.messages,
    {
      params: queryParams,
    },
  )

  const totalPages = data.limit > 0 ? Math.ceil(data.total / data.limit) : 0

  return {
    data: data.messages,
    pagination: {
      page: data.page,
      limit: data.limit,
      total: data.total,
      totalPages,
    },
    hasMore: data.hasMore,
  } satisfies PaginatedResponse<Message>
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
  const { data } = await apiClient.post<Group>(
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
