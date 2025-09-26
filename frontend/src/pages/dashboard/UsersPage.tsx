import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { EmptyState } from '@/components/ui/empty-state'
import {
  Form,
  FormControl,
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
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useDeactivateUserMutation, useReactivateUserMutation, useUpdateUserMutation, useUsersQuery } from '@/hooks/api/users'
import { useAuth } from '@/hooks/useAuth'
import type { User } from '@/types'
import { ROLE_LABELS, ROLES } from '@/utils/roles'

type RoleFilterValue = (typeof ROLES)[number] | 'ALL'

const PAGE_SIZE = 10

const formatDateTime = (value?: string | null) => {
  if (!value) return '—'
  return new Date(value).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

const UsersPage = () => {
  const { user } = useAuth()
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<RoleFilterValue>('ALL')
  const [includeInactive, setIncludeInactive] = useState(false)
  const [page, setPage] = useState(1)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [actionUser, setActionUser] = useState<{ user: User; type: 'DEACTIVATE' | 'REACTIVATE' } | null>(
    null,
  )

  const params = useMemo(
    () => ({
      page,
      limit: PAGE_SIZE,
      search: searchTerm || undefined,
      role: roleFilter !== 'ALL' ? roleFilter : undefined,
      includeInactive: includeInactive || undefined,
    }),
    [page, searchTerm, roleFilter, includeInactive],
  )

  const usersQuery = useUsersQuery(params)
  const deactivateMutation = useDeactivateUserMutation()
  const reactivateMutation = useReactivateUserMutation()

  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const value = (formData.get('search') as string | null)?.trim() ?? ''
    setPage(1)
    setSearchTerm(value)
  }

  const handleClearSearch = () => {
    setSearchTerm('')
    setPage(1)
  }

  const data = usersQuery.data?.data ?? []
  const pagination = usersQuery.data?.pagination

  const canManageUsers = Boolean(user && ['ADMIN', 'MANAGER'].includes(user.role))

  return (
    <div className="space-y-8">
      <PageHeader
        title="User directory"
        description="Auditable control over accounts, roles, and reporting lines."
        actions={
          canManageUsers ? (
            <Button variant="outline" onClick={() => usersQuery.refetch()} disabled={usersQuery.isFetching}>
              {usersQuery.isFetching ? 'Refreshing…' : 'Refresh data'}
            </Button>
          ) : null
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSearch}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_repeat(2,minmax(0,1fr))_auto]"
          >
            <div className="sm:col-span-2 lg:col-span-1">
              <label className="text-sm font-medium text-muted-foreground" htmlFor="search">
                Search users
              </label>
              <div className="mt-2 flex gap-2">
                <Input
                  id="search"
                  name="search"
                  placeholder="Search by name or email"
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
                  onClick={handleClearSearch}
                >
                  Clear search
                </button>
              ) : null}
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Role</label>
              <div className="mt-2">
                <Select
                  value={roleFilter}
                  onValueChange={(value: RoleFilterValue) => {
                    setRoleFilter(value)
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

            <div>
              <label className="text-sm font-medium text-muted-foreground">Status</label>
              <div className="mt-2 flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2">
                <Switch
                  checked={includeInactive}
                  onCheckedChange={(checked) => {
                    setIncludeInactive(Boolean(checked))
                    setPage(1)
                  }}
                />
                <span className="text-sm">Include inactive accounts</span>
              </div>
            </div>

            <div className="flex items-end justify-end">
              <Badge variant="secondary">
                {usersQuery.data?.pagination?.total ?? 0} accounts
              </Badge>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account roster</CardTitle>
        </CardHeader>
        <CardContent>
          {usersQuery.isLoading ? (
            <div className="flex h-48 items-center justify-center">
              <Spinner />
            </div>
          ) : data.length === 0 ? (
            <EmptyState
              title="No users found"
              description="Try adjusting your filters or invite more teammates."
            />
          ) : (
            <ScrollArea className="-mx-4 overflow-x-auto">
              <div className="min-w-[720px] px-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Last login</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-32 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.map((entry) => (
                      <TableRow key={entry.id} className={!entry.isActive ? 'opacity-70' : undefined}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-foreground">{entry.name}</p>
                            <p className="text-xs text-muted-foreground">ID: {entry.id}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <a className="text-sm" href={`mailto:${entry.email}`}>
                            {entry.email}
                          </a>
                        </TableCell>
                        <TableCell>
                          <RoleBadge role={entry.role} />
                        </TableCell>
                        <TableCell>{formatDateTime(entry.lastLoginAt)}</TableCell>
                        <TableCell>
                          <StatusBadge status={entry.isActive ? 'Active' : 'Inactive'} />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditingUser(entry)}
                            >
                              Edit
                            </Button>
                            {entry.isActive ? (
                              <Button
                                variant="secondary"
                                size="sm"
                                disabled={!canManageUsers}
                                onClick={() =>
                                  canManageUsers &&
                                  setActionUser({ user: entry, type: 'DEACTIVATE' })
                                }
                              >
                                Disable
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={!canManageUsers}
                                onClick={() =>
                                  canManageUsers &&
                                  setActionUser({ user: entry, type: 'REACTIVATE' })
                                }
                              >
                                Restore
                              </Button>
                            )}
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
          onPageChange={(nextPage) => setPage(nextPage)}
        />
      ) : null}

      {editingUser ? (
        <EditUserDialog
          key={editingUser.id}
          user={editingUser}
          onClose={() => setEditingUser(null)}
        />
      ) : null}

      <ActionDialog
        state={actionUser}
        onCancel={() => setActionUser(null)}
        onConfirm={async () => {
          if (!actionUser) return
          if (actionUser.type === 'DEACTIVATE') {
            await deactivateMutation.mutateAsync(actionUser.user.id)
          } else {
            await reactivateMutation.mutateAsync(actionUser.user.id)
          }
          setActionUser(null)
        }}
        isBusy={deactivateMutation.isPending || reactivateMutation.isPending}
      />
    </div>
  )
}

