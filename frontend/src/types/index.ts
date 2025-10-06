import type { Role } from '../utils/roles'

export interface UserSummary {
  id: number
  name: string
  email: string
  role: Role
}

export interface User extends UserSummary {
  parentId?: number | null
  isActive: boolean
  lastLoginAt?: string | null
  createdAt: string
  updatedAt: string
}

export interface AuthResponse {
  user: User
  accessToken: string
}

export interface TeamMember extends UserSummary {
  isActive: boolean
}

export interface Team {
  id: number
  name: string
  description?: string | null
  managerId: number
  manager: UserSummary
  members: TeamMember[]
  memberCount: number
  createdAt: string
  updatedAt: string
}

export interface Message {
  id: number
  content: string
  senderId: number
  receiverId?: number | null
  groupId?: number | null
  timestamp: string
  sender: UserSummary
}

export interface Group {
  id: number
  name: string
  description?: string | null
  createdAt: string
  updatedAt: string
  members?: UserSummary[]
}

export interface ConversationSummary {
  participantId: number
  participantName: string
  participantEmail: string
  lastMessage?: Message
  unreadCount: number
  isGroup?: boolean
  groupId?: number
}

export interface FileItem {
  id: number
  fileName: string
  mimeType: string
  size: number
  description?: string | null
  allowedRole: Role
  downloadCount: number
  createdAt: string
  updatedAt: string
  owner: UserSummary
  isActive: boolean
}

export interface AuditLogEntry {
  id: number
  userId: number
  user: UserSummary
  action: string
  entity: string
  entityId?: number | null
  details?: string | null
  metadata?: Record<string, unknown>
  ipAddress?: string | null
  userAgent?: string | null
  timestamp: string
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  hasMore?: boolean
}

export interface SystemStats {
  totalUsers: number
  activeUsers: number
  pendingInvites: number
  totalTeams: number
  activeTeams: number
  messagesToday: number
  filesSharedThisWeek: number
  storageUsedMb: number
}
