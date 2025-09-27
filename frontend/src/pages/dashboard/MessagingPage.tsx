import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { MessageSquare, Plus, Users } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
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
import { Checkbox } from '@/components/ui/checkbox'
import { useConversationsQuery, useMessagesQuery, useSendMessageMutation, useCreateGroupMutation, useGroupsQuery } from '@/hooks/api/messaging'
import { useAdminUsersQuery } from '@/hooks/api/admin'
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

const groupSchema = z.object({
  name: z.string().min(2, 'Group name must be at least 2 characters'),
  description: z.string().optional(),
  memberIds: z.array(z.number()).min(1, 'Select at least one member'),
})

type MessageFormValues = z.infer<typeof messageSchema>
type GroupFormValues = z.infer<typeof groupSchema>

const getConversationKey = (conversation: ConversationSummary): string => {
  if (conversation.isGroup && conversation.groupId) {
    return `group:${conversation.groupId}`
  }
  return `direct:${conversation.participantId}`
}

const getConversationIdentifier = (
  conversation: ConversationSummary | null,
  currentUserId?: number,
): string | null => {
  if (!conversation) return null
  if (conversation.isGroup && conversation.groupId) {
    return `group:${conversation.groupId}`
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
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [createGroupOpen, setCreateGroupOpen] = useState(false)

  const conversationsQuery = useConversationsQuery({
    search: searchTerm || undefined,
  })

  const groupsQuery = useGroupsQuery()
  const usersQuery = useAdminUsersQuery()

  // Combine direct conversations and groups
  const allConversations = useMemo(() => {
    const directConversations = conversationsQuery.data ?? []
    const groups = groupsQuery.data ?? []
    
    const groupConversations: ConversationSummary[] = groups.map(group => ({
      participantId: 0, // Not used for groups
      participantName: group.name,
      participantEmail: group.description || `${group.members.length} members`,
      lastMessage: undefined, // Could be enhanced to show last group message
      unreadCount: 0,
      isGroup: true,
      groupId: group.id,
    }))

    return [...directConversations, ...groupConversations]
  }, [conversationsQuery.data, groupsQuery.data])

  const selectedConversation = useMemo(() => {
    if (!selectedKey) return null
    return allConversations.find((conversation) => getConversationKey(conversation) === selectedKey) ?? null
  }, [allConversations, selectedKey])

  useEffect(() => {
    if (!selectedConversation && allConversations.length > 0) {
      const firstKey = getConversationKey(allConversations[0])
      setSelectedKey(firstKey)
    }
  }, [allConversations, selectedConversation])

  const { isConnected, markMessageRead, requestOnlineUsers } = useMessaging()
  const presenceByUser = useMessagingStore((state) => state.presenceByUser)
  const typingByConversation = useMessagingStore((state) => state.typingByConversation)
  const markMessageSeenInStore = useMessagingStore((state) => state.markMessageSeen)
  const isMessageSeen = useMessagingStore((state) => state.isMessageSeen)

  const selectedConversationId = useMemo(
    () => getConversationIdentifier(selectedConversation, user?.id),
    [selectedConversation, user?.id],
  )

  const typingEntries = useMemo<TypingIndicatorEntry[]>(() => {
    if (!selectedConversationId) return []
    const entries = typingByConversation[selectedConversationId]
    return entries ? Object.values(entries) : []
  }, [selectedConversationId, typingByConversation])

  // Get messages for selected conversation
  const messagesParams = useMemo(() => {
    if (!selectedConversation) return { receiverId: 0 }
    if (selectedConversation.isGroup && selectedConversation.groupId) {
      return { groupId: selectedConversation.groupId }
    }
    return { receiverId: selectedConversation.participantId }
  }, [selectedConversation])

  const messagesQuery = useMessagesQuery({
    ...messagesParams,
    page: 1,
    limit: 50,
  })

  const messages = useMemo(() => messagesQuery.data?.messages ?? [], [messagesQuery.data])

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
              onClick={() => setCreateGroupOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Create group
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                conversationsQuery.refetch()
                groupsQuery.refetch()
              }}
              disabled={conversationsQuery.isFetching || groupsQuery.isFetching}
            >
              {conversationsQuery.isFetching || groupsQuery.isFetching ? 'Refreshing…' : 'Refresh'}
            </Button>
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
              {conversationsQuery.isLoading || groupsQuery.isLoading ? (
                <div className="flex h-32 items-center justify-center">
                  <Spinner />
                </div>
              ) : allConversations.length === 0 ? (
                <EmptyState
                  title="No conversations yet"
                  description="Start a new conversation by creating a group or messaging a teammate."
                  action={
                    <Button variant="outline" onClick={() => setCreateGroupOpen(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Create group
                    </Button>
                  }
                />
              ) : (
                <ul className="space-y-2">
                  {allConversations.map((conversation) => {
                    const key = getConversationKey(conversation)
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
                                <Users className="mt-1 h-4 w-4 text-primary/60" />
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
                          <p className="mt-1 text-xs text-muted-foreground">
                            {conversation.isGroup ? 'Group channel' : conversation.participantEmail}
                          </p>
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
            <CardTitle className="flex items-center gap-2">
              {selectedConversation?.isGroup ? (
                <Users className="h-5 w-5" />
              ) : (
                <MessageSquare className="h-5 w-5" />
              )}
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
                <ScrollArea className="flex-1 rounded-md border bg-muted/30 p-4">
                  {messagesQuery.isLoading ? (
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
                      {messages.map((message) => (
                        <MessageBubble key={message.id} message={message} currentUserId={user?.id} />
                      ))}
                    </div>
                  )}
                </ScrollArea>

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
                  onMessageSent={() => {
                    messagesQuery.refetch()
                    conversationsQuery.refetch()
                  }}
                />
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <CreateGroupDialog
        open={createGroupOpen}
        onOpenChange={setCreateGroupOpen}
        users={usersQuery.data ?? []}
        onCreated={() => {
          setCreateGroupOpen(false)
          groupsQuery.refetch()
          conversationsQuery.refetch()
        }}
      />
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
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const typingTarget = useMemo(() => {
    if (!conversation) return null
    if (conversation.isGroup && conversation.groupId) {
      return { groupId: conversation.groupId }
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

    // Clear typing indicator after 3 seconds of no typing
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    if (contentValue && hasNotifiedTyping) {
      typingTimeoutRef.current = setTimeout(() => {
        if (typingTarget) {
          stopTyping(typingTarget)
          setHasNotifiedTyping(false)
        }
      }, 3000)
    }

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }, [contentValue, hasNotifiedTyping, isConnected, startTyping, stopTyping, typingTarget])

  const onSubmit = async (values: MessageFormValues) => {
    const payload: { content: string; receiverId?: number; groupId?: number } = {
      content: values.content,
    }
    if (conversation.isGroup && conversation.groupId) {
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

interface CreateGroupDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  users: Array<{ id: number; name: string; email: string; role: string }>
  onCreated: () => void
}

const CreateGroupDialog = ({ open, onOpenChange, users, onCreated }: CreateGroupDialogProps) => {
  const form = useForm<GroupFormValues>({
    resolver: zodResolver(groupSchema),
    defaultValues: {
      name: '',
      description: '',
      memberIds: [],
    },
  })
  const createMutation = useCreateGroupMutation()

  const onSubmit = async (values: GroupFormValues) => {
    await createMutation.mutateAsync(values)
    form.reset()
    onCreated()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Create group</DialogTitle>
          <DialogDescription>
            Start a secure group conversation with your teammates.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Group name</FormLabel>
                  <FormControl>
                    <Input placeholder="Project Alpha Team" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Purpose or context" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="memberIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Members</FormLabel>
                  <FormControl>
                    <ScrollArea className="max-h-48 rounded-md border p-3">
                      <div className="space-y-2">
                        {users.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No users available.</p>
                        ) : (
                          users.map((user) => {
                            const checked = field.value.includes(user.id)
                            return (
                              <label key={user.id} className="flex items-center gap-3 text-sm">
                                <Checkbox
                                  checked={checked}
                                  onCheckedChange={(isChecked) => {
                                    if (isChecked) {
                                      field.onChange([...field.value, user.id])
                                    } else {
                                      field.onChange(field.value.filter((id) => id !== user.id))
                                    }
                                  }}
                                />
                                <span className="flex-1">
                                  <span className="font-medium text-foreground">{user.name}</span>
                                  <span className="block text-xs text-muted-foreground">
                                    {user.email}
                                  </span>
                                </span>
                              </label>
                            )
                          })
                        )}
                      </div>
                    </ScrollArea>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creating…' : 'Create group'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}