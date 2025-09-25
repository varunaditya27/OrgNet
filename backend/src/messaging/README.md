# Messaging Module

## Overview

The Messaging module provides comprehensive messaging functionality for the OrgNet application, supporting both one-to-one and group messaging with strict RBAC (Role-Based Access Control) enforcement.

## Features

### Core Messaging
- **One-to-One Messaging**: Direct messages between users with RBAC validation
- **Group Messaging**: Multi-user group conversations with member management
- **Message History**: Paginated message retrieval with conversation threading
- **Message Deletion**: Users can delete their own messages, admins can delete any message

### RBAC Integration
- **Hierarchical Communication**: Users can message based on organizational hierarchy
- **Role-Based Permissions**: Different communication rules for Admin, Manager, and Employee roles
- **Group Authorization**: Group membership and messaging permissions enforced

### Group Management
- **Create Groups**: Users can create groups with members they're authorized to communicate with
- **Member Management**: Add/remove group members with proper authorization
- **Group Information**: Retrieve group details and member lists

## API Endpoints

### Message Endpoints

#### Send Message
```
POST /messaging/send
```
Send a message to a user or group.

**Body:**
```json
{
  "content": "Hello world!",
  "receiverId": 123,  // For direct messages
  "groupId": 456      // For group messages (use either receiverId OR groupId)
}
```

#### Get Conversations
```
GET /messaging/conversations
```
Retrieve all conversations for the authenticated user.

#### Get Messages
```
GET /messaging/messages?receiverId=123&page=1&limit=50
GET /messaging/messages?groupId=456&page=1&limit=50
```
Retrieve paginated messages for a conversation.

**Query Parameters:**
- `receiverId`: ID of the other user (for direct messages)
- `groupId`: ID of the group (for group messages)
- `page`: Page number (default: 1)
- `limit`: Messages per page (default: 50, max: 100)

#### Delete Message
```
DELETE /messaging/messages/:messageId
```
Delete a message (sender or admin only).

### Group Endpoints

#### Create Group
```
POST /messaging/groups
```
Create a new group.

**Body:**
```json
{
  "name": "Project Team",
  "description": "Team for Project Alpha",
  "memberIds": [123, 456, 789]
}
```

#### Get User Groups
```
GET /messaging/groups
```
Retrieve all groups the user is a member of.

#### Get Group Details
```
GET /messaging/groups/:groupId
```
Retrieve details of a specific group.

#### Update Group
```
PATCH /messaging/groups/:groupId
```
Update group information.

**Body:**
```json
{
  "name": "Updated Group Name",
  "description": "Updated description"
}
```

#### Add Group Members
```
POST /messaging/groups/:groupId/members
```
Add members to a group.

**Body:**
```json
{
  "memberIds": [999, 888]
}
```

#### Remove Group Members
```
DELETE /messaging/groups/:groupId/members
```
Remove members from a group.

**Body:**
```json
{
  "memberIds": [999, 888]
}
```

## RBAC Rules

### Communication Permissions

1. **Admin**: Can communicate with anyone
2. **Manager**: Can communicate with:
   - Direct subordinates
   - Their immediate superior
   - Peer managers (same parent)
3. **Employee**: Can communicate with:
   - Their immediate superior
   - Peer employees (same parent/manager)

### Group Permissions

- Users can only create groups with members they're authorized to communicate with
- Only group members can send messages to the group
- Only group members or admins can modify group membership
- Users can remove themselves from groups
- Only admins can remove other users from groups

## Data Models

### Message
```typescript
{
  id: number;
  content: string;
  senderId: number;
  receiverId?: number;  // For direct messages
  groupId?: number;     // For group messages
  timestamp: Date;
  sender: UserInfo;
  receiver?: UserInfo;
  group?: GroupInfo;
}
```

### Group
```typescript
{
  id: number;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  members: UserInfo[];
  messageCount?: number;
}
```

### Conversation
```typescript
{
  participantId: number;
  participantName: string;
  participantEmail: string;
  lastMessage?: {
    id: number;
    content: string;
    timestamp: Date;
    senderId: number;
  };
  unreadCount: number;
}
```

## Error Handling

The module includes comprehensive error handling:

- **400 Bad Request**: Invalid input data or malformed requests
- **401 Unauthorized**: Authentication required
- **403 Forbidden**: Insufficient permissions for the requested action
- **404 Not Found**: User, group, or message not found

## Security Features

- All endpoints require JWT authentication
- RBAC enforcement at the service level
- Input validation using class-validator
- SQL injection protection via Prisma ORM
- Proper error messages without information leakage

## Future Enhancements

The module is designed to support future WebSocket integration for real-time messaging:

- Real-time message delivery
- Online status indicators
- Typing indicators
- Message read receipts
- Push notifications

## Dependencies

- `@nestjs/common`: Core NestJS functionality
- `@prisma/client`: Database ORM
- `class-validator`: Input validation
- `class-transformer`: Data transformation

## Testing

The module follows NestJS testing conventions and can be tested using:

```bash
npm run test              # Unit tests
npm run test:e2e         # End-to-end tests
npm run test:cov         # Coverage report
```