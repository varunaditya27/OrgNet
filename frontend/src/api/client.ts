import axios, { type AxiosRequestHeaders } from 'axios'

import { API_BASE_URL } from '@/lib/utils'
import { useAuthStore } from '@/store/auth-store'
import { clearStoredToken, getStoredToken, setStoredToken } from '@/utils/token'

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
})

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken || getStoredToken()
  if (token) {
    config.headers = {
      ...config.headers,
      Authorization: `Bearer ${token}`,
    } as AxiosRequestHeaders
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => {
    const token = (
      response.headers['x-access-token'] ?? response.data?.accessToken
    ) as
      | string
      | undefined
    if (token) {
      useAuthStore.getState().setAccessToken(token)
      setStoredToken(token)
    }
    return response
  },
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().signOut()
      clearStoredToken()
    }
    return Promise.reject(error)
  },
)
