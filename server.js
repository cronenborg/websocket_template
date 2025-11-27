const uWS = require('uWebSockets.js');
const crypto = require('crypto');

// Function to generate unique client ID
function generateClientId() {
    return crypto.randomUUID();
}

// Store connected clients
const publicClients = new Map();
const adminClients = new Map();

// Admin authentication token (in production, use proper authentication)
const ADMIN_TOKEN = 'admin-secret-token';

// Function to broadcast client count to all admin clients
function broadcastClientCount() {
    const count = publicClients.size;
    const message = JSON.stringify({
        type: 'clientCount',
        count: count
    });
    
    adminClients.forEach((client) => {
        client.send(message);
    });
    console.log(`Broadcasted client count to admins: ${count}`);
}

// Function to broadcast messages to all public clients
function broadcastToPublic(message) {
    const messageStr = JSON.stringify(message);
    publicClients.forEach((client) => {
        client.send(messageStr);
    });
}

// Create uWebSocket app
const app = uWS.App();

// Public WebSocket endpoint
app.ws('/public', {
    /* Options */
    compression: uWS.SHARED_COMPRESSOR,
    maxPayloadLength: 16 * 1024 * 1024,
    idleTimeout: 60,
    
    /* Handlers */
    open: (ws) => {
        // Assign unique ID to the client
        const clientId = generateClientId();
        ws.clientId = clientId;
        console.log(`New public client connected with ID: ${clientId}`);
        publicClients.set(clientId, ws);
        
        // Notify admins of new client count
        broadcastClientCount();

        // Send welcome message with client ID
        ws.send(JSON.stringify({
            type: 'connected',
            message: 'Connected to public channel',
            clientId: clientId
        }));
    },
    
    message: (ws, message, isBinary) => {
        try {
            const data = JSON.parse(Buffer.from(message).toString());
            // Add client ID to the message
            data.clientId = ws.clientId;
            console.log('Public client message:', data);
            // Public clients can only receive messages, not send to others
        } catch (error) {
            console.error('Error parsing public message:', error);
        }
    },
    
    close: (ws, code, message) => {
        console.log(`Public client disconnected: ${ws.clientId}`);
        publicClients.delete(ws.clientId);
        
        // Notify admins of updated client count
        broadcastClientCount();
    }
});

// Admin WebSocket endpoint
app.ws('/admin', {
    /* Options */
    compression: uWS.SHARED_COMPRESSOR,
    maxPayloadLength: 16 * 1024 * 1024,
    idleTimeout: 60,
    
    /* Handlers */
    upgrade: (res, req, context) => {
        // Check for admin authentication
        const token = req.getQuery('token');
        
        if (token === ADMIN_TOKEN) {
            // Upgrade to WebSocket
            res.upgrade(
                { url: req.getUrl() },
                req.getHeader('sec-websocket-key'),
                req.getHeader('sec-websocket-protocol'),
                req.getHeader('sec-websocket-extensions'),
                context
            );
        } else {
            // Reject unauthorized connection
            res.writeStatus('401 Unauthorized').end('Unauthorized');
            console.log('Unauthorized admin connection attempt');
        }
    },
    
    open: (ws) => {
        // Assign unique ID to the admin client
        const clientId = generateClientId();
        ws.clientId = clientId;
        console.log(`New admin client connected with ID: ${clientId}`);
        adminClients.set(clientId, ws);

        // Send welcome message with client ID and current client count
        ws.send(JSON.stringify({
            type: 'connected',
            message: 'Connected to admin channel',
            clientId: clientId
        }));
        
        // Send current client count immediately
        ws.send(JSON.stringify({
            type: 'clientCount',
            count: publicClients.size
        }));
    },
    
    message: (ws, message, isBinary) => {
        try {
            const data = JSON.parse(Buffer.from(message).toString());
            
            // IMPORTANT: Always use the server-assigned clientId from the WebSocket connection
            // This ensures the message is correctly attributed to THIS specific admin
            // and prevents any client-side spoofing of the clientId
            const authenticatedClientId = ws.clientId;
            
            console.log(`Admin message received from ${authenticatedClientId}:`, data);

            // Handle different message types from admin
            if (data.type === 'pageAction') {
                // Broadcast pageAction to all public clients with the authenticated admin ID
                broadcastToPublic({
                    type: 'pageAction',
                    payload: data.payload,
                    adminClientId: authenticatedClientId,
                    timestamp: new Date().toISOString()
                });
                console.log(`Admin ${authenticatedClientId} broadcasted pageAction to public clients:`, data.payload);
            } else if (data.type === 'messageToAll') {
                // Broadcast messageToAll to all public clients with the authenticated admin ID
                broadcastToPublic({
                    type: 'messageToAll',
                    payload: data.payload,
                    adminClientId: authenticatedClientId,
                    timestamp: new Date().toISOString()
                });
                console.log(`Admin ${authenticatedClientId} broadcasted messageToAll to public clients:`, data.payload);
            } else {
                console.log(`Unknown admin message type from ${authenticatedClientId}:`, data.type);
            }
        } catch (error) {
            console.error(`Error parsing admin message from ${ws.clientId}:`, error);
        }
    },
    
    close: (ws, code, message) => {
        console.log(`Admin client disconnected: ${ws.clientId}`);
        adminClients.delete(ws.clientId);
    }
});

// Start the server
const PORT = 8080;
app.listen(PORT, (listenSocket) => {
    if (listenSocket) {
        console.log(`WebSocket server is running on ws://localhost:${PORT}`);
        console.log(`Public channel: ws://localhost:${PORT}/public`);
        console.log(`Admin channel: ws://localhost:${PORT}/admin?token=${ADMIN_TOKEN}`);
        console.log('\nAdmin can send messages with types:');
        console.log('  - "pageAction" with payload');
        console.log('  - "messageToAll" with payload');
    } else {
        console.error(`Failed to listen on port ${PORT}`);
    }
});