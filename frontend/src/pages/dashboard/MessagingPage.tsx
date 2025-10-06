import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { PageHeader } from '@/components/ui/page-header'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { NewConversationDialog } from '@/components/messaging/new-conversation-dialog'
import { useConversationsQuery, useMessagesQuery, useSendMessageMutation } from '@/hooks/api/messaging'
import type { MessagesQueryParams } from '@/api/messaging'
import { useMessaging } from '@/hooks/useMessaging'
import { useAuth } from '@/hooks/useAuth'
import {
  useMessagingStore,
  type PresenceStatus,
  type TypingIndicatorEntry,
} from '@/store/messaging-store'
import type { ConversationSummary, Message } from '@/types'

const messageSchema = z.object({
  content: z.string().min(1, 'Enter a message before sending'),
})

type MessageFormValues = z.infer<typeof messageSchema>

const getConversationKey = (conversation: ConversationSummary): number | null => {
  if (conversation.isGroup) {
    return conversation.groupId ?? null
  }
  return conversation.participantId ?? null
}

const getConversationIdentifier = (
  conversation: ConversationSummary | null,
  currentUserId?: number,
): string | null => {
  if (!conversation) return null
  if (conversation.isGroup) {
    return conversation.groupId ? `group:${conversation.groupId}` : null
  }
  if (!currentUserId || !conversation.participantId) return null
  const sorted = [conversation.participantId, currentUserId].sort((a, b) => a - b)
  return `direct:${sorted[0]}:${sorted[1]}`
}

const PRESENCE_COLOR: Record<PresenceStatus, string> = {
  online: 'bg-emerald-500',
  away: 'bg-amber-500',
  offline: 'bg-muted-foreground/50',
}

