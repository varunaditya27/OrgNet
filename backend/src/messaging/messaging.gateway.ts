import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { MessagingService } from './messaging.service';
import { Role } from '../common/enums';

interface AuthenticatedSocket extends Socket {
  user?: {
    id: number;
    email: string;
    role: Role;
    parentId?: number;
  };
}

interface UserPresence {
  userId: number;
  socketId: string;
  status: 'online' | 'away' | 'busy';
  lastSeen: Date;
}

interface TypingIndicator {
  userId: number;
  conversationId: string;
  isTyping: boolean;
  timestamp: Date;
}

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3001',
    credentials: true,
  },
  namespace: '/messaging',
})
export class MessagingGateway implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(MessagingGateway.name);
  private userPresence = new Map<number, UserPresence>();
  private socketToUser = new Map<string, number>();
  private typingIndicators = new Map<string, TypingIndicator>();

  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
    private messagingService: MessagingService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
  }

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token = this.extractTokenFromSocket(client);
      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, email: true, role: true, parentId: true, isActive: true },
      });

      if (!user || !user.isActive) {
        client.disconnect();
        return;
      }

      client.user = {
        id: user.id,
        email: user.email,
        role: user.role as Role,
        parentId: user.parentId || undefined,
      };
      this.socketToUser.set(client.id, user.id);
      
      // Update user presence
      const presence: UserPresence = {
        userId: user.id,
        socketId: client.id,
        status: 'online',
        lastSeen: new Date(),
      };
      this.userPresence.set(user.id, presence);

      // Join user to their personal room
      void client.join(`user:${user.id}`);

      // Join conversation rooms based on RBAC rules
      await this.joinUserConversations(client);

      // Broadcast user online status to authorized users
      await this.broadcastPresenceUpdate(user.id, 'online');

      this.logger.log(`User ${user.email} connected with socket ${client.id}`);
    } catch (error) {
      this.logger.error('Connection authentication failed:', error);
      client.disconnect();
    }
  }

  async handleDisconnect(client: AuthenticatedSocket) {
    const userId = this.socketToUser.get(client.id);
    if (userId) {
      this.socketToUser.delete(client.id);
      this.userPresence.delete(userId);

      // Clean up typing indicators
      this.cleanupTypingIndicators(userId);

      // Broadcast user offline status
      await this.broadcastPresenceUpdate(userId, 'offline');

      this.logger.log(`User ${userId} disconnected`);
    }
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { content: string; receiverId?: number; groupId?: number },
  ) {
    if (!client.user) {
      client.emit('error', { message: 'Not authenticated' });
      return;
    }

    try {
      // Validate message data
      if (!data.content || (!data.receiverId && !data.groupId)) {
        client.emit('error', { message: 'Invalid message data' });
        return;
      }

      if (data.receiverId && data.groupId) {
        client.emit('error', { message: 'Cannot send to both user and group' });
        return;
      }

      // Use existing messaging service to create and validate message
      const message = await this.messagingService.sendMessage(
        {
          content: data.content,
          receiverId: data.receiverId,
          groupId: data.groupId,
        },
        client.user.id,
      );

      // Broadcast message to appropriate recipients
      if (data.receiverId) {
        // Direct message
        await this.broadcastDirectMessage(message, client.user.id, data.receiverId);
      } else if (data.groupId) {
        // Group message
        await this.broadcastGroupMessage(message, data.groupId);
      }

      // Send acknowledgment to sender
      client.emit('message_sent', {
        messageId: message.id,
        timestamp: message.timestamp,
        status: 'delivered',
      });

    } catch (error) {
      this.logger.error('Error sending message:', error);
      client.emit('error', { message: 'Failed to send message' });
    }
  }

  @SubscribeMessage('typing_start')
  async handleTypingStart(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { receiverId?: number; groupId?: number },
  ) {
    if (!client.user) return;

    const conversationId = data.receiverId 
      ? `direct:${Math.min(client.user.id, data.receiverId)}:${Math.max(client.user.id, data.receiverId)}`
      : `group:${data.groupId}`;

    const typingIndicator: TypingIndicator = {
      userId: client.user.id,
      conversationId,
      isTyping: true,
      timestamp: new Date(),
    };

    this.typingIndicators.set(`${client.user.id}:${conversationId}`, typingIndicator);

    // Broadcast typing indicator to conversation participants
    await this.broadcastTypingIndicator(typingIndicator, data.receiverId, data.groupId);
  }

  @SubscribeMessage('typing_stop')
  async handleTypingStop(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { receiverId?: number; groupId?: number },
  ) {
    if (!client.user) return;

    const conversationId = data.receiverId 
      ? `direct:${Math.min(client.user.id, data.receiverId)}:${Math.max(client.user.id, data.receiverId)}`
      : `group:${data.groupId}`;

    this.typingIndicators.delete(`${client.user.id}:${conversationId}`);

    // Broadcast typing stop to conversation participants
    await this.broadcastTypingIndicator(
      {
        userId: client.user.id,
        conversationId,
        isTyping: false,
        timestamp: new Date(),
      },
      data.receiverId,
      data.groupId,
    );
  }

  @SubscribeMessage('mark_message_read')
  async handleMarkMessageRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { messageId: number },
  ) {
    if (!client.user) return;

    try {
      // Verify user can access this message
      const message = await this.prisma.message.findUnique({
        where: { id: data.messageId },
        include: {
          sender: { select: { id: true } },
          receiver: { select: { id: true } },
          group: {
            include: {
              members: { select: { id: true } },
            },
          },
        },
      });

      if (!message) {
        client.emit('error', { message: 'Message not found' });
        return;
      }

      // Check if user is authorized to mark this message as read
      const canRead = message.receiverId === client.user!.id || 
                     message.group?.members.some(member => member.id === client.user!.id);

      if (!canRead) {
        client.emit('error', { message: 'Not authorized to read this message' });
        return;
      }

      // Send read receipt to sender
      const senderPresence = this.userPresence.get(message.senderId);
      if (senderPresence) {
        this.server.to(senderPresence.socketId).emit('message_read', {
          messageId: data.messageId,
          readBy: client.user.id,
          readAt: new Date(),
        });
      }

    } catch (error) {
      this.logger.error('Error marking message as read:', error);
      client.emit('error', { message: 'Failed to mark message as read' });
    }
  }

  @SubscribeMessage('get_online_users')
  async handleGetOnlineUsers(@ConnectedSocket() client: AuthenticatedSocket) {
    if (!client.user) return;

    try {
      // Get users that the current user can communicate with
      const authorizedUsers = await this.getAuthorizedUsers(client.user);
      const onlineUsers = Array.from(this.userPresence.values())
        .filter(presence => authorizedUsers.includes(presence.userId))
        .map(presence => ({
          userId: presence.userId,
          status: presence.status,
          lastSeen: presence.lastSeen,
        }));

      client.emit('online_users', onlineUsers);
    } catch (error) {
      this.logger.error('Error getting online users:', error);
    }
  }

  // Private helper methods

  private extractTokenFromSocket(client: Socket): string | null {
    const token = client.handshake.auth?.token || 
                 client.handshake.headers?.authorization?.replace('Bearer ', '');
    return token || null;
  }

  private async joinUserConversations(client: AuthenticatedSocket) {
    if (!client.user) return;

    // Join direct conversation rooms
    const conversations = await this.messagingService.getConversations(client.user.id);
    for (const conversation of conversations) {
      const roomName = `direct:${Math.min(client.user.id, conversation.participantId)}:${Math.max(client.user.id, conversation.participantId)}`;
      client.join(roomName);
    }

    // Join group conversation rooms
    const groups = await this.messagingService.getUserGroups(client.user.id);
    for (const group of groups) {
      client.join(`group:${group.id}`);
    }
  }

  private async broadcastDirectMessage(message: any, senderId: number, receiverId: number) {
    const roomName = `direct:${Math.min(senderId, receiverId)}:${Math.max(senderId, receiverId)}`;
    
    this.server.to(roomName).emit('new_message', {
      id: message.id,
      content: message.content,
      senderId: message.senderId,
      receiverId: message.receiverId,
      timestamp: message.timestamp,
      sender: message.sender,
    });
  }

  private async broadcastGroupMessage(message: any, groupId: number) {
    this.server.to(`group:${groupId}`).emit('new_message', {
      id: message.id,
      content: message.content,
      senderId: message.senderId,
      groupId: message.groupId,
      timestamp: message.timestamp,
      sender: message.sender,
      group: message.group,
    });
  }

  private async broadcastPresenceUpdate(userId: number, status: 'online' | 'offline') {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, role: true, parentId: true },
      });

      if (!user) return;

      // Get all users who can see this user's presence
      const authorizedViewers = await this.getUsersWhoCanSeePresence(user);

      for (const viewerId of authorizedViewers) {
        const viewerPresence = this.userPresence.get(viewerId);
        if (viewerPresence) {
          this.server.to(viewerPresence.socketId).emit('user_presence_update', {
            userId,
            status,
            timestamp: new Date(),
          });
        }
      }
    } catch (error) {
      this.logger.error('Error broadcasting presence update:', error);
    }
  }

  private async broadcastTypingIndicator(
    indicator: TypingIndicator,
    receiverId?: number,
    groupId?: number,
  ) {
    if (receiverId) {
      // Direct message typing
      const receiverPresence = this.userPresence.get(receiverId);
      if (receiverPresence) {
        this.server.to(receiverPresence.socketId).emit('typing_indicator', {
          userId: indicator.userId,
          isTyping: indicator.isTyping,
          conversationId: indicator.conversationId,
        });
      }
    } else if (groupId) {
      // Group message typing
      this.server.to(`group:${groupId}`).emit('typing_indicator', {
        userId: indicator.userId,
        isTyping: indicator.isTyping,
        conversationId: indicator.conversationId,
      });
    }
  }

  private cleanupTypingIndicators(userId: number) {
    const keysToDelete = Array.from(this.typingIndicators.keys())
      .filter(key => key.startsWith(`${userId}:`));
    
    keysToDelete.forEach(key => this.typingIndicators.delete(key));
  }

  private async getAuthorizedUsers(currentUser: any): Promise<number[]> {
    // This uses the same logic as the communication guard
    if (currentUser.role === Role.ADMIN) {
      const allUsers = await this.prisma.user.findMany({
        where: { isActive: true },
        select: { id: true },
      });
      return allUsers.map(u => u.id);
    }

    const authorizedUsers: Set<number> = new Set();

    // Add self
    authorizedUsers.add(currentUser.id);

    if (currentUser.role === Role.MANAGER) {
      // Add direct subordinates
      const subordinates = await this.prisma.user.findMany({
        where: { parentId: currentUser.id, isActive: true },
        select: { id: true },
      });
      subordinates.forEach(u => authorizedUsers.add(u.id));
    }

    // Add immediate superior
    if (currentUser.parentId) {
      authorizedUsers.add(currentUser.parentId);
    }

    // Add peers (same parent)
    if (currentUser.parentId) {
      const peers = await this.prisma.user.findMany({
        where: { parentId: currentUser.parentId, isActive: true },
        select: { id: true },
      });
      peers.forEach(u => authorizedUsers.add(u.id));
    }

    return Array.from(authorizedUsers);
  }

  private async getUsersWhoCanSeePresence(user: any): Promise<number[]> {
    // Use the same logic as getAuthorizedUsers but in reverse
    // Users who can see this user's presence are those who can communicate with them
    const viewers: Set<number> = new Set();

    // Self can always see own presence
    viewers.add(user.id);

    // Admin can see everyone
    const admins = await this.prisma.user.findMany({
      where: { role: Role.ADMIN, isActive: true },
      select: { id: true },
    });
    admins.forEach(admin => viewers.add(admin.id));

    // Direct superior can see subordinate's presence
    if (user.parentId) {
      viewers.add(user.parentId);
    }

    // Direct subordinates can see manager's presence
    if (user.role === Role.MANAGER) {
      const subordinates = await this.prisma.user.findMany({
        where: { parentId: user.id, isActive: true },
        select: { id: true },
      });
      subordinates.forEach(sub => viewers.add(sub.id));
    }

    // Peers can see each other's presence
    if (user.parentId) {
      const peers = await this.prisma.user.findMany({
        where: { parentId: user.parentId, isActive: true },
        select: { id: true },
      });
      peers.forEach(peer => viewers.add(peer.id));
    }

    return Array.from(viewers);
  }
}