import { Badge } from '@/components/ui/badge'
import type { Role } from '@/utils/roles'
import { ROLE_LABELS } from '@/utils/roles'

const roleColors: Record<Role, 'default' | 'info' | 'warning' | 'success' | 'secondary'> = {
  ADMIN: 'default',
  MANAGER: 'info',
  EMPLOYEE: 'secondary',
  INTERN: 'warning',
}

interface RoleBadgeProps {
  role: Role
  className?: string
}

export const RoleBadge = ({ role, className }: RoleBadgeProps) => (
  <Badge className={className} variant={roleColors[role] ?? 'default'}>
    {ROLE_LABELS[role] ?? role}
  </Badge>
)
