import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

import type { AxiosError } from 'axios'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ||
  'http://localhost:3000'

export const getErrorMessage = (error: unknown, fallback = 'Something went wrong') => {
  if (!error) return fallback

  if (typeof error === 'string') return error

  if (error instanceof Error && error.message) {
    return error.message
  }

  const axiosError = error as AxiosError<{ message?: string; error?: string }>
  const responseMessage =
    axiosError.response?.data?.message || axiosError.response?.data?.error

  if (responseMessage) {
    return responseMessage
  }

  if (axiosError.response?.statusText) {
    return axiosError.response.statusText
  }

  return fallback
}
