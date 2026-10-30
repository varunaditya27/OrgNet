# Real-Time Messaging with WebSockets

## Overview

The OrgNet backend now supports real-time messaging using WebSockets with Socket.IO. All WebSocket communications are protected by the same RBAC (Role-Based Access Control) system used for REST endpoints.

## Connection

### Endpoint
```
ws://localhost:3000/messaging
```

### Authentication
Include the JWT token in one of these ways:
- Auth object: `{ auth: { token: "your-jwt-token" } }`
- Authorization header: `{ headers: { authorization: "Bearer your-jwt-token" } }`

### Example Client Connection (JavaScript)
```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3000/messaging', {
  auth: {
    token: 'your-jwt-token'
  }
});

socket.on('connect', () => {
  console.log('Connected to messaging server');
});

socket.on('disconnect', () => {
  console.log('Disconnected from messaging server');
});
```

## Available Events

### 1. Send Message
Send a real-time message to a user or group.

**Emit:**
```javascript
socket.emit('send_message', {
  content: 'Hello, world!',
  receiverId: 123,  // For direct messages
  // OR
  groupId: 456      // For group messages
});
```

**Response:**
```javascript
// Success acknowledgment
socket.on('message_sent', (data) => {
  console.log('Message sent:', data);
  // { messageId: 789, timestamp: '2023-...', status: 'delivered' }
});

// Error handling
socket.on('error', (error) => {
  console.error('Error:', error.message);
});
```

### 2. Receive Messages
Listen for incoming messages.

```javascript
socket.on('new_message', (message) => {
  console.log('New message received:', message);
  // {
  //   id: 123,
  //   content: 'Hello!',
  //   senderId: 456,
  //   receiverId: 789, // for direct messages
  //   groupId: 101,    // for group messages
  //   timestamp: '2023-...',
  //   sender: { id: 456, name: 'John Doe', email: 'john@example.com' }
  // }
});
```

### 3. Typing Indicators
Show when users are typing.

**Start typing:**
```javascript
socket.emit('typing_start', {
  receiverId: 123,  // For direct messages
  // OR
  groupId: 456      // For group messages
});
```

**Stop typing:**
```javascript
socket.emit('typing_stop', {
  receiverId: 123,  // For direct messages
  // OR
  groupId: 456      // For group messages
});
```

**Listen for typing events:**
```javascript
socket.on('typing_indicator', (data) => {
  console.log('Typing indicator:', data);
  // {
  //   userId: 123,
  //   isTyping: true,
  //   conversationId: 'direct:123:456'
  // }
});
```

### 4. Message Read Receipts
Mark messages as read and receive read confirmations.

**Mark message as read:**
```javascript
socket.emit('mark_message_read', {
  messageId: 123
});
```

**Listen for read receipts:**
```javascript
socket.on('message_read', (data) => {
  console.log('Message read by:', data);
  // {
  //   messageId: 123,
  //   readBy: 456,
  //   readAt: '2023-...'
  // }
});
```

### 5. Online Users / Presence
Get and track online users.

**Get current online users:**
```javascript
socket.emit('get_online_users');

socket.on('online_users', (users) => {
  console.log('Online users:', users);
  // [
  //   { userId: 123, status: 'online', lastSeen: '2023-...' },
  //   { userId: 456, status: 'away', lastSeen: '2023-...' }
  // ]
});
```

**Listen for presence updates:**
```javascript
socket.on('user_presence_update', (data) => {
  console.log('User presence changed:', data);
  // {
  //   userId: 123,
  //   status: 'online', // 'online' | 'offline'
  //   timestamp: '2023-...'
  // }
});
```

## RBAC Enforcement

All WebSocket events respect the same RBAC rules as REST endpoints:

### Communication Rules
- **ADMIN**: Can message anyone in the organization
- **MANAGER**: Can message direct subordinates, immediate superior, and peers
- **EMPLOYEE**: Can message immediate superior and peers (same manager)

