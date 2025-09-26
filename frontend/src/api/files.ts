import type { FileItem, PaginatedResponse } from '@/types'
import { apiClient } from './client'
import { API_ENDPOINTS } from './endpoints'
import type { Role } from '@/utils/roles'

export interface FileQueryParams {
  page?: number
  limit?: number
  search?: string
  allowedRole?: Role
  includeInactive?: boolean
}

export const listFiles = async (params: FileQueryParams = {}) => {
  const { data } = await apiClient.get<PaginatedResponse<FileItem>>(
    API_ENDPOINTS.files.base,
    { params },
  )
  return data
}

export interface UploadFilePayload {
  file: File
  description?: string
  allowedRole: Role
}

export const uploadFile = async ({ file, description, allowedRole }: UploadFilePayload) => {
  const body = new FormData()
  body.append('file', file)
  body.append('allowedRole', allowedRole)
  if (description) {
    body.append('description', description)
  }

  const { data } = await apiClient.post<FileItem>(
    API_ENDPOINTS.files.upload,
    body,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    },
  )
  return data
}

export const downloadFile = async (id: number | string) => {
  const { data } = await apiClient.get<{ url: string }>(
    API_ENDPOINTS.files.download(id),
  )
  return data
}

export const deactivateFile = async (id: number | string) => {
  const { data } = await apiClient.post<FileItem>(
    `${API_ENDPOINTS.files.detail(id)}/deactivate`,
  )
  return data
}

export const deleteFile = async (id: number | string) => {
  await apiClient.delete(API_ENDPOINTS.files.detail(id))
}
