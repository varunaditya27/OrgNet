import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Check, Loader2, MessageSquarePlus, Users } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useMessageableUsersQuery } from '@/hooks/api/users'
import { useSendMessageMutation, useCreateGroupMutation } from '@/hooks/api/messaging'
import type { User } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'

const directMessageSchema = z.object({
  receiverId: z.number().min(1, 'Please select a recipient'),
  content: z.string().min(1, 'Please enter a message'),
})

const groupMessageSchema = z.object({
  name: z.string().min(1, 'Please enter a group name'),
  description: z.string().optional(),
  memberIds: z.array(z.number()).min(1, 'Please select at least one member'),
  initialMessage: z.string().min(1, 'Please enter an initial message'),
})

type DirectMessageFormValues = z.infer<typeof directMessageSchema>
type GroupMessageFormValues = z.infer<typeof groupMessageSchema>

interface NewConversationDialogProps {
  onConversationCreated?: (receiverId?: number, groupId?: number) => void
}

export const NewConversationDialog = ({ onConversationCreated }: NewConversationDialogProps) => {
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'direct' | 'group'>('direct')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [selectedMembers, setSelectedMembers] = useState<User[]>([])

  const usersQuery = useMessageableUsersQuery()

  const sendMessageMutation = useSendMessageMutation()
  const createGroupMutation = useCreateGroupMutation()

  const directForm = useForm<DirectMessageFormValues>({
    resolver: zodResolver(directMessageSchema),
    defaultValues: {
      receiverId: undefined,
      content: '',
    },
  })

  const groupForm = useForm<GroupMessageFormValues>({
    resolver: zodResolver(groupMessageSchema),
    defaultValues: {
      name: '',
      description: '',
      memberIds: [],
      initialMessage: '',
    },
  })

  const users = usersQuery.data ?? []

  // Filter users based on search term locally
  const filteredUsers = searchTerm
    ? users.filter(user =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : users

  useEffect(() => {
    if (selectedUser) {
      directForm.setValue('receiverId', selectedUser.id)
    }
  }, [selectedUser, directForm])

  useEffect(() => {
    groupForm.setValue('memberIds', selectedMembers.map(m => m.id))
  }, [selectedMembers, groupForm])

  const handleDirectMessageSubmit = async (values: DirectMessageFormValues) => {
    try {
      await sendMessageMutation.mutateAsync({
        receiverId: values.receiverId,
        content: values.content,
      })
      
      onConversationCreated?.(values.receiverId)
      setOpen(false)
      resetForms()
    } catch {
      // Error already handled by mutation
    }
  }

  const handleGroupMessageSubmit = async (values: GroupMessageFormValues) => {
    try {
      const group = await createGroupMutation.mutateAsync({
        name: values.name,
        description: values.description,
        memberIds: values.memberIds,
      })

      // Send initial message to the group
      await sendMessageMutation.mutateAsync({
        groupId: group.id,
        content: values.initialMessage,
      })

      onConversationCreated?.(undefined, group.id)
      setOpen(false)
      resetForms()
    } catch {
      // Error already handled by mutation
    }
  }

  const resetForms = () => {
    directForm.reset()
    groupForm.reset()
    setSelectedUser(null)
    setSelectedMembers([])
    setSearchTerm('')
    setActiveTab('direct')
  }

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) {
      resetForms()
    }
  }

  const toggleMemberSelection = (user: User) => {
    setSelectedMembers(prev => {
      const exists = prev.find(m => m.id === user.id)
      if (exists) {
        return prev.filter(m => m.id !== user.id)
      }
      return [...prev, user]
    })
  }

  const isMemberSelected = (userId: number) => {
    return selectedMembers.some(m => m.id === userId)
  }

  const isSubmitting = sendMessageMutation.isPending || createGroupMutation.isPending

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <MessageSquarePlus className="h-4 w-4" />
          New Message
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Start a new conversation</DialogTitle>
          <DialogDescription>
            Send a direct message or create a group chat
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'direct' | 'group')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="direct">Direct Message</TabsTrigger>
            <TabsTrigger value="group">Group Chat</TabsTrigger>
          </TabsList>

          <TabsContent value="direct" className="space-y-4 mt-4">
            <form onSubmit={directForm.handleSubmit(handleDirectMessageSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label>Select recipient</Label>
                <Command className="border rounded-md">
                  <CommandInput 
                    placeholder="Search users..." 
                    value={searchTerm}
                    onValueChange={setSearchTerm}
                  />
                  <CommandList className="max-h-[200px]">
                    <CommandEmpty>
                      {usersQuery.isLoading ? (
                        <div className="flex items-center justify-center gap-2 py-6">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-sm text-muted-foreground">Loading users...</span>
                        </div>
                      ) : (
                        <div className="py-6 text-center text-sm text-muted-foreground">
                          No users found
                        </div>
                      )}
                    </CommandEmpty>
                    {filteredUsers.length > 0 && (
                      <CommandGroup>
                        {filteredUsers.map((user) => (
                          <CommandItem
                            key={user.id}
                            value={`${user.name}-${user.email}`}
                            onSelect={() => setSelectedUser(user)}
                            className="cursor-pointer"
                          >
                            <div className="flex items-center gap-3 flex-1">
                              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                                {user.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium truncate">{user.name}</div>
                                <div className="text-xs text-muted-foreground truncate">{user.email}</div>
                              </div>
                              <Badge variant="outline" className="shrink-0">
                                {user.role}
                              </Badge>
                              {selectedUser?.id === user.id && (
                                <Check className="h-4 w-4 text-primary shrink-0" />
                              )}
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    )}
                  </CommandList>
                </Command>
                {directForm.formState.errors.receiverId && (
                  <p className="text-sm text-destructive">
                    {directForm.formState.errors.receiverId.message}
                  </p>
                )}
              </div>

              {selectedUser && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                    {selectedUser.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{selectedUser.name}</div>
                    <div className="text-xs text-muted-foreground">{selectedUser.email}</div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="direct-message">Message</Label>
                <Textarea
                  id="direct-message"
                  placeholder="Type your message..."
                  rows={4}
                  {...directForm.register('content')}
                />
                {directForm.formState.errors.content && (
                  <p className="text-sm text-destructive">
                    {directForm.formState.errors.content.message}
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Send Message
                </Button>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="group" className="space-y-4 mt-4">
            <form onSubmit={groupForm.handleSubmit(handleGroupMessageSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="group-name">Group name</Label>
                <Input
                  id="group-name"
                  placeholder="e.g., Project Team, Marketing Chat"
                  {...groupForm.register('name')}
                />
                {groupForm.formState.errors.name && (
                  <p className="text-sm text-destructive">
                    {groupForm.formState.errors.name.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="group-description">Description (optional)</Label>
                <Input
                  id="group-description"
                  placeholder="What is this group for?"
                  {...groupForm.register('description')}
                />
              </div>

              <div className="space-y-2">
                <Label>Select members</Label>
                <Command className="border rounded-md">
                  <CommandInput 
                    placeholder="Search users..." 
                    value={searchTerm}
                    onValueChange={setSearchTerm}
                  />
                  <CommandList className="max-h-[200px]">
                    <CommandEmpty>
                      {usersQuery.isLoading ? (
                        <div className="flex items-center justify-center gap-2 py-6">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-sm text-muted-foreground">Loading users...</span>
                        </div>
                      ) : (
                        <div className="py-6 text-center text-sm text-muted-foreground">
                          No users found
                        </div>
                      )}
                    </CommandEmpty>
                    {filteredUsers.length > 0 && (
                      <CommandGroup>
                        {filteredUsers.map((user) => (
                          <CommandItem
                            key={user.id}
                            value={`${user.name}-${user.email}`}
                            onSelect={() => toggleMemberSelection(user)}
                            className="cursor-pointer"
                          >
                            <div className="flex items-center gap-3 flex-1">
                              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                                {user.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium truncate">{user.name}</div>
                                <div className="text-xs text-muted-foreground truncate">{user.email}</div>
                              </div>
                              <Badge variant="outline" className="shrink-0">
                                {user.role}
                              </Badge>
                              {isMemberSelected(user.id) && (
                                <Check className="h-4 w-4 text-primary shrink-0" />
                              )}
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    )}
                  </CommandList>
                </Command>
                {groupForm.formState.errors.memberIds && (
                  <p className="text-sm text-destructive">
                    {groupForm.formState.errors.memberIds.message}
                  </p>
                )}
              </div>

              {selectedMembers.length > 0 && (
                <div className="space-y-2">
                  <Label>Selected members ({selectedMembers.length})</Label>
                  <div className="flex flex-wrap gap-2">
                    {selectedMembers.map((member) => (
                      <Badge
                        key={member.id}
                        variant="secondary"
                        className="gap-1 pr-1"
                      >
                        {member.name}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                          onClick={() => toggleMemberSelection(member)}
                        >
                          ×
                        </Button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="group-message">Initial message</Label>
                <Textarea
                  id="group-message"
                  placeholder="Type your first message to the group..."
                  rows={4}
                  {...groupForm.register('initialMessage')}
                />
                {groupForm.formState.errors.initialMessage && (
                  <p className="text-sm text-destructive">
                    {groupForm.formState.errors.initialMessage.message}
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Users className="mr-2 h-4 w-4" />
                  Create Group
                </Button>
              </div>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
