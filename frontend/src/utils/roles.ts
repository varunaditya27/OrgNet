export const ROLES = ['ADMIN', 'MANAGER', 'EMPLOYEE', 'INTERN'] as const

export type Role = (typeof ROLES)[number]

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Administrator',
  MANAGER: 'Manager',
  EMPLOYEE: 'Employee',
  INTERN: 'Intern',
}

export const ROLE_ORDER: Role[] = [...ROLES]

export const canAccessRole = (userRole?: Role | null, requiredRole?: Role) => {
  if (!userRole || !requiredRole) return false
  return ROLE_ORDER.indexOf(userRole) <= ROLE_ORDER.indexOf(requiredRole)
}
