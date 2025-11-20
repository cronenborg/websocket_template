const WebSocket = require('ws');
const http = require('http');

// Create HTTP server
const server = http.createServer();

// Create two WebSocket servers on different paths
const publicWss = new WebSocket.Server({ noServer: true });
const adminWss = new WebSocket.Server({ noServer: true });

// Store connected clients
const publicClients = new Set();
const adminClients = new Set();

// Admin authentication token (in production, use proper authentication)
const ADMIN_TOKEN = 'admin-secret-token';

// Handle public channel connections
publicWss.on('connection', (ws) => {
    console.log('New public client connected');
    publicClients.add(ws);

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            console.log('Public client message:', data);
            // Public clients can only receive messages, not send to others
        } catch (error) {
            console.error('Error parsing public message:', error);
        }
    });

    ws.on('close', () => {
        console.log('Public client disconnected');
        publicClients.delete(ws);
    });

    ws.on('error', (error) => {
        console.error('Public client error:', error);
    });

    // Send welcome message
    ws.send(JSON.stringify({
        type: 'connected',
        message: 'Connected to public channel'
    }));
});

// Handle admin channel connections
adminWss.on('connection', (ws) => {
    console.log('New admin client connected');
    adminClients.add(ws);

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            console.log('Admin message received:', data);

            // Handle different message types from admin
            if (data.type === 'pageAction') {
                // Broadcast pageAction to all public clients
                broadcastToPublic({
                    type: 'pageAction',
                    payload: data.payload
                });
                console.log('Broadcasted pageAction to public clients:', data.payload);
            } else if (data.type === 'messageToAll') {
                // Broadcast messageToAll to all public clients
                broadcastToPublic({
                    type: 'messageToAll',
                    payload: data.payload
                });
                console.log('Broadcasted messageToAll to public clients:', data.payload);
            } else {
                console.log('Unknown admin message type:', data.type);
            }
        } catch (error) {
            console.error('Error parsing admin message:', error);
        }
    });

    ws.on('close', () => {
        console.log('Admin client disconnected');
        adminClients.delete(ws);
    });

    ws.on('error', (error) => {
        console.error('Admin client error:', error);
    });

    // Send welcome message
    ws.send(JSON.stringify({
        type: 'connected',
        message: 'Connected to admin channel'
    }));
});

// Function to broadcast messages to all public clients
function broadcastToPublic(message) {
    const messageStr = JSON.stringify(message);
    publicClients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(messageStr);
        }
    });
}

// Handle upgrade requests and route to appropriate WebSocket server
server.on('upgrade', (request, socket, head) => {
    const pathname = new URL(request.url, `http://${request.headers.host}`).pathname;

    if (pathname === '/public') {
        // Route to public channel
        publicWss.handleUpgrade(request, socket, head, (ws) => {
            publicWss.emit('connection', ws, request);
        });
    } else if (pathname === '/admin') {
        // Check for admin authentication
        const url = new URL(request.url, `http://${request.headers.host}`);
        const token = url.searchParams.get('token');

        if (token === ADMIN_TOKEN) {
            // Route to admin channel
            adminWss.handleUpgrade(request, socket, head, (ws) => {
                adminWss.emit('connection', ws, request);
            });
        } else {
            // Reject unauthorized connection
            socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
            socket.destroy();
            console.log('Unauthorized admin connection attempt');
        }
    } else {
        // Unknown path
        socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
        socket.destroy();
    }
});

// Start the server
const PORT = 8080;
server.listen(PORT, () => {
    console.log(`WebSocket server is running on ws://localhost:${PORT}`);
    console.log(`Public channel: ws://localhost:${PORT}/public`);
    console.log(`Admin channel: ws://localhost:${PORT}/admin?token=${ADMIN_TOKEN}`);
    console.log('\nAdmin can send messages with types:');
    console.log('  - "pageAction" with payload');
    console.log('  - "messageToAll" with payload');
});