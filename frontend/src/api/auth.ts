import type { AuthResponse, User } from '@/types'
import { apiClient } from './client'
import { API_ENDPOINTS } from './endpoints'

export interface LoginPayload {
  email: string
  password: string
}

export interface ForgotPasswordPayload {
  email: string
}

export interface ResetPasswordPayload {
  token: string
  password: string
}

export interface RegisterPayload {
  name: string
  email: string
  password: string
}

export const login = async (payload: LoginPayload) => {
  const { data } = await apiClient.post<AuthResponse>(
    API_ENDPOINTS.auth.login,
    payload,
  )
  return data
}

export const register = async (payload: RegisterPayload) => {
  const { data } = await apiClient.post<AuthResponse>(
    API_ENDPOINTS.auth.register,
    payload,
  )
  return data
}

export const forgotPassword = async (payload: ForgotPasswordPayload) => {
  const { data } = await apiClient.post<{ message: string }>(
    API_ENDPOINTS.auth.forgotPassword,
    payload,
  )
  return data
}

export const resetPassword = async (payload: ResetPasswordPayload) => {
  const { data } = await apiClient.post<{ message: string }>(
    API_ENDPOINTS.auth.resetPassword,
    payload,
  )
  return data
}

export const fetchProfile = async () => {
  const { data } = await apiClient.get<User>(API_ENDPOINTS.auth.profile)
  return data
}

export const logout = async () => {
  await apiClient.post(API_ENDPOINTS.auth.logout)
}
