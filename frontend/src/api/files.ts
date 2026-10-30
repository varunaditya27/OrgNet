import type { FileItem, PaginatedResponse } from '@/types'
import { apiClient } from './client'
import { API_ENDPOINTS } from './endpoints'
import type { Role } from '@/utils/roles'

export interface FileQueryParams {
  page?: number
  limit?: number
  search?: string
  allowedRole?: Role
  mimeType?: string
  ownerId?: number
}

export interface UploadFilePayload {
  file: File
  description?: string
  allowedRole: Role
}

export interface UpdateFilePayload {
  description?: string
  allowedRole?: Role
}

export interface FileStatsResponse {
  totalFiles: number
  totalSize: number
  filesByType: { mimeType: string; count: number }[]
  recentUploads: FileItem[]
}

export const listFiles = async (params: FileQueryParams = {}) => {
  const { data } = await apiClient.get<{
    files: FileItem[]
    total: number
    page: number
    limit: number
    totalPages: number
  }>(API_ENDPOINTS.files.base, { params })
  return {
    data: data.files,
    pagination: {
      page: data.page,
      limit: data.limit,
      total: data.total,
      totalPages: data.totalPages,
    },
  } satisfies PaginatedResponse<FileItem>
}

export const getFileById = async (id: number | string) => {
  const { data } = await apiClient.get<FileItem>(
    API_ENDPOINTS.files.detail(id),
  )
  return data
}

export const uploadFile = async ({ file, description, allowedRole }: UploadFilePayload) => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('allowedRole', allowedRole)
  if (description) {
    formData.append('description', description)
  }

  const { data } = await apiClient.post<{
    id: number
    fileName: string
    mimeType: string
    size: number
    description?: string
    allowedRole: Role
    s3Key: string
    uploadedAt: string
  }>(API_ENDPOINTS.files.upload, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return data
}

export const updateFile = async (
  id: number | string,
  payload: UpdateFilePayload,
) => {
  const { data } = await apiClient.patch<FileItem>(
    API_ENDPOINTS.files.detail(id),
    payload,
  )
  return data
}

export const downloadFile = async (id: number | string) => {
  const { data } = await apiClient.get<{ downloadUrl: string }>(
    API_ENDPOINTS.files.download(id),
  )
  return data
}

export const deleteFile = async (id: number | string) => {
  const { data } = await apiClient.delete<{ message: string }>(
    API_ENDPOINTS.files.detail(id),
  )
  return data
}

export const getUserFiles = async (userId: number | string, params: FileQueryParams = {}) => {
  const { data } = await apiClient.get<PaginatedResponse<FileItem>>(
    API_ENDPOINTS.files.userFiles(userId),
    { params },
  )
  return data
}

export const getFileStats = async () => {
  const { data } = await apiClient.get<FileStatsResponse>(
    API_ENDPOINTS.files.statsOverview,
  )
  return data
}

export const getAllFilesAdmin = async (params: FileQueryParams = {}) => {
  const { data } = await apiClient.get<PaginatedResponse<FileItem>>(
    API_ENDPOINTS.files.adminAll,
    { params },
  )
  return data
}

export const hardDeleteFile = async (id: number | string) => {
  const { data } = await apiClient.delete<{ message: string }>(
    API_ENDPOINTS.files.adminHardDelete(id),
  )
  return data
}