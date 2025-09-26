import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { Spinner } from '@/components/ui/spinner'
import { useProfileQuery } from '@/hooks/api/auth'
import { useAuthStore } from '@/store/auth-store'
import type { Role } from '@/utils/roles'
import { canAccessRole } from '@/utils/roles'
import { ROUTES } from '@/routes/paths'

interface ProtectedRouteProps {
  allowedRoles?: Role[]
  redirectTo?: string
}

export const ProtectedRoute = ({
  allowedRoles,
  redirectTo = ROUTES.auth.login,
}: ProtectedRouteProps) => {
  const user = useAuthStore((state) => state.user)
  const accessToken = useAuthStore((state) => state.accessToken)
  const hasHydrated = useAuthStore((state) => state.hasHydrated)
  const location = useLocation()

  const profileQuery = useProfileQuery(Boolean(accessToken && !user))

  if (!hasHydrated || profileQuery.isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner />
      </div>
    )
  }

  if (!user) {
    return <Navigate to={redirectTo} replace state={{ from: location }} />
  }

  if (
    allowedRoles?.length &&
    !allowedRoles.some((role) => canAccessRole(user.role, role))
  ) {
    return <Navigate to={ROUTES.dashboard.home} replace />
  }

  return <Outlet />
}
