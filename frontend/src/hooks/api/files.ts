import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import {
  deleteFile,
  getAllFilesAdmin,
  getFileById,
  getFileStats,
  getUserFiles,
  hardDeleteFile,
  listFiles,
  updateFile,
  uploadFile,
} from '@/api/files'
import type {
  FileQueryParams,
  UpdateFilePayload,
  UploadFilePayload,
} from '@/api/files'
import { getErrorMessage } from '@/lib/utils'

const FILES_QUERY_KEYS = {
  list: (params: FileQueryParams) => ['files', params] as const,
  detail: (id: number | string) => ['files', id] as const,
  userFiles: (userId: number | string, params: FileQueryParams) => ['files', 'user', userId, params] as const,
  stats: ['files', 'stats'] as const,
  adminAll: (params: FileQueryParams) => ['files', 'admin', 'all', params] as const,
}

export const useFilesQuery = (params: FileQueryParams) =>
  useQuery({
    queryKey: FILES_QUERY_KEYS.list(params),
    queryFn: () => listFiles(params),
    placeholderData: (prev) => prev,
  })

export const useFileQuery = (id: number | string) =>
  useQuery({
    queryKey: FILES_QUERY_KEYS.detail(id),
    queryFn: () => getFileById(id),
    enabled: Boolean(id),
  })

export const useUserFilesQuery = (userId: number | string, params: FileQueryParams = {}) =>
  useQuery({
    queryKey: FILES_QUERY_KEYS.userFiles(userId, params),
    queryFn: () => getUserFiles(userId, params),
    enabled: Boolean(userId),
  })

export const useFileStatsQuery = () =>
  useQuery({
    queryKey: FILES_QUERY_KEYS.stats,
    queryFn: () => getFileStats(),
    staleTime: 1000 * 60 * 5,
  })

export const useAdminFilesQuery = (params: FileQueryParams = {}) =>
  useQuery({
    queryKey: FILES_QUERY_KEYS.adminAll(params),
    queryFn: () => getAllFilesAdmin(params),
    placeholderData: (prev) => prev,
  })

export const useUploadFileMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: UploadFilePayload) => uploadFile(payload),
    onSuccess: () => {
      toast.success('File uploaded successfully')
      queryClient.invalidateQueries({ queryKey: ['files'] })
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })
}

export const useUpdateFileMutation = (id: number | string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: UpdateFilePayload) => updateFile(id, payload),
    onSuccess: () => {
      toast.success('File updated')
      queryClient.invalidateQueries({ queryKey: ['files'] })
      queryClient.invalidateQueries({ queryKey: FILES_QUERY_KEYS.detail(id) })
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })
}

export const useDeleteFileMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number | string) => deleteFile(id),
    onSuccess: () => {
      toast.success('File deleted')
      queryClient.invalidateQueries({ queryKey: ['files'] })
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })
}

export const useHardDeleteFileMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number | string) => hardDeleteFile(id),
    onSuccess: () => {
      toast.success('File permanently deleted')
      queryClient.invalidateQueries({ queryKey: ['files'] })
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })
}