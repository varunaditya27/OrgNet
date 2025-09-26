import { create } from 'zustand'

export type PresenceStatus = 'online' | 'offline' | 'away'

export interface PresenceRecord {
  userId: number
  status: PresenceStatus
  lastSeen?: string | null
  timestamp?: string | null
}

export interface TypingIndicatorEntry {
  userId: number
  userName?: string | null
  updatedAt: number
}

interface MessagingState {
  isConnected: boolean
  typingByConversation: Record<string, Record<number, TypingIndicatorEntry>>
  presenceByUser: Record<number, PresenceRecord>
  seenMessages: Record<number, boolean>
  setConnected: (connected: boolean) => void
  setTypingIndicator: (conversationId: string, entry: TypingIndicatorEntry) => void
  clearTypingIndicator: (conversationId: string, userId: number) => void
  setOnlineUsers: (users: PresenceRecord[]) => void
  updatePresence: (record: PresenceRecord) => void
  markMessageSeen: (messageId: number) => void
  isMessageSeen: (messageId: number) => boolean
  reset: () => void
}

const createInitialState = () => ({
  isConnected: false,
  typingByConversation: {} as Record<string, Record<number, TypingIndicatorEntry>>,
  presenceByUser: {} as Record<number, PresenceRecord>,
  seenMessages: {} as Record<number, boolean>,
})

export const useMessagingStore = create<MessagingState>((set, get) => ({
  ...createInitialState(),
  setConnected: (connected) => set({ isConnected: connected }),
  setTypingIndicator: (conversationId, entry) =>
    set((state) => ({
      typingByConversation: {
        ...state.typingByConversation,
        [conversationId]: {
          ...(state.typingByConversation[conversationId] ?? {}),
          [entry.userId]: entry,
        },
      },
    })),
  clearTypingIndicator: (conversationId, userId) =>
    set((state) => {
      const conversationMap = { ...(state.typingByConversation[conversationId] ?? {}) }
      if (conversationMap[userId]) {
        delete conversationMap[userId]
      }
      return {
        typingByConversation: {
          ...state.typingByConversation,
          [conversationId]: conversationMap,
        },
      }
    }),
  setOnlineUsers: (users) =>
    set(() => {
      const map: Record<number, PresenceRecord> = {}
      users.forEach((user) => {
        map[user.userId] = { ...user }
      })
      return { presenceByUser: map }
    }),
  updatePresence: (record) =>
    set((state) => ({
      presenceByUser: {
        ...state.presenceByUser,
        [record.userId]: {
          ...(state.presenceByUser[record.userId] ?? {}),
          ...record,
        },
      },
    })),
  markMessageSeen: (messageId) =>
    set((state) => ({
      seenMessages: {
        ...state.seenMessages,
        [messageId]: true,
      },
    })),
  isMessageSeen: (messageId) => Boolean(get().seenMessages[messageId]),
  reset: () => set(createInitialState()),
}))
