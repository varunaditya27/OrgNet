import { NavLink } from 'react-router-dom'

import { getNavigationItems } from '@/config/navigation'
import type { Role } from '@/utils/roles'
import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'

interface SidebarProps {
  role?: Role | null
  onNavigate?: () => void
}

export const Sidebar = ({ role, onNavigate }: SidebarProps) => {
  const items = getNavigationItems(role)

  return (
    <div className="flex h-full flex-col">
      <div className="px-6 py-6">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">OrgNet</h2>
          <p className="text-sm text-muted-foreground">
            Secure collaboration
          </p>
        </div>
      </div>
      <ScrollArea className="flex-1">
        <nav className="flex flex-col gap-1 px-3 pb-6">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  'group inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-muted hover:text-foreground',
                  isActive
                    ? 'bg-muted text-foreground shadow-sm'
                    : 'text-muted-foreground',
                )
              }
            >
              <item.icon className="h-4 w-4" aria-hidden="true" />
              <span>{item.label}</span>
            </NavLink>
          ))}
          {items.length === 0 ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              Your role does not have dashboard privileges yet.
            </div>
          ) : null}
        </nav>
      </ScrollArea>
    </div>
  )
}
