import { createContext } from 'react'

import type { SendMessagePayload } from '@/api/messaging'

export interface TypingTarget {
  receiverId?: number
  groupId?: number
}

export interface MessagingContextValue {
  isConnected: boolean
  sendMessage: (payload: SendMessagePayload) => Promise<boolean>
  startTyping: (target: TypingTarget) => void
  stopTyping: (target: TypingTarget) => void
  markMessageRead: (messageId: number) => Promise<boolean>
  requestOnlineUsers: () => void
}

export const MessagingContext = createContext<MessagingContextValue | undefined>(undefined)
