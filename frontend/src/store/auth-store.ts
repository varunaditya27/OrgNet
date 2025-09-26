import { create, type StateCreator } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

import type { User } from '@/types'
import { clearStoredToken, getStoredToken, setStoredToken } from '@/utils/token'

interface AuthState {
  user: User | null
  accessToken: string
  isAuthenticating: boolean
  hasHydrated: boolean
  setAuthenticating: (state: boolean) => void
  setCredentials: (payload: { user: User; accessToken: string }) => void
  setAccessToken: (token: string) => void
  setUser: (user: User | null) => void
  hydrateFromStorage: () => void
  setHasHydrated: (value: boolean) => void
  signOut: () => void
}

const storeCreator: StateCreator<AuthState> = (set, get) => ({
  user: null,
  accessToken: '',
  isAuthenticating: false,
  hasHydrated: false,
  setAuthenticating: (state) => set({ isAuthenticating: state }),
  setCredentials: ({ user, accessToken }) => {
    set({ user, accessToken, isAuthenticating: false })
    setStoredToken(accessToken)
  },
  setAccessToken: (token: string) => {
    set({ accessToken: token })
    if (token) {
      setStoredToken(token)
    } else {
      clearStoredToken()
    }
  },
  setUser: (user) => set({ user }),
  hydrateFromStorage: () => {
    const token = get().accessToken || getStoredToken()
    if (token) {
      set({ accessToken: token, hasHydrated: true })
    } else {
      set({ hasHydrated: true })
    }
  },
  setHasHydrated: (value) => set({ hasHydrated: value }),
  signOut: () => {
    set({ user: null, accessToken: '' })
    clearStoredToken()
  },
})

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(storeCreator, {
      name: 'orgnet-auth',
      partialize: (state) => ({ user: state.user, accessToken: state.accessToken }),
      onRehydrateStorage: () => (state) => {
        state?.hydrateFromStorage()
        state?.setHasHydrated(true)
      },
    }),
  ),
)