export default UsersPage

interface EditUserDialogProps {
  user: User
  onClose: () => void
}

type EditUserFormValues = {
  name: string
  email: string
  role: (typeof ROLES)[number]
}

const EditUserDialog = ({ user, onClose }: EditUserDialogProps) => {
  const form = useForm<EditUserFormValues>({
    defaultValues: {
      name: user.name,
      email: user.email,
      role: user.role,
    },
  })

  useEffect(() => {
    form.reset({ name: user.name, email: user.email, role: user.role })
  }, [user, form])

  const updateMutation = useUpdateUserMutation(user.id)

  const onSubmit = async (values: EditUserFormValues) => {
    await updateMutation.mutateAsync(values)
    onClose()
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit user</DialogTitle>
          <DialogDescription>
            Update profile details or adjust role-based permissions.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <FormControl>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
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
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Saving…' : 'Save changes'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

interface ActionDialogProps {
  state: { user: User; type: 'DEACTIVATE' | 'REACTIVATE' } | null
  onCancel: () => void
  onConfirm: () => Promise<void>
  isBusy: boolean
}

const ActionDialog = ({ state, onCancel, onConfirm, isBusy }: ActionDialogProps) => {
  return (
    <Dialog open={Boolean(state)} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {state?.type === 'DEACTIVATE' ? 'Disable account' : 'Restore account'}
          </DialogTitle>
          <DialogDescription>
            {state?.type === 'DEACTIVATE'
              ? 'The user will lose access immediately but their history is preserved.'
              : 'Reactivates access and restores organization permissions.'}
          </DialogDescription>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Target account: <span className="font-medium text-foreground">{state?.user.name}</span>
        </p>
        <DialogFooter className="pt-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="button"
            variant={state?.type === 'DEACTIVATE' ? 'destructive' : 'default'}
            onClick={() => void onConfirm()}
            disabled={isBusy}
          >
            {isBusy ? 'Processing…' : state?.type === 'DEACTIVATE' ? 'Disable' : 'Restore'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
