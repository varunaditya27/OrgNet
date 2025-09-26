import { Shield, Users2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/ui/page-header'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { StatCard } from '@/components/ui/stat-card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useAdminTeamsQuery, useAdminUsersQuery, useSystemStatsQuery } from '@/hooks/api/admin'
import { ROUTES } from '@/routes/paths'
import { Link } from 'react-router-dom'
import { RoleBadge } from '@/components/ui/role-badge'
import { Badge } from '@/components/ui/badge'

const AdminPage = () => {
  const statsQuery = useSystemStatsQuery()
  const usersQuery = useAdminUsersQuery()
  const teamsQuery = useAdminTeamsQuery()

  return (
    <div className="space-y-10">
      <PageHeader
        title="Admin control center"
        description="Monitor system health, manage privileged accounts, and review compliance."
        actions={
          <Button variant="outline" asChild>
            <Link to={ROUTES.dashboard.auditLogs}>View audit logs</Link>
          </Button>
        }
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statsQuery.isLoading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-32 rounded-xl" />
          ))
        ) : statsQuery.data ? (
          <>
            <StatCard
              title="Total users"
              value={statsQuery.data.totalUsers}
              description="Provisioned across the organization"
              icon={<Users2 className="h-4 w-4" />}
            />
            <StatCard
              title="Active sessions"
              value={statsQuery.data.activeUsers}
              description="Currently authenticated"
              trend={{ label: `${statsQuery.data.pendingInvites} invites pending` }}
            />
            <StatCard
              title="Teams online"
              value={statsQuery.data.activeTeams}
              description={`${statsQuery.data.totalTeams} total registered`}
              icon={<Shield className="h-4 w-4" />}
            />
            <StatCard
              title="Storage footprint"
              value={`${typeof statsQuery.data.storageUsedMb === 'number' ? statsQuery.data.storageUsedMb.toFixed(1) : '0.0'} MB`}
              description={`Files shared this week: ${typeof statsQuery.data.filesSharedThisWeek === 'number' ? statsQuery.data.filesSharedThisWeek : 0}`}
            />
          </>
        ) : null}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Privileged users</CardTitle>
          </CardHeader>
          <CardContent>
            {usersQuery.isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-12 rounded-md" />
                ))}
              </div>
            ) : usersQuery.data?.length ? (
              <ScrollArea className="max-h-[360px] pr-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usersQuery.data
                      .filter((user) => ['ADMIN', 'MANAGER'].includes(user.role))
                      .map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div className="text-sm font-medium text-foreground">{user.name}</div>
                            <div className="text-xs text-muted-foreground">ID: {user.id}</div>
                          </TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <RoleBadge role={user.role} />
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            ) : (
              <EmptyState
                title="No privileged users"
                description="Grant admin or manager roles to empower operational oversight."
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Team coverage</CardTitle>
          </CardHeader>
          <CardContent>
            {teamsQuery.isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-12 rounded-md" />
                ))}
              </div>
            ) : teamsQuery.data?.length ? (
              <ScrollArea className="max-h-[360px] pr-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Team</TableHead>
                      <TableHead>Manager</TableHead>
                      <TableHead>Members</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {teamsQuery.data.map((team) => (
                      <TableRow key={team.id}>
                        <TableCell>
                          <div className="font-medium text-foreground">{team.name}</div>
                          {team.description ? (
                            <div className="text-xs text-muted-foreground">{team.description}</div>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-medium text-foreground">{team.manager.name}</div>
                          <div className="text-xs text-muted-foreground">{team.manager.email}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{team.memberCount} members</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            ) : (
              <EmptyState
                title="No teams configured"
                description="Stand up teams to align communication, approvals, and ownership."
              />
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}

export default AdminPage
