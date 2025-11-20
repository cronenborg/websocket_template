# WebSocket Server with Public and Admin Channels

A Node.js WebSocket server using the `ws` library that provides two separate channels: one for public clients and one for admin users.

## Features

- **Public Channel** (`/public`): Receives messages from admins
- **Admin Channel** (`/admin`): Sends messages to all public clients
- **API Server**: REST API for news management and webhook integration
- **Image Carousel**: Remote-controlled image carousel with SVG images
- **News System**: Real-time news updates with badge notifications
- **Auto-Reconnection**: Exponential backoff reconnection strategy with toast notifications
- **Message Types**:
  - `pageAction`: Triggers page actions (image changes, news updates)
  - `messageToAll`: Broadcasts messages to all public clients
- **Token-based Authentication**: Admin channel requires authentication token

## Installation

```bash
npm install
```

## Running the Servers

### WebSocket Server (Port 8080)
```bash
npm start
```

### API Server (Port 3000)
```bash
npm run start:api
```

### Both Servers
```bash
npm run start:all
```

The WebSocket server will start on `ws://localhost:8080`
The API server will start on `http://localhost:3000`

## Channels

### Public Channel
- **URL**: `ws://localhost:8080/public`
- **Purpose**: Receives broadcasts from admin
- **Authentication**: None required

### Admin Channel
- **URL**: `ws://localhost:8080/admin?token=admin-secret-token`
- **Purpose**: Send messages to all public clients
- **Authentication**: Requires token parameter

## API Endpoints

### GET /api/news
Returns the current news data.

**Response:**
```json
{
  "title": "Breaking News: WebSocket Server Update",
  "description": "The WebSocket server has been successfully updated..."
}
```

### POST /api/news/webhook
Webhook endpoint that triggers a news update notification to all public clients.

**Request:** Any body or query string (not validated)

**Response:**
```json
{
  "success": true,
  "message": "News update triggered"
}
```

## Message Types

### 1. pageAction - Image Change
```json
{
  "type": "pageAction",
  "payload": {
    "action": "imageChange",
    "data": "img1.svg"
  }
}
```

### 2. pageAction - News Update
```json
{
  "type": "pageAction",
  "payload": {
    "action": "updateNews",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

### 3. messageToAll
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

Three HTML test clients are provided:

1. **Public Client** (`test-public-client.html`)
   - Connects to the public channel
   - Displays image carousel with remote control
   - Shows news updates with badge notifications
   - Displays all received messages

2. **Admin Client** (`test-admin-client.html`)
   - Connects to the admin channel
   - Provides UI to send pageAction and messageToAll messages
   - Quick buttons for image switching
   - Shows activity log

3. **Webhook Tester** (`test-webhook.html`)
   - Triggers news update webhook
   - Tests the API integration
   - Shows request/response logs

### Testing Steps

1. Start both servers:
   ```bash
   npm start          # Terminal 1: WebSocket server
   npm run start:api  # Terminal 2: API server
   ```

2. Open `test-public-client.html` in one or more browser tabs

3. Open `test-admin-client.html` in another browser tab
   - Use the image control buttons to switch carousel images
   - Send custom messages to public clients

4. Open `test-webhook.html` in another browser tab
   - Click "Trigger News Update" button
   - Watch the public client show a red badge and fetch news
   - News items are stacked in the news section

## Automatic Reconnection Testing

Both the public and admin clients implement an **exponential backoff reconnection strategy** with visual toast notifications.

### Reconnection Strategy

- **Initial Delay**: 1 second
- **Max Delay**: 30 seconds
- **Algorithm**: `delay = min(1000ms × 2^attempts, 30000ms)`
- **Backoff Sequence**: 1s → 2s → 4s → 8s → 16s → 30s (max)

### Toast Notifications

Clients display toast notifications for:
- **Disconnected** (red) - When connection is lost
- **Reconnecting** (yellow) - Shows countdown and attempt number
- **Connected** (green) - When successfully reconnected

### How to Test Reconnection

1. **Start the servers and open clients:**
   ```bash
   # Terminal 1
   npm start
   
   # Terminal 2
   npm run start:api
   ```
   
2. **Open the test clients in your browser:**
   - `test-public-client.html`
   - `test-admin-client.html`

3. **Simulate disconnection:**
   - In Terminal 1 (WebSocket server), press `Ctrl+C` to stop the server
   - Watch the clients display:
     - Red "Disconnected" toast
     - Yellow "Reconnecting..." toasts with countdown

4. **Observe reconnection attempts:**
   - First attempt after 1 second
   - Second attempt after 2 seconds
   - Third attempt after 4 seconds
   - And so on with exponential backoff

5. **Restart the server:**
   ```bash
   npm start
   ```

6. **Watch automatic reconnection:**
   - Clients will automatically reconnect on the next attempt
   - Green "Connected" toast will appear
   - Connection status will update to "Connected"
   - Reconnection counter resets to 0

### Expected Behavior

**When server stops:**
```
[Toast] ✗ Disconnected - Connection to server lost
[Toast] ⚠ Reconnecting... - Attempting to reconnect in 1.0s (attempt 1)
[Toast] ⚠ Reconnecting... - Attempting to reconnect in 2.0s (attempt 2)
[Toast] ⚠ Reconnecting... - Attempting to reconnect in 4.0s (attempt 3)
...
```

**When server restarts:**
```
[Toast] ✓ Connected - Successfully connected to server
```

### Testing Tips

- Keep browser console open to see detailed reconnection logs
- Test with multiple client tabs to see synchronized reconnection
- Try stopping/starting the server multiple times
- Observe how the exponential backoff prevents server overload

## Security Note

The admin token (`admin-secret-token`) is hardcoded for demonstration purposes. In production, use proper authentication mechanisms like JWT tokens, OAuth, or other secure authentication methods.

## Server Configuration

### WebSocket Server
- **Port**: 8080 (can be changed in `server.js`)
- **Admin Token**: `admin-secret-token` (change in `server.js` and `api-server.js`)

### API Server
- **Port**: 3000 (can be changed in `api-server.js`)
- **WebSocket Connection**: Connects to admin channel to trigger updates

## Architecture

```
┌─────────────────┐         ┌─────────────────┐
│  Admin Client   │         │  Webhook/API    │
│  (Authenticated)│         │   Trigger       │
└────────┬────────┘         └────────┬────────┘
         │                           │
         │ ws://localhost:8080/      │ POST /api/news/webhook
         │ admin?token=xxx           │
         │                           ▼
         │                  ┌─────────────────┐
         │                  │   API Server    │
         │                  │   Port 3000     │
         │                  └────────┬────────┘
         │                           │
         │                           │ ws://localhost:8080/
         │                           │ admin?token=xxx
         ▼                           ▼
