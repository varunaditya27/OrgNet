import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  SendMessageDto,
  CreateGroupDto,
  UpdateGroupDto,
  AddGroupMembersDto,
  RemoveGroupMembersDto,
  MessageResponseDto,
  GroupResponseDto,
  ConversationDto,
  PaginatedMessagesDto,
} from './dto';
import { Role } from '../common/enums';

@Injectable()
export class MessagingService {
  constructor(private readonly prisma: PrismaService) {}

  async sendMessage(sendMessageDto: SendMessageDto, senderId: number): Promise<MessageResponseDto> {
    const { content, receiverId, groupId } = sendMessageDto;

    // Validate that either receiverId or groupId is provided, but not both
    if ((!receiverId && !groupId) || (receiverId && groupId)) {
      throw new BadRequestException('Must specify either receiverId or groupId, but not both');
    }

    const sender = await this.prisma.user.findUnique({
      where: { id: senderId },
      select: { id: true, name: true, email: true, role: true, parentId: true },
    });

    if (!sender) {
      throw new NotFoundException('Sender not found');
    }

    // Handle direct message
    if (receiverId) {
      const receiver = await this.prisma.user.findUnique({
        where: { id: receiverId },
        select: { id: true, name: true, email: true, role: true, parentId: true },
      });

      if (!receiver) {
        throw new NotFoundException('Receiver not found');
      }

      // Validate RBAC rules for direct messaging
      await this.validateDirectMessagePermission(sender, receiver);

      const message = await this.prisma.message.create({
        data: {
          content,
          senderId,
          receiverId,
        },
        include: {
          sender: { select: { id: true, name: true, email: true } },
          receiver: { select: { id: true, name: true, email: true } },
        },
      });

      return this.mapMessageToResponse(message);
    }

    // Handle group message
    if (groupId) {
      const group = await this.prisma.group.findUnique({
        where: { id: groupId },
        include: {
          members: { select: { id: true, name: true, email: true, role: true, parentId: true } },
        },
      });

      if (!group) {
        throw new NotFoundException('Group not found');
      }

      // Check if sender is a member of the group
      const isMember = group.members.some(member => member.id === senderId);
      if (!isMember) {
        throw new ForbiddenException('You are not a member of this group');
      }

      // Validate RBAC rules for group messaging
      await this.validateGroupMessagePermission(sender, group.members);

      const message = await this.prisma.message.create({
        data: {
          content,
          senderId,
          groupId,
        },
        include: {
          sender: { select: { id: true, name: true, email: true } },
          group: { select: { id: true, name: true } },
        },
      });

      return this.mapMessageToResponse(message);
    }

    throw new BadRequestException('Invalid message configuration');
  }

  async getConversations(userId: number): Promise<ConversationDto[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, parentId: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get all direct conversations (both sent and received messages)
    const conversations = await this.prisma.$queryRaw<any[]>`
      WITH conversation_participants AS (
        SELECT DISTINCT
          CASE 
            WHEN "senderId" = ${userId} THEN "receiverId"
            ELSE "senderId"
          END as participant_id
        FROM "Message"
        WHERE ("senderId" = ${userId} OR "receiverId" = ${userId})
          AND "receiverId" IS NOT NULL
      ),
      last_messages AS (
        SELECT DISTINCT ON (
          CASE 
            WHEN "senderId" = ${userId} THEN "receiverId"
            ELSE "senderId"
          END
        )
          CASE 
            WHEN "senderId" = ${userId} THEN "receiverId"
            ELSE "senderId"
          END as participant_id,
          id, content, timestamp, "senderId"
        FROM "Message"
        WHERE ("senderId" = ${userId} OR "receiverId" = ${userId})
          AND "receiverId" IS NOT NULL
        ORDER BY 
          CASE 
            WHEN "senderId" = ${userId} THEN "receiverId"
            ELSE "senderId"
          END,
          timestamp DESC
      )
      SELECT 
        u.id as "participantId",
        u.name as "participantName", 
        u.email as "participantEmail",
        lm.id as "lastMessageId",
        lm.content as "lastMessageContent",
        lm.timestamp as "lastMessageTimestamp",
        lm."senderId" as "lastMessageSenderId"
      FROM conversation_participants cp
      JOIN "User" u ON u.id = cp.participant_id
      LEFT JOIN last_messages lm ON lm.participant_id = cp.participant_id
      WHERE u."isActive" = true
      ORDER BY lm.timestamp DESC NULLS LAST
    `;

    // Filter conversations based on RBAC rules
    const allowedConversations: ConversationDto[] = [];
    
    for (const conv of conversations) {
      const participant = await this.prisma.user.findUnique({
        where: { id: conv.participantId },
        select: { id: true, role: true, parentId: true },
      });

      if (participant && await this.canCommunicateWith(user, participant)) {
        allowedConversations.push({
          participantId: conv.participantId,
          participantName: conv.participantName,
          participantEmail: conv.participantEmail,
          lastMessage: conv.lastMessageId ? {
            id: conv.lastMessageId,
            content: conv.lastMessageContent,
            timestamp: conv.lastMessageTimestamp,
            senderId: conv.lastMessageSenderId,
          } : null,
          unreadCount: 0, // TODO: Implement unread count logic
        });
      }
    }

    return allowedConversations;
  }