const MessagingPage = () => {
  const { user } = useAuth()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedKey, setSelectedKey] = useState<number | null>(null)

  const conversationsQuery = useConversationsQuery({
    search: searchTerm || undefined,
  })

  const conversations = useMemo(() => conversationsQuery.data ?? [], [conversationsQuery.data])

  const selectedConversation = useMemo(() => {
    if (!selectedKey) return null
    return conversations.find((conversation) => getConversationKey(conversation) === selectedKey) ?? null
  }, [conversations, selectedKey])

  useEffect(() => {
    if (!selectedConversation && conversations.length > 0) {
      const firstKey = conversations
        .map(getConversationKey)
        .find((key) => key !== null)
      if (firstKey) {
        setSelectedKey(firstKey)
      }
    }
  }, [conversations, selectedConversation])

  const { isConnected, markMessageRead, requestOnlineUsers } = useMessaging()
  const presenceByUser = useMessagingStore((state) => state.presenceByUser)
  const typingByConversation = useMessagingStore((state) => state.typingByConversation)
  const markMessageSeenInStore = useMessagingStore((state) => state.markMessageSeen)
  const isMessageSeen = useMessagingStore((state) => state.isMessageSeen)
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)
  const previousScrollMetricsRef = useRef<{ height: number; top: number } | null>(null)

  const selectedConversationId = useMemo(
    () => getConversationIdentifier(selectedConversation, user?.id),
    [selectedConversation, user?.id],
  )

  const typingEntries = useMemo<TypingIndicatorEntry[]>(() => {
    if (!selectedConversationId) return []
    const entries = typingByConversation[selectedConversationId]
    return entries ? Object.values(entries) : []
  }, [selectedConversationId, typingByConversation])

  const messageQueryParams = useMemo<MessagesQueryParams>(() => {
    if (!selectedConversation) {
      return { limit: 50 }
    }

    if (selectedConversation.isGroup) {
      return {
        groupId: selectedConversation.groupId ?? undefined,
        limit: 50,
      }
    }

    return {
      receiverId: selectedConversation.participantId ?? undefined,
      limit: 50,
    }
  }, [selectedConversation])

  const messagesQuery = useMessagesQuery(messageQueryParams)
  const { hasNextPage, isFetchingNextPage, fetchNextPage, data: paginatedMessages } =
    messagesQuery

  const messages = useMemo(() => {
    const pages = paginatedMessages?.pages ?? []
    const combined = pages.flatMap((page) => page.data)
    return combined.sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    )
  }, [paginatedMessages])

  const isInitialLoading = messagesQuery.isPending

  const loadOlderMessages = useCallback(() => {
    const container = scrollContainerRef.current
    if (!container || !hasNextPage || isFetchingNextPage) {
      return
    }

    previousScrollMetricsRef.current = {
      height: container.scrollHeight,
      top: container.scrollTop,
    }

    void fetchNextPage()
  }, [fetchNextPage, hasNextPage, isFetchingNextPage])

  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const handleScroll = () => {
      if (container.scrollTop <= 120 && container.scrollHeight > container.clientHeight) {
        loadOlderMessages()
      }
    }

    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [loadOlderMessages])

  useEffect(() => {
    if (isFetchingNextPage) {
      return
    }

    const container = scrollContainerRef.current
    if (!container || !previousScrollMetricsRef.current) {
      return
    }

    const { height, top } = previousScrollMetricsRef.current
    const heightDiff = container.scrollHeight - height
    container.scrollTop = top + heightDiff
    previousScrollMetricsRef.current = null
  }, [isFetchingNextPage, paginatedMessages])

  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return
    container.scrollTop = container.scrollHeight
  }, [selectedConversationId])

  useEffect(() => {
    if (!isConnected) return
    requestOnlineUsers()
    const handleVisibility = () => {
      if (!document.hidden) {
        requestOnlineUsers()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [isConnected, requestOnlineUsers])

  useEffect(() => {
    if (!selectedConversation || !isConnected) return
    messages.forEach((message) => {
      if (message.senderId === user?.id) return
      if (isMessageSeen(message.id)) return
      void markMessageRead(message.id).then((success) => {
        if (success) {
          markMessageSeenInStore(message.id)
        }
      })
    })
  }, [isConnected, isMessageSeen, markMessageRead, markMessageSeenInStore, messages, selectedConversation, user?.id])

  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const value = (formData.get('search') as string | null)?.trim() ?? ''
    setSearchTerm(value)
  }

  const handleConversationCreated = useCallback((receiverId?: number, groupId?: number) => {
    // Refetch conversations to include the new one
    void conversationsQuery.refetch()

    // Find and select the new conversation
    setTimeout(() => {
      const newConversation = conversations.find(conv => {
        if (groupId) {
          return conv.isGroup && conv.groupId === groupId
        }
        if (receiverId) {
          return !conv.isGroup && conv.participantId === receiverId
        }
        return false
      })

      if (newConversation) {
        const key = getConversationKey(newConversation)
        if (key) {
          setSelectedKey(key)
        }
      }
    }, 500) // Small delay to allow the conversation list to update
  }, [conversations, conversationsQuery])

  return (
    <div className="space-y-8">
      <PageHeader
        title="Messaging hub"
        description="Secure direct messages and group collaboration across your organization."
        actions={
          <div className="flex items-center gap-2">
            <ConnectionStatusBadge connected={isConnected} />
            <Button
              variant="outline"
              onClick={() => conversationsQuery.refetch()}
              disabled={conversationsQuery.isFetching}
            >
              {conversationsQuery.isFetching ? 'Refreshing…' : 'Refresh list'}
            </Button>
            <NewConversationDialog onConversationCreated={handleConversationCreated} />
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
        <Card className="lg:h-[calc(100vh-220px)]">
          <CardHeader>
            <CardTitle>Conversations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSearch} className="flex gap-2">
              <Input
                name="search"
                placeholder="Search conversations"
                defaultValue={searchTerm}
              />
              <Button type="submit" variant="secondary">
                Search
              </Button>
            </form>

            <ScrollArea className="h-[55vh] max-h-[500px] pr-4">
              {conversationsQuery.isLoading ? (
                <div className="flex h-32 items-center justify-center">
                  <Spinner />
                </div>
              ) : conversations.length === 0 ? (
                <EmptyState
                  title="No conversations yet"
                  description="Start a new conversation by selecting a teammate from the directory."
                />
              ) : (
                <ul className="space-y-2">
                  {conversations.map((conversation) => {
                    const key = getConversationKey(conversation)
                    if (!key) return null
                    const isActive = selectedKey === key
                    const presenceStatus: PresenceStatus | undefined = !conversation.isGroup
                      ? presenceByUser[conversation.participantId]?.status ?? 'offline'
                      : undefined
                    return (
                      <li key={key}>
                        <button
                          type="button"
                          onClick={() => setSelectedKey(key)}
                          className={`w-full rounded-md border px-3 py-2 text-left transition hover:border-primary hover:bg-primary/5 ${isActive ? 'border-primary bg-primary/10' : 'border-transparent bg-muted/40'}`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-start gap-3">
                              {!conversation.isGroup ? (
                                <PresenceDot status={presenceStatus} />
                              ) : (
                                <span className="mt-1 h-2 w-2 rounded-full bg-primary/40" />
                              )}
                              <div>
                                <p className="text-sm font-semibold text-foreground">
                                  {conversation.participantName}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {conversation.lastMessage?.content ?? 'No messages yet'}
                                </p>
                              </div>
                            </div>
                            {conversation.unreadCount > 0 ? (
                              <Badge variant="info">{conversation.unreadCount}</Badge>
                            ) : null}
                          </div>
                          {conversation.isGroup ? (
                            <p className="mt-1 text-xs text-muted-foreground">Group channel</p>
                          ) : (
                            <p className="mt-1 text-xs text-muted-foreground">{conversation.participantEmail}</p>
                          )}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="lg:h-[calc(100vh-220px)]">
          <CardHeader>
            <CardTitle>
              {selectedConversation?.participantName ?? 'Select a conversation'}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex h-full flex-col gap-4">
            {!selectedConversation ? (
              <EmptyState
                title="No conversation selected"
                description="Choose a teammate or group from the left to see messages."
              />
            ) : (
              <>
                <div
                  ref={scrollContainerRef}
                  className="flex-1 overflow-y-auto rounded-md border bg-muted/30 p-4"
                >
                  {isInitialLoading ? (
                    <div className="flex h-full items-center justify-center">
                      <Spinner />
                    </div>
                  ) : messages.length === 0 ? (
                    <EmptyState
                      title="Start the conversation"
                      description="No messages yet. Send the first one to kick things off."
                    />
                  ) : (
                    <div className="space-y-3">
                      {hasNextPage ? (
                        <div className="text-center text-xs text-muted-foreground">
                          {isFetchingNextPage
                            ? 'Loading previous messages…'
                            : 'Scroll up for earlier history'}
                        </div>
                      ) : null}
                      {messages.map((message) => (
                        <MessageBubble key={message.id} message={message} currentUserId={user?.id} />
                      ))}
                    </div>
                  )}
                </div>

                {typingEntries.length > 0 ? (
                  <TypingIndicator entries={typingEntries} conversation={selectedConversation} />
                ) : null}

                {!isConnected ? (
                  <div className="rounded-md border border-dashed border-muted-foreground/30 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                    Realtime connection currently offline. Messages will send via secure REST until the
                    live connection resumes.
                  </div>
                ) : null}

                <MessageComposer
                  conversation={selectedConversation}
                  onMessageSent={() => messagesQuery.refetch()}
                />
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default MessagingPage

const ConnectionStatusBadge = ({ connected }: { connected: boolean }) => (
  <span
    className={`flex items-center gap-1 rounded-full border px-2 py-1 text-xs ${connected ? 'border-emerald-500/60 text-emerald-600 dark:text-emerald-400' : 'border-muted-foreground/40 text-muted-foreground'}`}
  >
    <span
      className={`h-2 w-2 rounded-full ${connected ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground/50'}`}
    />
    {connected ? 'Live' : 'Offline'}
  </span>
)

const PresenceDot = ({ status }: { status?: PresenceStatus }) => {
  const color = status ? PRESENCE_COLOR[status] ?? PRESENCE_COLOR.offline : PRESENCE_COLOR.offline
  return <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${color}`} />
}

const TypingIndicator = ({
  entries,
  conversation,
}: {
  entries: TypingIndicatorEntry[]
  conversation: ConversationSummary
}) => {
  if (entries.length === 0) return null
  const uniqueNames = Array.from(
    new Set(entries.map((entry) => entry.userName).filter((name): name is string => Boolean(name))),
  )
  const label =
    uniqueNames.length > 0
      ? uniqueNames.join(', ')
      : conversation.isGroup
        ? 'Someone'
        : conversation.participantName
  const verb = uniqueNames.length > 1 ? 'are' : 'is'

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span className="flex h-2 w-2 animate-pulse rounded-full bg-primary" />
      <span>
        {label} {verb} typing…
      </span>
    </div>
  )
}

const MessageBubble = ({ message, currentUserId }: { message: Message; currentUserId?: number }) => {
  const isOwn = message.senderId === currentUserId
  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[75%] rounded-lg px-3 py-2 text-sm shadow-sm ${isOwn ? 'bg-primary text-primary-foreground' : 'bg-card text-foreground'}`}
      >
        {!isOwn ? (
          <p className="text-xs font-medium text-muted-foreground">{message.sender.name}</p>
        ) : null}
        <p>{message.content}</p>
        <span className="mt-1 block text-right text-[10px] text-muted-foreground">
          {new Date(message.timestamp).toLocaleTimeString(undefined, {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>
    </div>
  )
}

interface MessageComposerProps {
  conversation: ConversationSummary
  onMessageSent: () => void
}

const MessageComposer = ({ conversation, onMessageSent }: MessageComposerProps) => {
  const { isConnected, sendMessage, startTyping, stopTyping } = useMessaging()
  const form = useForm<MessageFormValues>({
    resolver: zodResolver(messageSchema),
    defaultValues: { content: '' },
  })
  const sendMutation = useSendMessageMutation()
  const [isRealtimeSending, setIsRealtimeSending] = useState(false)
  const [hasNotifiedTyping, setHasNotifiedTyping] = useState(false)

  const typingTarget = useMemo(() => {
    if (!conversation) return null
    if (conversation.isGroup) {
      return conversation.groupId ? { groupId: conversation.groupId } : null
    }
    return conversation.participantId ? { receiverId: conversation.participantId } : null
  }, [conversation])

  const contentValue = form.watch('content')

  useEffect(() => {
    if (!typingTarget || !isConnected) {
      if (hasNotifiedTyping && typingTarget) {
        stopTyping(typingTarget)
        setHasNotifiedTyping(false)
      }
      return
    }

    if (contentValue && !hasNotifiedTyping) {
      startTyping(typingTarget)
      setHasNotifiedTyping(true)
    } else if (!contentValue && hasNotifiedTyping) {
      stopTyping(typingTarget)
      setHasNotifiedTyping(false)
    }

    return () => {
      if (hasNotifiedTyping && typingTarget) {
        stopTyping(typingTarget)
      }
    }
  }, [contentValue, hasNotifiedTyping, isConnected, startTyping, stopTyping, typingTarget])

  const onSubmit = async (values: MessageFormValues) => {
    const payload: { content: string; receiverId?: number; groupId?: number } = {
      content: values.content,
    }
    if (conversation.isGroup) {
      if (!conversation.groupId) return
      payload.groupId = conversation.groupId
    } else {
      payload.receiverId = conversation.participantId
    }

    let delivered = false

    try {
      if (isConnected) {
        try {
          setIsRealtimeSending(true)
          await sendMessage(payload)
          delivered = true
        } catch (error) {
          console.error('Realtime send failed, falling back to REST', error)
        } finally {
          setIsRealtimeSending(false)
        }
      }

      if (!delivered) {
        await sendMutation.mutateAsync(payload)
        delivered = true
      }

      if (delivered) {
        form.reset({ content: '' })
        onMessageSent()
      }
    } finally {
      if (typingTarget) {
        stopTyping(typingTarget)
        setHasNotifiedTyping(false)
      }
    }
  }

  const isSending = sendMutation.isPending || isRealtimeSending

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-3 rounded-md border bg-muted/40 p-3"
      >
        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs uppercase text-muted-foreground">Message</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Write a secure message"
                  autoComplete="off"
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            Press Enter to send. Shift + Enter for a new line.
          </span>
          <Button type="submit" disabled={isSending}>
            {isSending ? 'Sending…' : 'Send'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
