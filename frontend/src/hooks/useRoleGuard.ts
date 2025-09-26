import { useMemo } from 'react'

import { canAccessRole, type Role } from '@/utils/roles'
import { useAuthStore } from '@/store/auth-store'

export const useRoleGuard = (allowedRoles?: Role[]) => {
  const userRole = useAuthStore((state) => state.user?.role ?? null)

  const hasAccess = useMemo(() => {
    if (!allowedRoles || allowedRoles.length === 0) {
      return Boolean(userRole)
    }
    return allowedRoles.some((role) => canAccessRole(userRole ?? undefined, role))
  }, [allowedRoles, userRole])

  return { hasAccess }
}