  async getMessages(
    userId: number,
    receiverId?: number,
    groupId?: number,
    page: number = 1,
    limit: number = 50,
  ): Promise<PaginatedMessagesDto> {
    if ((!receiverId && !groupId) || (receiverId && groupId)) {
      throw new BadRequestException('Must specify either receiverId or groupId, but not both');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, parentId: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    let whereClause: any;

    if (receiverId) {
      // Direct message conversation
      const receiver = await this.prisma.user.findUnique({
        where: { id: receiverId },
        select: { id: true, role: true, parentId: true },
      });

      if (!receiver) {
        throw new NotFoundException('Receiver not found');
      }

      // Check if user can communicate with receiver
      if (!await this.canCommunicateWith(user, receiver)) {
        throw new ForbiddenException('You cannot access this conversation');
      }

      whereClause = {
        OR: [
          { senderId: userId, receiverId },
          { senderId: receiverId, receiverId: userId },
        ],
      };
    } else if (groupId) {
      // Group message conversation
      const group = await this.prisma.group.findUnique({
        where: { id: groupId },
        include: {
          members: { select: { id: true, role: true, parentId: true } },
        },
      });

      if (!group) {
        throw new NotFoundException('Group not found');
      }

      const isMember = group.members.some(member => member.id === userId);
      if (!isMember) {
        throw new ForbiddenException('You are not a member of this group');
      }

      whereClause = { groupId };
    }

    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      this.prisma.message.findMany({
        where: whereClause,
        include: {
          sender: { select: { id: true, name: true, email: true } },
          receiver: { select: { id: true, name: true, email: true } },
          group: { select: { id: true, name: true } },
        },
        orderBy: { timestamp: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.message.count({ where: whereClause }),
    ]);

    return {
      messages: messages.map(this.mapMessageToResponse),
      total,
      page,
      limit,
      hasMore: skip + messages.length < total,
    };
  }

  async deleteMessage(messageId: number, userId: number): Promise<{ message: string }> {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: {
        sender: { select: { id: true, role: true } },
      },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Only message sender or admin can delete messages
    if (message.senderId !== userId && user.role !== Role.ADMIN) {
      throw new ForbiddenException('You can only delete your own messages or be an admin');
    }

    await this.prisma.message.delete({
      where: { id: messageId },
    });

    return { message: 'Message deleted successfully' };
  }

  // Group management methods
  async createGroup(createGroupDto: CreateGroupDto, creatorId: number): Promise<GroupResponseDto> {
    const { name, description, memberIds } = createGroupDto;

    const creator = await this.prisma.user.findUnique({
      where: { id: creatorId },
      select: { id: true, role: true, parentId: true },
    });

    if (!creator) {
      throw new NotFoundException('Creator not found');
    }

    // Validate that creator can create groups with these members
    const members = await this.prisma.user.findMany({
      where: { id: { in: memberIds } },
      select: { id: true, role: true, parentId: true },
    });

    if (members.length !== memberIds.length) {
      throw new BadRequestException('Some members were not found');
    }

    // Validate RBAC rules for group creation
    for (const member of members) {
      if (!await this.canCommunicateWith(creator, member)) {
        throw new ForbiddenException(`You cannot add user ${member.id} to the group`);
      }
    }

    // Add creator to member list if not already included
    const allMemberIds = [...new Set([creatorId, ...memberIds])];

    const group = await this.prisma.group.create({
      data: {
        name,
        description,
        members: {
          connect: allMemberIds.map(id => ({ id })),
        },
      },
      include: {
        members: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });

    return {
      id: group.id,
      name: group.name,
      description: group.description,
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
      members: group.members,
    };
  }

  async getUserGroups(userId: number): Promise<GroupResponseDto[]> {
    const groups = await this.prisma.group.findMany({
      where: {
        members: {
          some: { id: userId },
        },
      },
      include: {
        members: {
          select: { id: true, name: true, email: true, role: true },
        },
        _count: {
          select: { messages: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return groups.map(group => ({
      id: group.id,
      name: group.name,
      description: group.description,
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
      members: group.members,
      messageCount: group._count.messages,
    }));
  }

  async getGroup(groupId: number, userId: number): Promise<GroupResponseDto> {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      include: {
        members: {
          select: { id: true, name: true, email: true, role: true },
        },
        _count: {
          select: { messages: true },
        },
      },
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    const isMember = group.members.some(member => member.id === userId);
    if (!isMember) {
      throw new ForbiddenException('You are not a member of this group');
    }

    return {
      id: group.id,
      name: group.name,
      description: group.description,
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
      members: group.members,
      messageCount: group._count.messages,
    };
  }

  async updateGroup(groupId: number, updateGroupDto: UpdateGroupDto, userId: number): Promise<GroupResponseDto> {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      include: {
        members: { select: { id: true, role: true } },
      },
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Only admin or group members can update group (basic implementation)
    const isMember = group.members.some(member => member.id === userId);
    if (!isMember && user.role !== Role.ADMIN) {
      throw new ForbiddenException('You can only update groups you are a member of');
    }

    const updatedGroup = await this.prisma.group.update({
      where: { id: groupId },
      data: updateGroupDto,
      include: {
        members: {
          select: { id: true, name: true, email: true, role: true },
        },
        _count: {
          select: { messages: true },
        },
      },
    });

    return {
      id: updatedGroup.id,
      name: updatedGroup.name,
      description: updatedGroup.description,
      createdAt: updatedGroup.createdAt,
      updatedAt: updatedGroup.updatedAt,
      members: updatedGroup.members,
      messageCount: updatedGroup._count.messages,
    };
  }

  async addGroupMembers(groupId: number, addGroupMembersDto: AddGroupMembersDto, userId: number): Promise<GroupResponseDto> {
    const { memberIds } = addGroupMembersDto;

    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      include: {
        members: { select: { id: true, role: true, parentId: true } },
      },
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    const requestingUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, parentId: true },
    });

    if (!requestingUser) {
      throw new NotFoundException('User not found');
    }

    // Check if requesting user is a member or admin
    const isMember = group.members.some(member => member.id === userId);
    if (!isMember && requestingUser.role !== Role.ADMIN) {
      throw new ForbiddenException('You must be a group member to add new members');
    }

    // Validate new members
    const newMembers = await this.prisma.user.findMany({
      where: { id: { in: memberIds } },
      select: { id: true, role: true, parentId: true },
    });

    if (newMembers.length !== memberIds.length) {
      throw new BadRequestException('Some members were not found');
    }

    // Validate RBAC rules for adding members
    for (const member of newMembers) {
      if (!await this.canCommunicateWith(requestingUser, member)) {
        throw new ForbiddenException(`You cannot add user ${member.id} to the group`);
      }
    }

    const updatedGroup = await this.prisma.group.update({
      where: { id: groupId },
      data: {
        members: {
          connect: memberIds.map(id => ({ id })),
        },
      },
      include: {
        members: {
          select: { id: true, name: true, email: true, role: true },
        },
        _count: {
          select: { messages: true },
        },
      },
    });

    return {
      id: updatedGroup.id,
      name: updatedGroup.name,
      description: updatedGroup.description,
      createdAt: updatedGroup.createdAt,
      updatedAt: updatedGroup.updatedAt,
      members: updatedGroup.members,
      messageCount: updatedGroup._count.messages,
    };
  }

  async removeGroupMembers(groupId: number, removeGroupMembersDto: RemoveGroupMembersDto, userId: number): Promise<GroupResponseDto> {
    const { memberIds } = removeGroupMembersDto;

    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      include: {
        members: { select: { id: true, role: true } },
      },
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Only admin or the members themselves can remove members
    const isMember = group.members.some(member => member.id === userId);
    const isRemovingSelf = memberIds.length === 1 && memberIds[0] === userId;

    if (!isMember && user.role !== Role.ADMIN) {
      throw new ForbiddenException('You must be a group member or admin');
    }

    if (!isRemovingSelf && user.role !== Role.ADMIN) {
      throw new ForbiddenException('You can only remove yourself from the group');
    }

    const updatedGroup = await this.prisma.group.update({
      where: { id: groupId },
      data: {
        members: {
          disconnect: memberIds.map(id => ({ id })),
        },
      },
      include: {
        members: {
          select: { id: true, name: true, email: true, role: true },
        },
        _count: {
          select: { messages: true },
        },
      },
    });

    return {
      id: updatedGroup.id,
      name: updatedGroup.name,
      description: updatedGroup.description,
      createdAt: updatedGroup.createdAt,
      updatedAt: updatedGroup.updatedAt,
      members: updatedGroup.members,
      messageCount: updatedGroup._count.messages,
    };
  }

  // Helper methods for RBAC validation
  private async validateDirectMessagePermission(sender: any, receiver: any): Promise<void> {
    if (!await this.canCommunicateWith(sender, receiver)) {
      throw new ForbiddenException('You are not authorized to send messages to this user');
    }
  }

  private async validateGroupMessagePermission(sender: any, groupMembers: any[]): Promise<void> {
    // For group messages, validate that sender can communicate with all members
    for (const member of groupMembers) {
      if (member.id !== sender.id && !await this.canCommunicateWith(sender, member)) {
        throw new ForbiddenException('You are not authorized to send messages in this group');
      }
    }
  }

  private async canCommunicateWith(user1: any, user2: any): Promise<boolean> {
    // Same user can always communicate with themselves
    if (user1.id === user2.id) {
      return true;
    }

    // Admin can communicate with anyone
    if (user1.role === Role.ADMIN || user2.role === Role.ADMIN) {
      return true;
    }

    // Manager can communicate with direct subordinates
    if (user1.role === Role.MANAGER && user2.parentId === user1.id) {
      return true;
    }
    if (user2.role === Role.MANAGER && user1.parentId === user2.id) {
      return true;
    }

    // Employee can communicate with immediate superior
    if (user1.parentId === user2.id || user2.parentId === user1.id) {
      return true;
    }

    // Peers (same parent) can communicate with each other
    if (user1.parentId && user2.parentId && user1.parentId === user2.parentId) {
      return true;
    }

    // Users with same role at root level (no parent) can communicate
    if (!user1.parentId && !user2.parentId && user1.role === user2.role) {
      return true;
    }

    return false;
  }

  private mapMessageToResponse(message: any): MessageResponseDto {
    return {
      id: message.id,
      content: message.content,
      senderId: message.senderId,
      receiverId: message.receiverId,
      groupId: message.groupId,
      timestamp: message.timestamp,
      sender: message.sender,
      receiver: message.receiver,
      group: message.group,
    };
  }
}