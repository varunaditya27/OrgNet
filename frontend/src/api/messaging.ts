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

export interface MessagesQueryParams {
  receiverId?: number
  groupId?: number
  page?: number
  limit?: number
}

export interface SendMessagePayload {
  content: string
  receiverId?: number
  groupId?: number
}

export interface CreateGroupPayload {
  name: string
  description?: string
  memberIds: number[]
}

export interface UpdateGroupPayload {
  name?: string
  description?: string
}

export interface AddGroupMembersPayload {
  memberIds: number[]
}

export interface RemoveGroupMembersPayload {
  memberIds: number[]
}

export interface GroupResponse {
  id: number
  name: string
  description?: string
  createdAt: string
  updatedAt: string
  members: Array<{
    id: number
    name: string
    email: string
    role: string
  }>
  messageCount?: number
}

export const fetchConversations = async (params: ConversationQueryParams = {}) => {
  const { data } = await apiClient.get<ConversationSummary[]>(
    API_ENDPOINTS.messaging.conversations,
    { params },
  )
  return data
}

export const fetchMessages = async (params: MessagesQueryParams) => {
  const { data } = await apiClient.get<{
    messages: Message[]
    total: number
    page: number
    limit: number
    hasMore: boolean
  }>(API_ENDPOINTS.messaging.messages, { params })
  return data
}

export const sendMessage = async (payload: SendMessagePayload) => {
  const { data } = await apiClient.post<Message>(
    API_ENDPOINTS.messaging.send,
    payload,
  )
  return data
}

export const deleteMessage = async (messageId: number | string) => {
  const { data } = await apiClient.delete<{ message: string }>(
    API_ENDPOINTS.messaging.deleteMessage(messageId),
  )
  return data
}

export const createGroup = async (payload: CreateGroupPayload) => {
  const { data } = await apiClient.post<GroupResponse>(
    API_ENDPOINTS.messaging.groups,
    payload,
  )
  return data
}

export const getUserGroups = async () => {
  const { data } = await apiClient.get<GroupResponse[]>(
    API_ENDPOINTS.messaging.groups,
  )
  return data
}

export const getGroupById = async (groupId: number | string) => {
  const { data } = await apiClient.get<GroupResponse>(
    API_ENDPOINTS.messaging.groupDetail(groupId),
  )
  return data
}

export const updateGroup = async (
  groupId: number | string,
  payload: UpdateGroupPayload,
) => {
  const { data } = await apiClient.patch<GroupResponse>(
    API_ENDPOINTS.messaging.groupDetail(groupId),
    payload,
  )
  return data
}

export const addGroupMembers = async (
  groupId: number | string,
  payload: AddGroupMembersPayload,
) => {
  const { data } = await apiClient.post<GroupResponse>(
    API_ENDPOINTS.messaging.groupMembers(groupId),
    payload,
  )
  return data
}

export const removeGroupMembers = async (
  groupId: number | string,
  payload: RemoveGroupMembersPayload,
) => {
  const { data } = await apiClient.delete<GroupResponse>(
    API_ENDPOINTS.messaging.groupMembers(groupId),
    { data: payload },
  )
  return data
}