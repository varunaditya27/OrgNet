import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { deactivateFile, deleteFile, listFiles, uploadFile } from '@/api/files'
import type { FileQueryParams, UploadFilePayload } from '@/api/files'
import { getErrorMessage } from '@/lib/utils'

const FILES_QUERY_KEYS = {
  list: (params: FileQueryParams) => ['files', params] as const,
}

export const useFilesQuery = (params: FileQueryParams) =>
  useQuery({
    queryKey: FILES_QUERY_KEYS.list(params),
    queryFn: () => listFiles(params),
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

export const useDeactivateFileMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number | string) => deactivateFile(id),
    onSuccess: () => {
      toast.success('File deactivated')
      queryClient.invalidateQueries({ queryKey: ['files'] })
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
