import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { toast } from 'sonner'

import {
  fetchProfile,
  forgotPassword,
  login,
  logout,
  register,
  resetPassword,
} from '@/api/auth'
import type {
  ForgotPasswordPayload,
  LoginPayload,
  RegisterPayload,
  ResetPasswordPayload,
} from '@/api/auth'
import { getErrorMessage } from '@/lib/utils'
import { useAuthStore } from '@/store/auth-store'

export const AUTH_QUERY_KEYS = {
  profile: ['auth', 'profile'] as const,
}

export const useProfileQuery = (enabled = true) => {
  const setUser = useAuthStore((state) => state.setUser)
  const query = useQuery({
    queryKey: AUTH_QUERY_KEYS.profile,
    queryFn: fetchProfile,
    enabled,
    staleTime: 1000 * 60 * 5,
  })

  useEffect(() => {
    if (query.data) {
      setUser(query.data)
    }
  }, [query.data, setUser])

  return query
}

export const useLoginMutation = () => {
  const setCredentials = useAuthStore((state) => state.setCredentials)
  const setAuthenticating = useAuthStore((state) => state.setAuthenticating)
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: LoginPayload) => login(payload),
    onMutate: () => setAuthenticating(true),
    onSuccess: (data) => {
      setCredentials(data)
      queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEYS.profile })
      toast.success('Welcome back!')
    },
    onError: (error) => {
      toast.error(getErrorMessage(error))
    },
    onSettled: () => setAuthenticating(false),
  })
}

export const useRegisterMutation = () => {
  const setCredentials = useAuthStore((state) => state.setCredentials)
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: RegisterPayload) => register(payload),
    onSuccess: (data) => {
      setCredentials(data)
      queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEYS.profile })
      toast.success('Account created successfully')
    },
    onError: (error) => {
      toast.error(getErrorMessage(error))
    },
  })
}

export const useForgotPasswordMutation = () => {
  return useMutation({
    mutationFn: (payload: ForgotPasswordPayload) => forgotPassword(payload),
    onSuccess: (data) => {
      toast.success(data.message)
    },
    onError: (error) => {
      toast.error(getErrorMessage(error))
    },
  })
}

export const useResetPasswordMutation = () => {
  return useMutation({
    mutationFn: (payload: ResetPasswordPayload) => resetPassword(payload),
    onSuccess: (data) => {
      toast.success(data.message)
    },
    onError: (error) => {
      toast.error(getErrorMessage(error))
    },
  })
}

export const useLogoutMutation = () => {
  const queryClient = useQueryClient()
  const signOut = useAuthStore((state) => state.signOut)

  return useMutation({
    mutationFn: () => logout(),
    onSuccess: () => {
      signOut()
      queryClient.removeQueries({ queryKey: AUTH_QUERY_KEYS.profile })
    },
  })
}
