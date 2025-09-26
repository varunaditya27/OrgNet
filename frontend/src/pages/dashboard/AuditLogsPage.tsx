import { useMemo, useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Input } from '@/components/ui/input'
import { PageHeader } from '@/components/ui/page-header'
import { Pagination } from '@/components/ui/pagination'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useAuditLogsQuery } from '@/hooks/api/admin'

const PAGE_SIZE = 20

const AuditLogsPage = () => {
  const [search, setSearch] = useState('')
  const [entity, setEntity] = useState('')
  const [page, setPage] = useState(1)

  const params = useMemo(
    () => ({
      page,
      limit: PAGE_SIZE,
      userId: search ? Number.parseInt(search, 10) || undefined : undefined,
      entity: entity || undefined,
    }),
    [page, search, entity],
  )

  const logsQuery = useAuditLogsQuery(params)
  const logs = logsQuery.data?.data ?? []
  const pagination = logsQuery.data?.pagination

  const handleFilter = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    setSearch((formData.get('userSearch') as string | null)?.trim() ?? '')
    setEntity((formData.get('entitySearch') as string | null)?.trim() ?? '')
    setPage(1)
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Audit trail"
        description="Immutable record of privileged actions, overrides, and sensitive events."
        actions={
          <Button variant="outline" onClick={() => logsQuery.refetch()} disabled={logsQuery.isFetching}>
            {logsQuery.isFetching ? 'Refreshing…' : 'Refresh'}
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleFilter}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            <div>
              <label htmlFor="userSearch" className="text-sm font-medium text-muted-foreground">
                User ID
              </label>
              <Input id="userSearch" name="userSearch" placeholder="Filter by user ID" defaultValue={search} className="mt-2" />
            </div>
            <div>
              <label htmlFor="entitySearch" className="text-sm font-medium text-muted-foreground">
                Entity
              </label>
              <Input
                id="entitySearch"
                name="entitySearch"
                placeholder="e.g. USER, TEAM, FILE"
                defaultValue={entity}
                className="mt-2"
              />
            </div>
            <div className="flex items-end gap-2">
              <Button type="submit" variant="secondary">
                Apply
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setSearch('')
                  setEntity('')
                  setPage(1)
                }}
              >
                Reset
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Event log</CardTitle>
        </CardHeader>
        <CardContent>
          {logsQuery.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-12 rounded-md" />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <EmptyState
              title="No audit events"
              description="Activity will appear here as privileged actions occur."
            />
          ) : (
            <ScrollArea className="-mx-4 max-h-[70vh] overflow-x-auto">
              <div className="min-w-[820px] px-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Entity</TableHead>
                      <TableHead>Metadata</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>
                          {new Date(entry.timestamp).toLocaleString(undefined, {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-medium text-foreground">{entry.user.name}</div>
                          <div className="text-xs text-muted-foreground">{entry.user.email}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{entry.action}</Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <span className="text-sm font-medium text-foreground">{entry.entity}</span>
                            {entry.entityId ? (
                              <span className="ml-2 text-xs text-muted-foreground">#{entry.entityId}</span>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="text-xs text-muted-foreground">
                            {entry.details || '—'}
                          </p>
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
    </div>
  )
}

export default AuditLogsPage
