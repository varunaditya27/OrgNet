import {
  Activity,
  FileText,
  MessageSquare,
  ShieldCheck,
  Users,
} from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/ui/page-header'
import { Skeleton } from '@/components/ui/skeleton'
import { StatCard } from '@/components/ui/stat-card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useSystemStatsQuery } from '@/hooks/api/admin'
import { useManagedTeamsQuery } from '@/hooks/api/teams'
import { useAuth } from '@/hooks/useAuth'
import { ROUTES } from '@/routes/paths'

const DashboardOverviewPage = () => {
  const { user } = useAuth()
  const statsQuery = useSystemStatsQuery()
  const managedTeamsQuery = useManagedTeamsQuery({
    enabled: Boolean(user && ['ADMIN', 'MANAGER'].includes(user.role)),
  })

  const statCards = useMemo(() => {
    if (!statsQuery.data) return []

    const {
      activeUsers = 0,
      totalUsers = 0,
      inactiveUsers = 0,
      activeTeams = 0,
      totalTeams = 0,
      messagesToday = 0,
      totalFiles = 0,
      storageUsedMb,
    } = statsQuery.data || {};

    return [
      {
        title: 'Active users',
        value: activeUsers,
        description: `${totalUsers} total users`,
        icon: <Users className="h-4 w-4" />, 
        trend: {
          label: `${inactiveUsers} inactive accounts`,
          isPositive: inactiveUsers === 0,
        },
      },
      {
        title: 'Teams engaged',
        value: activeTeams,
        description: `${totalTeams} teams overall`,
        icon: <ShieldCheck className="h-4 w-4" />,
        trend: {
          label: `${totalTeams - activeTeams} inactive teams`,
          isPositive: activeTeams >= totalTeams / 2,
        },
      },
      {
        title: 'Messages today',
        value: messagesToday,
        description: 'Secure threads across the org',
        icon: <MessageSquare className="h-4 w-4" />,
      },
      {
        title: 'Files shared',
        value: totalFiles,
        description: `${typeof storageUsedMb === 'number' ? storageUsedMb.toFixed(1) : '0.0'} MB storage used`,
        icon: <FileText className="h-4 w-4" />,
      },
    ]
  }, [statsQuery.data])

  return (
    <div className="space-y-10">
      <PageHeader
        title="Organizational overview"
        description="Monitor workforce activity, collaboration health, and policy compliance in real time."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <Link to={ROUTES.dashboard.auditLogs}>View audit trail</Link>
            </Button>
            <Button asChild>
              <Link to={ROUTES.dashboard.messaging}>Open messaging hub</Link>
            </Button>
          </div>
        }
      />

      <section>
        {statsQuery.isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-36 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {statCards.map((card) => (
              <StatCard key={card.title} {...card} />
            ))}
          </div>
        )}
      </section>

      <section className="grid gap-6 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Security & compliance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border bg-muted/50 p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-md bg-primary/10 p-2 text-primary">
                  <Activity className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Proactive monitoring enabled</p>
                  <p className="text-sm text-muted-foreground">
                    RBAC enforcement, session auditing, and anomaly detection are active.
                  </p>
                </div>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border bg-card p-4">
                <p className="text-xs font-semibold text-muted-foreground">Policy coverage</p>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-2xl font-semibold">100%</span>
                  <Badge variant="success">Up to date</Badge>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  All RBAC and access policies synced with OrgNet governance.
                </p>
              </div>
              <div className="rounded-lg border bg-card p-4">
                <p className="text-xs font-semibold text-muted-foreground">Override alerts</p>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-2xl font-semibold">0</span>
                  <Badge variant="secondary">Past 7 days</Badge>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  No emergency overrides triggered. Continue monitoring high-risk units.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Your leadership units</CardTitle>
          </CardHeader>
          <CardContent>
            {managedTeamsQuery.isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton key={index} className="h-14 rounded-md" />
                ))}
              </div>
            ) : managedTeamsQuery.data?.length ? (
              <ScrollArea className="max-h-64 pr-4">
                <ul className="space-y-3">
                  {managedTeamsQuery.data.map((team) => (
                    <li
                      key={team.id}
                      className="rounded-md border bg-muted/40 p-3 hover:bg-muted/60"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold">{team.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {team.memberCount} members • Manager: {team.manager.name}
                          </p>
                        </div>
                        <Badge variant="info">Team #{team.id}</Badge>
                      </div>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            ) : (
              <EmptyState
                title="No teams to supervise yet"
                description="Teams you manage will surface here for quick insight."
                action={
                  <Button variant="outline" asChild>
                    <Link to={ROUTES.dashboard.teams}>Create a team</Link>
                  </Button>
                }
              />
            )}
          </CardContent>
          <CardFooter className="justify-end">
            <Button variant="ghost" size="sm" asChild>
              <Link to={ROUTES.dashboard.teams}>View all teams</Link>
            </Button>
          </CardFooter>
        </Card>
      </section>
    </div>
  )
}

export default DashboardOverviewPage