┌──────────────────────────────────────────────┐
│          WebSocket Server (Port 8080)        │
│  ┌────────────────────────────────────────┐  │
│  │         Admin Channel                  │  │
│  │  - Receives from admin client          │  │
│  │  - Receives from API server            │  │
│  │  - Routes to public channel            │  │
│  └──────────────┬─────────────────────────┘  │
│                 │                             │
│                 │ Broadcast                   │
│                 ▼                             │
│  ┌────────────────────────────────────────┐  │
│  │         Public Channel                 │  │
│  │  - Sends to all public clients         │  │
│  └──────────────┬─────────────────────────┘  │
└─────────────────┼────────────────────────────┘
                  │
                  │ ws://localhost:8080/public
                  │
         ┌────────┴────────┬──────────────┐
         ▼                 ▼              ▼
    ┌─────────┐      ┌─────────┐    ┌─────────┐
    │ Public  │      │ Public  │    │ Public  │
    │ Client 1│      │ Client 2│    │ Client N│
    │         │      │         │    │         │
    │ - Carousel     │ - Carousel   │ - Carousel
    │ - News         │ - News       │ - News
    │ - Messages     │ - Messages   │ - Messages
    └────┬────┘      └────┬────┘    └────┬────┘
         │                │              │
         │ GET /api/news  │              │
         └────────────────┴──────────────┘
                          │
                          ▼
                 ┌─────────────────┐
                 │   API Server    │
                 │   Port 3000     │
                 └─────────────────┘
```

## Message Flows

### Image Change Flow
1. Admin client sends `pageAction` with `imageChange` action
2. WebSocket server broadcasts to all public clients
3. Public clients switch carousel to specified image

### News Update Flow
1. External system sends POST to `/api/news/webhook`
2. API server sends `pageAction` with `updateNews` to WebSocket admin channel
3. WebSocket server broadcasts to all public clients
4. Public clients show red badge notification
5. Public clients fetch news from `GET /api/news`
6. News is displayed in stacked list

## Files

- `server.js` - WebSocket server with public and admin channels
- `api-server.js` - REST API server with news endpoints
- `test-public-client.html` - Public client with carousel and news
- `test-admin-client.html` - Admin control panel
- `test-webhook.html` - Webhook testing interface
- `img1.svg`, `img2.svg` - Carousel images
- `package.json` - Project configuration