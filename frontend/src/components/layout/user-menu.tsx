import { LogOut, Settings, UserCog } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { RoleBadge } from '@/components/ui/role-badge'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { ROUTES } from '@/routes/paths'

const getInitials = (name?: string | null) => {
  if (!name) return 'U'
  const parts = name.trim().split(' ')
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase()
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export const UserMenu = () => {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()

  const handleSignOut = () => {
    signOut()
    navigate(ROUTES.auth.login)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex items-center gap-3 px-2">
          <Avatar className="h-9 w-9">
            <AvatarImage src={undefined} alt={user?.name} />
            <AvatarFallback>{getInitials(user?.name)}</AvatarFallback>
          </Avatar>
          <div className="hidden flex-col items-start text-left md:flex">
            <span className="text-sm font-medium leading-none">
              {user?.name ?? 'Unknown User'}
            </span>
            {user ? (
              <span className="text-xs text-muted-foreground">{user.email}</span>
            ) : null}
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="space-y-1">
            <p className="text-sm font-medium">{user?.name ?? 'Unknown User'}</p>
            <p className="text-xs text-muted-foreground">{user?.email ?? 'Not available'}</p>
            {user ? <RoleBadge role={user.role} /> : null}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => navigate(ROUTES.dashboard.settings)}>
          <Settings className="mr-2 h-4 w-4" />
          Settings
        </DropdownMenuItem>
        <DropdownMenuItem disabled>
          <UserCog className="mr-2 h-4 w-4" />
          Profile (coming soon)
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={handleSignOut} className="text-destructive focus:text-destructive">
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
