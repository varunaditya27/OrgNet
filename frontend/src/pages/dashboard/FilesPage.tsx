import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Download, Upload } from 'lucide-react'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { EmptyState } from '@/components/ui/empty-state'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { PageHeader } from '@/components/ui/page-header'
import { Pagination } from '@/components/ui/pagination'
import { RoleBadge } from '@/components/ui/role-badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { StatusBadge } from '@/components/ui/status-badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { downloadFile } from '@/api/files'
import {
  useDeleteFileMutation,
  useFilesQuery,
  useUploadFileMutation,
} from '@/hooks/api/files'
import type { FileItem } from '@/types'
import { ROLE_LABELS, ROLES } from '@/utils/roles'
import { getErrorMessage } from '@/lib/utils'
import { toast } from 'sonner'

const FILES_PAGE_SIZE = 10

const uploadFileSchema = z.object({
  file: z
    .custom<File>((value) => value instanceof File, {
      message: 'Select a file to upload',
    })
    .refine((file) => (file?.size ?? 0) <= 10 * 1024 * 1024, {
      message: 'File must be smaller than 10MB',
    }),
  description: z.string().max(200, 'Keep descriptions concise').optional(),
  allowedRole: z.enum(ROLES),
})

type UploadFileFormValues = z.infer<typeof uploadFileSchema>

const FilesPage = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<(typeof ROLES)[number] | 'ALL'>('ALL')
  const [page, setPage] = useState(1)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [fileToDelete, setFileToDelete] = useState<FileItem | null>(null)

  const params = useMemo(
    () => ({
      page,
      limit: FILES_PAGE_SIZE,
      search: searchTerm || undefined,
      allowedRole: roleFilter === 'ALL' ? undefined : roleFilter,
    }),
    [page, searchTerm, roleFilter],
  )

  const filesQuery = useFilesQuery(params)
  const uploadMutation = useUploadFileMutation()
  const deleteMutation = useDeleteFileMutation()

  const files = filesQuery.data?.data ?? []
  const pagination = filesQuery.data?.pagination

  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const value = (formData.get('search') as string | null)?.trim() ?? ''
    setPage(1)
    setSearchTerm(value)
  }

  const clearSearch = () => {
    setSearchTerm('')
    setPage(1)
  }

  const handleDownload = async (file: FileItem) => {
    try {
      const payload = await downloadFile(file.id)
      if (payload.downloadUrl) {
        window.open(payload.downloadUrl, '_blank', 'noopener')
      }
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="File vault"
        description="Securely store and distribute policy-managed documents per role-based controls."
        actions={
          <Button onClick={() => setUploadOpen(true)}>
            <Upload className="mr-2 h-4 w-4" /> Upload file
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSearch}
            className="grid gap-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]"
          >
            <div>
              <label htmlFor="search" className="text-sm font-medium text-muted-foreground">
                Search files
              </label>
              <div className="mt-2 flex gap-2">
                <Input
                  id="search"
                  name="search"
                  placeholder="Search by file name or owner"
                  defaultValue={searchTerm}
                />
                <Button type="submit" variant="secondary">
                  Apply
                </Button>
              </div>
              {searchTerm ? (
                <button
                  type="button"
                  className="mt-2 text-xs text-muted-foreground hover:text-foreground"
                  onClick={clearSearch}
                >
                  Clear search
                </button>
              ) : null}
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Allowed role</label>
              <div className="mt-2">
                <Select
                  value={roleFilter}
                  onValueChange={(value) => {
                    setRoleFilter(value as typeof roleFilter)
                    setPage(1)
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All roles</SelectItem>
                    {ROLES.map((role) => (
                      <SelectItem key={role} value={role}>
                        {ROLE_LABELS[role]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Secure library</CardTitle>
        </CardHeader>
        <CardContent>
          {filesQuery.isLoading ? (
            <div className="flex h-48 items-center justify-center">
              <Spinner />
            </div>
          ) : files.length === 0 ? (
            <EmptyState
              title="No files uploaded yet"
              description="Drop the first document into OrgNet to provision secure sharing."
              action={
                <Button variant="outline" onClick={() => setUploadOpen(true)}>
                  Upload a file
                </Button>
              }
            />
          ) : (
            <ScrollArea className="-mx-4 overflow-x-auto">
              <div className="min-w-[760px] px-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>File</TableHead>
                      <TableHead>Owner</TableHead>
                      <TableHead>Allowed role</TableHead>
                      <TableHead>Downloads</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-36 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {files.map((file) => (
                      <TableRow key={file.id} className={!file.isActive ? 'opacity-70' : undefined}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-foreground">{file.fileName}</p>
                            {file.description ? (
                              <p className="text-xs text-muted-foreground">{file.description}</p>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p className="font-medium">{file.owner.name}</p>
                            <p className="text-xs text-muted-foreground">{file.owner.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <RoleBadge role={file.allowedRole} />
                        </TableCell>
                        <TableCell>{file.downloadCount}</TableCell>
                        <TableCell>
                          {new Date(file.createdAt).toLocaleDateString(undefined, {
                            dateStyle: 'medium',
                          })}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={file.isActive ? 'Active' : 'Inactive'} />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownload(file)}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setFileToDelete(file)}
                            >
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {pagination && pagination.totalPages > 1 ? (
        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          onPageChange={setPage}
        />
      ) : null}

      <UploadFileDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onSubmitted={() => {
          setUploadOpen(false)
          filesQuery.refetch()
        }}
        uploadMutation={uploadMutation}
      />

      <Dialog open={Boolean(fileToDelete)} onOpenChange={(open) => !open && setFileToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete file</DialogTitle>
            <DialogDescription>
              The file will no longer be available to anyone in the organization.
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            File: <span className="font-medium text-foreground">{fileToDelete?.fileName}</span>
          </p>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => setFileToDelete(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={async () => {
                if (!fileToDelete) return
                try {
                  await deleteMutation.mutateAsync(fileToDelete.id)
                  setFileToDelete(null)
                } catch {
                  // Error already surfaced by the mutation's toast
                }
              }}
            >
              {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default FilesPage

interface UploadFileDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmitted: () => void
  uploadMutation: ReturnType<typeof useUploadFileMutation>
}

const UploadFileDialog = ({ open, onOpenChange, onSubmitted, uploadMutation }: UploadFileDialogProps) => {
  const form = useForm<UploadFileFormValues>({
    resolver: zodResolver(uploadFileSchema),
    defaultValues: {
      description: '',
      allowedRole: 'EMPLOYEE',
    },
  })

  const onSubmit = async (values: UploadFileFormValues) => {
    await uploadMutation.mutateAsync(values)
    form.reset({ description: '', allowedRole: 'EMPLOYEE', file: undefined as unknown as File })
    onSubmitted()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Upload secure document</DialogTitle>
          <DialogDescription>
            Files are encrypted at rest and enforced through OrgNet RBAC policies.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="file"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>File</FormLabel>
                  <FormControl>
                    <Input
                      type="file"
                      accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.zip,.png,.jpg,.jpeg"
                      onChange={(event) => {
                        const file = event.target.files?.[0]
                        field.onChange(file ?? undefined)
                      }}
                    />
                  </FormControl>
                  <FormDescription>Maximum size 10MB.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input placeholder="Optional context for collaborators" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="allowedRole"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Access level</FormLabel>
                  <FormControl>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose role" />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES.map((role) => (
                          <SelectItem key={role} value={role}>
                            {ROLE_LABELS[role]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={uploadMutation.isPending}>
                {uploadMutation.isPending ? 'Uploading…' : 'Upload'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}