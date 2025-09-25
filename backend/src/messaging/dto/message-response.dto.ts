export interface MessageResponseDto {
  id: number;
  content: string;
  senderId: number;
  receiverId: number | null;
  groupId: number | null;
  timestamp: Date;
  sender: {
    id: number;
    name: string;
    email: string;
  };
  receiver?: {
    id: number;
    name: string; 
    email: string;
  } | null;
  group?: {
    id: number;
    name: string;
  } | null;
}

export interface GroupResponseDto {
  id: number;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  members: Array<{
    id: number;
    name: string;
    email: string;
    role: string;
  }>;
  messageCount?: number;
}

export interface ConversationDto {
  participantId: number;
  participantName: string;
  participantEmail: string;
  lastMessage: {
    id: number;
    content: string;
    timestamp: Date;
    senderId: number;
  } | null;
  unreadCount: number;
}

export interface PaginatedMessagesDto {
  messages: MessageResponseDto[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}