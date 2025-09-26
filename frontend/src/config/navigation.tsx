import {
  FileText,
  FolderKanban,
  Home,
  MessagesSquare,
  ScrollText,
  Settings,
  ShieldCheck,
  Users,
} from 'lucide-react'

import type { Role } from '@/utils/roles'
import { ROUTES } from '@/routes/paths'

export type NavigationItem = {
  label: string
  description?: string
  to: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  roles: Role[]
}

export const NAVIGATION_ITEMS: NavigationItem[] = [
  {
    label: 'Overview',
    description: 'Metrics and organizational insights',
    to: ROUTES.dashboard.home,
    icon: Home,
    roles: ['ADMIN', 'MANAGER', 'EMPLOYEE', 'INTERN'],
  },
  {
    label: 'Users',
    description: 'Manage roles, hierarchy, and profiles',
    to: ROUTES.dashboard.users,
    icon: Users,
    roles: ['ADMIN', 'MANAGER'],
  },
  {
    label: 'Teams',
    description: 'Organize teams and reporting structures',
    to: ROUTES.dashboard.teams,
    icon: FolderKanban,
    roles: ['ADMIN', 'MANAGER'],
  },
  {
    label: 'Messaging',
    description: 'Direct and group communication',
    to: ROUTES.dashboard.messaging,
    icon: MessagesSquare,
    roles: ['ADMIN', 'MANAGER', 'EMPLOYEE', 'INTERN'],
  },
  {
    label: 'Files',
    description: 'Secure file sharing and permissions',
    to: ROUTES.dashboard.files,
    icon: FileText,
    roles: ['ADMIN', 'MANAGER', 'EMPLOYEE'],
  },
  {
    label: 'Admin',
    description: 'System overrides and controls',
    to: ROUTES.dashboard.admin,
    icon: ShieldCheck,
    roles: ['ADMIN'],
  },
  {
    label: 'Audit Logs',
    description: 'Track overrides and sensitive events',
    to: ROUTES.dashboard.auditLogs,
  icon: ScrollText,
    roles: ['ADMIN'],
  },
  {
    label: 'Settings',
    description: 'Personal and notification preferences',
    to: ROUTES.dashboard.settings,
    icon: Settings,
    roles: ['ADMIN', 'MANAGER', 'EMPLOYEE', 'INTERN'],
  },
]

export const getNavigationItems = (role?: Role | null) => {
  if (!role) return []
  return NAVIGATION_ITEMS.filter((item) => item.roles.includes(role))
}
