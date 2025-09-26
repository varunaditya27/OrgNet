import { type ReactNode, useCallback, useEffect, useMemo, useRef } from 'react'
import { io, type Socket } from 'socket.io-client'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import type { SendMessagePayload } from '@/api/messaging'
import { MessagingContext, type MessagingContextValue, type TypingTarget } from '@/contexts/messaging-context'
import { useAuth } from '@/hooks/useAuth'
import { API_BASE_URL } from '@/lib/utils'
import type { Message } from '@/types'
import { useMessagingStore, type PresenceRecord, type TypingIndicatorEntry } from '@/store/messaging-store'

const MESSAGING_NAMESPACE = '/messaging'
const TYPING_TIMEOUT_MS = 5000

export const MessagingProvider = ({ children }: { children: ReactNode }) => {
  const queryClient = useQueryClient()
  const { accessToken, user } = useAuth()

  const setConnected = useMessagingStore((state) => state.setConnected)
  const resetStore = useMessagingStore((state) => state.reset)
  const setTypingIndicator = useMessagingStore((state) => state.setTypingIndicator)
  const clearTypingIndicator = useMessagingStore((state) => state.clearTypingIndicator)
  const setOnlineUsers = useMessagingStore((state) => state.setOnlineUsers)
  const updatePresence = useMessagingStore((state) => state.updatePresence)
  const markMessageSeenInStore = useMessagingStore((state) => state.markMessageSeen)
  const isConnected = useMessagingStore((state) => state.isConnected)

  const socketRef = useRef<Socket | null>(null)
  const typingTimeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  useEffect(() => {
    const timeoutsMap = typingTimeoutsRef.current

    if (!accessToken) {
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
      }
      setConnected(false)
      timeoutsMap.forEach((timeoutId) => clearTimeout(timeoutId))
      timeoutsMap.clear()
      resetStore()
      return
    }

    const socket = io(`${API_BASE_URL}${MESSAGING_NAMESPACE}`, {
      auth: { token: accessToken },
      transports: ['websocket'],
    })

    socketRef.current = socket

    socket.on('connect', () => {
      setConnected(true)
      socket.emit('get_online_users')
    })

    socket.on('disconnect', () => {
      setConnected(false)
    })

    socket.on('connect_error', (error) => {
      toast.error(error?.message ?? 'Failed to connect to messaging service')
    })

    socket.on('online_users', (users: PresenceRecord[] = []) => {
      setOnlineUsers(users)
    })

    socket.on('user_presence_update', (presence: PresenceRecord) => {
      updatePresence(presence)
    })

    socket.on('typing_indicator', (payload: { conversationId?: string; userId?: number; userName?: string; isTyping?: boolean }) => {
      if (!payload?.conversationId || !payload.userId) return
      if (payload.userId === user?.id) return

      const { conversationId, userId, userName, isTyping } = payload
      const timeoutKey = `${conversationId}:${userId}`

      if (isTyping) {
        const entry: TypingIndicatorEntry = {
          userId,
          userName,
          updatedAt: Date.now(),
        }
        setTypingIndicator(conversationId, entry)

        if (timeoutsMap.has(timeoutKey)) {
          clearTimeout(timeoutsMap.get(timeoutKey)!)
        }

        const timeoutId = setTimeout(() => {
          clearTypingIndicator(conversationId, userId)
          timeoutsMap.delete(timeoutKey)
        }, TYPING_TIMEOUT_MS)

        timeoutsMap.set(timeoutKey, timeoutId)
      } else {
        clearTypingIndicator(conversationId, userId)
        if (timeoutsMap.has(timeoutKey)) {
          clearTimeout(timeoutsMap.get(timeoutKey)!)
          timeoutsMap.delete(timeoutKey)
        }
      }
    })

    socket.on('new_message', (message: Message) => {
      queryClient.invalidateQueries({ queryKey: ['messaging', 'messages'] })
      queryClient.invalidateQueries({ queryKey: ['messaging', 'conversations'] })

      if (message?.senderId && message.senderId !== user?.id && document.hidden) {
        toast.info(`${message.sender?.name ?? 'New message'}: ${message.content}`)
      }
    })

    socket.on('message_sent', () => {
      queryClient.invalidateQueries({ queryKey: ['messaging', 'messages'] })
      queryClient.invalidateQueries({ queryKey: ['messaging', 'conversations'] })
    })

    socket.on('message_read', (payload: { messageId?: number }) => {
      if (payload?.messageId) {
        markMessageSeenInStore(payload.messageId)
        queryClient.invalidateQueries({ queryKey: ['messaging', 'messages'] })
        queryClient.invalidateQueries({ queryKey: ['messaging', 'conversations'] })
      }
    })

    socket.on('error', (error: unknown) => {
      const message =
        typeof error === 'string'
          ? error
          : typeof error === 'object' && error && 'message' in error
            ? String((error as { message: string }).message)
            : 'Messaging service error'
      toast.error(message)
    })

    return () => {
      socket.removeAllListeners()
      socket.disconnect()
      socketRef.current = null
      timeoutsMap.forEach((timeoutId) => clearTimeout(timeoutId))
      timeoutsMap.clear()
      resetStore()
    }
  }, [accessToken, clearTypingIndicator, markMessageSeenInStore, queryClient, resetStore, setConnected, setOnlineUsers, setTypingIndicator, updatePresence, user?.id])

  const sendMessage = useCallback(async (payload: SendMessagePayload) => {
    const socket = socketRef.current
    if (!socket || !socket.connected) {
      throw new Error('Messaging service is unavailable')
    }
    socket.emit('send_message', payload)
    return true
  }, [])

  const startTyping = useCallback((target: TypingTarget) => {
    const socket = socketRef.current
    if (!socket || !socket.connected) return
    socket.emit('typing_start', target)
  }, [])

  const stopTyping = useCallback((target: TypingTarget) => {
    const socket = socketRef.current
    if (!socket || !socket.connected) return
    socket.emit('typing_stop', target)
  }, [])

  const markMessageRead = useCallback(async (messageId: number) => {
    const socket = socketRef.current
    if (!socket || !socket.connected) {
      return false
    }
    socket.emit('mark_message_read', { messageId })
    return true
  }, [])

  const requestOnlineUsers = useCallback(() => {
    const socket = socketRef.current
    if (!socket || !socket.connected) return
    socket.emit('get_online_users')
  }, [])

  const value = useMemo<MessagingContextValue>(
    () => ({
      isConnected,
      sendMessage,
      startTyping,
      stopTyping,
      markMessageRead,
      requestOnlineUsers,
    }),
    [isConnected, markMessageRead, requestOnlineUsers, sendMessage, startTyping, stopTyping],
  )

  return <MessagingContext.Provider value={value}>{children}</MessagingContext.Provider>
}
