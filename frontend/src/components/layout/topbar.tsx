import { Command as CommandIcon, Search } from 'lucide-react'
import { useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Command, CommandDialog, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command'
import { RoleBadge } from '@/components/ui/role-badge'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { useAuth } from '@/hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import { getNavigationItems } from '@/config/navigation'
import { ROUTES } from '@/routes/paths'

export const Topbar = () => {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const { user } = useAuth()

  const navItems = useMemo(() => getNavigationItems(user?.role), [user?.role])

  return (
    <div className="flex items-center gap-3">
      <Button
        variant="outline"
        className="hidden items-center gap-2 text-sm text-muted-foreground md:flex"
        onClick={() => setOpen(true)}
      >
        <Search className="h-4 w-4" />
        Quick search
        <span className="ml-2 flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">
          <CommandIcon className="h-3 w-3" />
          K
        </span>
      </Button>
      {user ? <RoleBadge role={user.role} /> : null}
      <ThemeToggle />
      <CommandDialog open={open} onOpenChange={setOpen}>
        <Command>
          <CommandInput placeholder="Search actions or navigate…" />
          <CommandGroup heading="Navigation">
            {navItems.map((item) => (
              <CommandItem
                key={item.to}
                value={item.label}
                onSelect={() => {
                  navigate(item.to)
                  setOpen(false)
                }}
              >
                <item.icon className="mr-2 h-4 w-4" />
                {item.label}
              </CommandItem>
            ))}
            <CommandItem
              value="Settings"
              onSelect={() => {
                navigate(ROUTES.dashboard.settings)
                setOpen(false)
              }}
            >
              <CommandIcon className="mr-2 h-4 w-4" /> Settings
            </CommandItem>
          </CommandGroup>
        </Command>
      </CommandDialog>
    </div>
  )
}
