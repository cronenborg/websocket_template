# WebSocket Server with Public and Admin Channels

A Node.js WebSocket server using the `ws` library that provides two separate channels: one for public clients and one for admin users.

## Features

- **Public Channel** (`/public`): Receives messages from admins
- **Admin Channel** (`/admin`): Sends messages to all public clients
- **Two Message Types**:
  - `pageAction`: Triggers page actions on public clients
  - `messageToAll`: Broadcasts messages to all public clients
- **Token-based Authentication**: Admin channel requires authentication token

## Installation

```bash
npm install
```

## Running the Server

```bash
npm start
```

The server will start on `ws://localhost:8080`

## Channels

### Public Channel
- **URL**: `ws://localhost:8080/public`
- **Purpose**: Receives broadcasts from admin
- **Authentication**: None required

### Admin Channel
- **URL**: `ws://localhost:8080/admin?token=admin-secret-token`
- **Purpose**: Send messages to all public clients
- **Authentication**: Requires token parameter

## Admin Message Format

Admins can send two types of messages:

### 1. pageAction
```json
{
  "type": "pageAction",
  "payload": {
    "action": "navigate",
    "url": "/home"
  }
}
```

### 2. messageToAll
```json
{
  "type": "messageToAll",
  "payload": {
    "text": "Server maintenance in 5 minutes",
    "priority": "high"
  }
}
```

## Testing

Two HTML test clients are provided:

1. **Public Client**: Open `test-public-client.html` in your browser
   - Connects to the public channel
   - Displays all received messages

2. **Admin Client**: Open `test-admin-client.html` in your browser
   - Connects to the admin channel
   - Provides UI to send pageAction and messageToAll messages
   - Shows activity log

### Testing Steps

1. Start the server: `npm start`
2. Open `test-public-client.html` in one or more browser tabs
3. Open `test-admin-client.html` in another browser tab
4. Use the admin client to send messages
5. Watch the public clients receive the messages in real-time

## Security Note

The admin token (`admin-secret-token`) is hardcoded for demonstration purposes. In production, use proper authentication mechanisms like JWT tokens, OAuth, or other secure authentication methods.

## Server Configuration

- **Port**: 8080 (can be changed in `server.js`)
- **Admin Token**: `admin-secret-token` (change in `server.js`)

## Architecture

```
┌─────────────────┐
│  Admin Client   │
│  (Authenticated)│
└────────┬────────┘
         │
         │ ws://localhost:8080/admin?token=xxx
         │
         ▼
┌─────────────────────────────────┐
│     WebSocket Server            │
│  ┌──────────────────────────┐   │
│  │   Admin Channel          │   │
│  │  - Receives messages     │   │
│  │  - Routes to public      │   │
│  └──────────┬───────────────┘   │
│             │                    │
│             │ Broadcast          │
│             ▼                    │
│  ┌──────────────────────────┐   │
│  │   Public Channel         │   │
│  │  - Sends to all clients  │   │
│  └──────────┬───────────────┘   │
└─────────────┼───────────────────┘
              │
              │ ws://localhost:8080/public
              │
     ┌────────┴────────┬──────────────┐
     ▼                 ▼              ▼
┌─────────┐      ┌─────────┐    ┌─────────┐
│ Public  │      │ Public  │    │ Public  │
│ Client 1│      │ Client 2│    │ Client N│
└─────────┘      └─────────┘    └─────────┘
```

## Message Flow

1. Admin connects to `/admin` with valid token
2. Admin sends message with type `pageAction` or `messageToAll`
3. Server receives admin message
4. Server broadcasts message to all connected public clients
5. Public clients receive and process the message