### Presence Visibility
Users can only see the online/offline status of users they're authorized to communicate with.

### Message Access
Users can only mark messages as read if they are:
- The recipient of a direct message
- A member of the group for group messages

## Error Handling

The server will emit `error` events for various scenarios:

```javascript
socket.on('error', (error) => {
  console.error('WebSocket error:', error.message);
  // Possible errors:
  // - "Not authenticated"
  // - "Invalid message data"
  // - "Failed to send message"
  // - "Message not found"
  // - "Not authorized to read this message"
});
```

## Connection Management

### Automatic Features
- **Authentication**: Connections without valid JWT tokens are automatically rejected
- **Room Management**: Users are joined to their conversation rooms (`user:<id>`, `direct:<a>:<b>`, `group:<id>`) when they connect. When a message is sent in a conversation that is new since they connected, the server joins both participants (or all group members) to the room just before broadcasting, so first messages are delivered live
- **Presence Tracking**: Online/offline status is automatically managed
- **Cleanup**: Typing indicators and presence are cleaned up on disconnection
- **CORS**: The allowed browser origin is `FRONTEND_URL` (default `http://localhost:5173`)
- **Token secret**: Tokens are verified with the same `JWT_SECRET` as the REST API; the server refuses to start without it

### Manual Disconnection
```javascript
socket.disconnect();
```

## Integration with REST API

The WebSocket messaging integrates seamlessly with the existing REST messaging endpoints:

- Messages sent via WebSocket are stored in the database (same as REST)
- Message history can be retrieved via REST endpoints
- Group management is done via REST endpoints
- User authentication works the same way

## Example Complete Client

```javascript
import io from 'socket.io-client';

class MessagingClient {
  constructor(token) {
    this.socket = io('http://localhost:3000/messaging', {
      auth: { token }
    });
    
    this.setupEventHandlers();
  }
  
  setupEventHandlers() {
    this.socket.on('connect', () => {
      console.log('Connected to messaging server');
      this.getOnlineUsers();
    });
    
    this.socket.on('new_message', (message) => {
      this.displayMessage(message);
    });
    
    this.socket.on('typing_indicator', (data) => {
      this.showTypingIndicator(data);
    });
    
    this.socket.on('user_presence_update', (data) => {
      this.updateUserPresence(data);
    });
    
    this.socket.on('message_read', (data) => {
      this.markMessageAsRead(data);
    });
    
    this.socket.on('error', (error) => {
      console.error('Error:', error.message);
    });
  }
  
  sendMessage(content, receiverId, groupId) {
    this.socket.emit('send_message', {
      content,
      receiverId,
      groupId
    });
  }
  
  startTyping(receiverId, groupId) {
    this.socket.emit('typing_start', { receiverId, groupId });
  }
  
  stopTyping(receiverId, groupId) {
    this.socket.emit('typing_stop', { receiverId, groupId });
  }
  
  markMessageRead(messageId) {
    this.socket.emit('mark_message_read', { messageId });
  }
  
  getOnlineUsers() {
    this.socket.emit('get_online_users');
  }
  
  // Implement these methods based on your UI framework
  displayMessage(message) { /* ... */ }
  showTypingIndicator(data) { /* ... */ }
  updateUserPresence(data) { /* ... */ }
  markMessageAsRead(data) { /* ... */ }
}

// Usage
const client = new MessagingClient('your-jwt-token');
```

## Security Notes

1. **Authentication Required**: All connections must provide a valid JWT token
2. **RBAC Enforced**: All message sending/receiving follows organizational hierarchy rules
3. **Automatic Cleanup**: Server automatically cleans up resources on disconnection
4. **Input Validation**: All incoming data is validated before processing
5. **Error Boundaries**: Errors are caught and handled gracefully without crashing the server

The WebSocket implementation provides a secure, real-time messaging experience while maintaining the same security and access control standards as the REST API.