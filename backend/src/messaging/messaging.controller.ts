import {
  Controller,
  Post,
  Get,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { MessagingService } from './messaging.service';
import { 
  JwtAuthGuard,
  CommunicationGuard,
  User,
  RequireCommunicationPermission,
  RequireResourceAccess,
  ResourcePermission,
} from '../common';
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

@Controller('messaging')
@UseGuards(JwtAuthGuard)
export class MessagingController {
  constructor(private readonly messagingService: MessagingService) {}

  // Message endpoints
  @Post('send')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(CommunicationGuard)
  @RequireCommunicationPermission()
  async sendMessage(
    @Body() sendMessageDto: SendMessageDto,
    @User('id') userId: number,
  ): Promise<MessageResponseDto> {
    return this.messagingService.sendMessage(sendMessageDto, userId);
  }

  @Get('conversations')
  @HttpCode(HttpStatus.OK)
  async getConversations(@User('id') userId: number): Promise<ConversationDto[]> {
    return this.messagingService.getConversations(userId);
  }

  @Get('messages')
  @HttpCode(HttpStatus.OK)
  async getMessages(
    @User('id') userId: number,
    @Query('receiverId') receiverId?: string,
    @Query('groupId') groupId?: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '50',
  ): Promise<PaginatedMessagesDto> {
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    if (isNaN(pageNum) || pageNum < 1) {
      throw new Error('Page must be a positive integer');
    }

    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      throw new Error('Limit must be between 1 and 100');
    }

    return this.messagingService.getMessages(
      userId,
      receiverId ? parseInt(receiverId, 10) : undefined,
      groupId ? parseInt(groupId, 10) : undefined,
      pageNum,
      limitNum,
    );
  }

  @Delete('messages/:messageId')
  @HttpCode(HttpStatus.OK)
  @RequireResourceAccess('message', [ResourcePermission.OWNER, ResourcePermission.ADMIN_OVERRIDE], { ownerField: 'senderId' })
  async deleteMessage(
    @Param('messageId', ParseIntPipe) messageId: number,
    @User('id') userId: number,
  ): Promise<{ message: string }> {
    return this.messagingService.deleteMessage(messageId, userId);
  }

  // Group endpoints
  @Post('groups')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(CommunicationGuard)
  @RequireCommunicationPermission()
  async createGroup(
    @Body() createGroupDto: CreateGroupDto,
    @User('id') userId: number,
  ): Promise<GroupResponseDto> {
    return this.messagingService.createGroup(createGroupDto, userId);
  }

  @Get('groups')
  @HttpCode(HttpStatus.OK)
  async getUserGroups(@User('id') userId: number): Promise<GroupResponseDto[]> {
    return this.messagingService.getUserGroups(userId);
  }

  @Get('groups/:groupId')
  @HttpCode(HttpStatus.OK)
  async getGroup(
    @Param('groupId', ParseIntPipe) groupId: number,
    @User('id') userId: number,
  ): Promise<GroupResponseDto> {
    return this.messagingService.getGroup(groupId, userId);
  }

  @Patch('groups/:groupId')
  @HttpCode(HttpStatus.OK)
  async updateGroup(
    @Param('groupId', ParseIntPipe) groupId: number,
    @Body() updateGroupDto: UpdateGroupDto,
    @User('id') userId: number,
  ): Promise<GroupResponseDto> {
    return this.messagingService.updateGroup(groupId, updateGroupDto, userId);
  }

  @Post('groups/:groupId/members')
  @HttpCode(HttpStatus.OK)
  async addGroupMembers(
    @Param('groupId', ParseIntPipe) groupId: number,
    @Body() addGroupMembersDto: AddGroupMembersDto,
    @User('id') userId: number,
  ): Promise<GroupResponseDto> {
    return this.messagingService.addGroupMembers(groupId, addGroupMembersDto, userId);
  }

  @Delete('groups/:groupId/members')
  @HttpCode(HttpStatus.OK)
  async removeGroupMembers(
    @Param('groupId', ParseIntPipe) groupId: number,
    @Body() removeGroupMembersDto: RemoveGroupMembersDto,
    @User('id') userId: number,
  ): Promise<GroupResponseDto> {
    return this.messagingService.removeGroupMembers(groupId, removeGroupMembersDto, userId);
  }
}