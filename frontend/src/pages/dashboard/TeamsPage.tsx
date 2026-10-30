import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
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
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useUsersQuery } from '@/hooks/api/users'
import {
  useAddTeamMembersMutation,
  useCreateTeamMutation,
  useRemoveTeamMembersMutation,
  useTeamQuery,
  useTeamsQuery,
} from '@/hooks/api/teams'
import type { Team, TeamMember, User } from '@/types'
import { ROLE_LABELS } from '@/utils/roles'

type ManagerFilterValue = number | 'ALL'

const teamFormSchema = z.object({
  name: z.string().min(2, 'Team name must be at least 2 characters'),
  description: z.string().max(160, 'Keep descriptions concise').optional(),
  memberIds: z.array(z.number()),
})

type TeamFormValues = z.infer<typeof teamFormSchema>

const TeamsPage = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [managerFilter, setManagerFilter] = useState<ManagerFilterValue>('ALL')
  const [createOpen, setCreateOpen] = useState(false)
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)

  const params = useMemo(
    () => ({
      search: searchTerm || undefined,
      managerId: managerFilter !== 'ALL' ? managerFilter : undefined,
    }),
    [searchTerm, managerFilter],
  )

  const teamsQuery = useTeamsQuery(params)
  const usersQuery = useUsersQuery({ page: 1, limit: 100 })

  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const value = (formData.get('search') as string | null)?.trim() ?? ''
    setSearchTerm(value)
  }

  const clearSearch = () => setSearchTerm('')

  const teams = teamsQuery.data?.data ?? []

  const allUsers = usersQuery.data?.data ?? []
  const managerOptions = allUsers.filter((user) =>
    ['ADMIN', 'MANAGER'].includes(user.role),
  )

  return (
    <div className="space-y-8">
      <PageHeader
        title="Teams"
        description="Structure cross-functional groups, manage memberships, and reinforce reporting lines."
        actions={
          <Button onClick={() => setCreateOpen(true)} disabled={usersQuery.isLoading}>
            Create team
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
            className="grid gap-4 md:grid-cols-[minmax(0,2fr)_repeat(2,minmax(0,1fr))]"
          >
            <div>
              <label className="text-sm font-medium text-muted-foreground" htmlFor="search">
                Search teams
              </label>
              <div className="mt-2 flex gap-2">
                <Input id="search" name="search" placeholder="Search by team name" defaultValue={searchTerm} />
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
              <label className="text-sm font-medium text-muted-foreground">Manager</label>
              <div className="mt-2">
                <Select
                  value={String(managerFilter)}
                  onValueChange={(value) =>
                    setManagerFilter(value === 'ALL' ? 'ALL' : Number.parseInt(value, 10))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by manager" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All managers</SelectItem>
                    {managerOptions.map((manager) => (
                      <SelectItem key={manager.id} value={String(manager.id)}>
                        {manager.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-end">
              <Badge variant="secondary">{teamsQuery.data?.pagination?.total ?? teams.length} teams</Badge>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Team directory</CardTitle>
        </CardHeader>
        <CardContent>
          {teamsQuery.isLoading ? (
            <div className="flex h-48 items-center justify-center">
              <Spinner />
            </div>
          ) : teams.length === 0 ? (
            <EmptyState
              title="No teams found"
              description="Create your first team or adjust the filters above."
            />
          ) : (
            <ScrollArea className="-mx-4 overflow-x-auto">
              <div className="min-w-[720px] px-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Manager</TableHead>
                      <TableHead>Members</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="w-32 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {teams.map((team) => (
                      <TableRow key={team.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-foreground">{team.name}</p>
                            {team.description ? (
                              <p className="text-xs text-muted-foreground">{team.description}</p>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">{team.manager.name}</span>
                            <span className="text-xs text-muted-foreground">{team.manager.email}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{team.memberCount} members</Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(team.createdAt).toLocaleDateString(undefined, {
                            dateStyle: 'medium',
                          })}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" onClick={() => setSelectedTeam(team)}>
                            View
                          </Button>
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

      <CreateTeamDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        users={allUsers}
        onCreated={() => {
          setCreateOpen(false)
          teamsQuery.refetch()
        }}
      />

      {selectedTeam ? (
        <TeamDetailsDialog
          team={selectedTeam}
          users={allUsers}
          onClose={() => setSelectedTeam(null)}
          onUpdated={() => teamsQuery.refetch()}
        />
      ) : null}
    </div>
  )
}

export default TeamsPage

interface CreateTeamDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  users: User[]
  onCreated: () => void
}

const CreateTeamDialog = ({ open, onOpenChange, users, onCreated }: CreateTeamDialogProps) => {
  const form = useForm<TeamFormValues>({
    resolver: zodResolver(teamFormSchema),
    defaultValues: {
      name: '',
      description: '',
      memberIds: [],
    },
  })
  const createMutation = useCreateTeamMutation()

  const onSubmit = async (values: TeamFormValues) => {
    await createMutation.mutateAsync({
      name: values.name,
      description: values.description,
      memberIds: values.memberIds,
    })
    form.reset()
    onCreated()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Create a team</DialogTitle>
          <DialogDescription>
            Group collaborators under a manager to streamline communication and approvals.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Team name</FormLabel>
                  <FormControl>
                    <Input placeholder="Security Operations" {...field} />
                  </FormControl>
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
                    <Input placeholder="Purpose or focus (optional)" {...field} />
                  </FormControl>
                  <FormDescription>Visible to all members.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="memberIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Members</FormLabel>
                  <FormDescription>Select collaborators to add immediately.</FormDescription>
                  <FormControl>
                    <ScrollArea className="max-h-48 rounded-md border p-3">
                      <div className="space-y-2">
                        {users.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No eligible users yet.</p>
                        ) : (
                          users.map((user) => {
                            const checked = field.value.includes(user.id)
                            return (
                              <label key={user.id} className="flex items-center gap-3 text-sm">
                                <Checkbox
                                  checked={checked}
                                  onCheckedChange={(isChecked) => {
                                    if (isChecked) {
                                      field.onChange([...field.value, user.id])
                                    } else {
                                      field.onChange(field.value.filter((id) => id !== user.id))
                                    }
                                  }}
                                />
                                <span className="flex-1">
                                  <span className="font-medium text-foreground">{user.name}</span>
                                  <span className="block text-xs text-muted-foreground">
                                    {user.email}
                                  </span>
                                </span>
                              </label>
                            )
                          })
                        )}
                      </div>
                    </ScrollArea>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creating…' : 'Create team'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

interface TeamDetailsDialogProps {
  team: Team
  users: User[]
  onClose: () => void
  onUpdated: () => void
}

const TeamDetailsDialog = ({ team, users, onClose, onUpdated }: TeamDetailsDialogProps) => {
  const addMembers = useAddTeamMembersMutation(team.id)
  const removeMembers = useRemoveTeamMembersMutation(team.id)
  const members = useTeamQuery(team.id).data?.members ?? []

  const [selectedMembers, setSelectedMembers] = useState<number[]>([])

  const nonMembers = users.filter((user) => !members.some((member) => member.id === user.id))

  const handleAddMembers = async () => {
    if (selectedMembers.length === 0) return
    await addMembers.mutateAsync({ memberIds: selectedMembers })
    setSelectedMembers([])
    onUpdated()
  }

  const handleRemoveMember = async (member: TeamMember) => {
    await removeMembers.mutateAsync({ memberIds: [member.id] })
    onUpdated()
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{team.name}</DialogTitle>
          <DialogDescription>
            Managed by {team.manager.name}. Maintain membership for accurate reporting lines.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {team.description ? (
            <p className="text-sm text-muted-foreground">{team.description}</p>
          ) : null}

          <section>
            <h3 className="text-sm font-semibold text-muted-foreground">Members</h3>
            <ScrollArea className="mt-3 max-h-72 rounded-md border">
              <ul className="divide-y">
                {members.length === 0 ? (
                  <li className="p-4 text-sm text-muted-foreground">No members yet.</li>
                ) : (
                  members.map((member) => (
                    <li key={member.id} className="flex items-center justify-between gap-4 p-4">
                      <div>
                        <p className="text-sm font-medium text-foreground">{member.name}</p>
                        <p className="text-xs text-muted-foreground">{member.email}</p>
                      </div>
                      {member.id !== team.managerId ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => handleRemoveMember(member)}
                          disabled={removeMembers.isPending}
                        >
                          Remove
                        </Button>
                      ) : (
                        <Badge variant="secondary">Manager</Badge>
                      )}
                    </li>
                  ))
                )}
              </ul>
            </ScrollArea>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground">Add members</h3>
            {nonMembers.length === 0 ? (
              <p className="text-sm text-muted-foreground">Everyone in the directory already belongs to this team.</p>
            ) : (
              <>
                <ScrollArea className="max-h-48 rounded-md border p-3">
                  <div className="space-y-2">
                    {nonMembers.map((user) => {
                      const checked = selectedMembers.includes(user.id)
                      return (
                        <label key={user.id} className="flex items-center gap-3 text-sm">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(isChecked) => {
                              if (isChecked) {
                                setSelectedMembers([...selectedMembers, user.id])
                              } else {
                                setSelectedMembers(selectedMembers.filter((id) => id !== user.id))
                              }
                            }}
                          />
                          <span className="flex-1">
                            <span className="font-medium text-foreground">{user.name}</span>
                            <span className="block text-xs text-muted-foreground">
                              {user.email} • {ROLE_LABELS[user.role]}
                            </span>
                          </span>
                        </label>
                      )
                    })}
                  </div>
                </ScrollArea>
                <Button 
                  onClick={handleAddMembers} 
                  disabled={selectedMembers.length === 0 || addMembers.isPending}
                >
                  {addMembers.isPending ? 'Adding…' : `Add ${selectedMembers.length} member${selectedMembers.length === 1 ? '' : 's'}`}
                </Button>
              </>
            )}
          </section>
        </div>

        <DialogFooter className="pt-2">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}