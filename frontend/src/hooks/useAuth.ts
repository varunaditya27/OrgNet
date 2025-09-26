import { useMemo } from 'react'

import { useAuthStore } from '@/store/auth-store'

export const useAuth = () => {
  const user = useAuthStore((state) => state.user)
  const accessToken = useAuthStore((state) => state.accessToken)
  const isAuthenticating = useAuthStore((state) => state.isAuthenticating)
  const hasHydrated = useAuthStore((state) => state.hasHydrated)
  const signOut = useAuthStore((state) => state.signOut)
  const setCredentials = useAuthStore((state) => state.setCredentials)
  const setAccessToken = useAuthStore((state) => state.setAccessToken)
  const setUser = useAuthStore((state) => state.setUser)

  return useMemo(
    () => ({
      user,
      accessToken,
      isAuthenticating,
      hasHydrated,
      signOut,
      setCredentials,
      setAccessToken,
      setUser,
    }),
    [
      user,
      accessToken,
      isAuthenticating,
      hasHydrated,
      signOut,
      setCredentials,
      setAccessToken,
      setUser,
    ],
  )
}
