const http = require('http');
const WebSocket = require('ws');

// Static news data
const newsData = {
    title: "Breaking News: WebSocket Server Update",
    description: "The WebSocket server has been successfully updated with new features including image carousel control and real-time notifications."
};

// Create HTTP server for API
const apiServer = http.createServer((req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // GET /api/news - Get news data
    if (req.url === '/api/news' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(newsData));
        console.log('GET /api/news - News data sent');
        return;
    }

    // POST /api/news/webhook - Webhook endpoint
    if (req.url === '/api/news/webhook' && req.method === 'POST') {
        let body = '';
        
        req.on('data', chunk => {
            body += chunk.toString();
        });

        req.on('end', () => {
            console.log('POST /api/news/webhook - Webhook received');
            console.log('Body:', body);

            // Trigger WebSocket message to public clients via admin channel
            triggerNewsUpdate();

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
                success: true, 
                message: 'News update triggered' 
            }));
        });
        return;
    }

    // 404 for other routes
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
});

// WebSocket client to connect to admin channel
let adminWs = null;
const ADMIN_TOKEN = 'admin-secret-token';

function connectToAdminChannel() {
    adminWs = new WebSocket(`ws://localhost:8080/admin?token=${ADMIN_TOKEN}`);

    adminWs.on('open', () => {
        console.log('API Server connected to WebSocket admin channel');
    });

    adminWs.on('message', (message) => {
        console.log('Received from WebSocket:', message.toString());
    });

    adminWs.on('close', () => {
        console.log('Disconnected from WebSocket admin channel, reconnecting...');
        setTimeout(connectToAdminChannel, 3000);
    });

    adminWs.on('error', (error) => {
        console.error('WebSocket error:', error.message);
    });
}

function triggerNewsUpdate() {
    if (adminWs && adminWs.readyState === WebSocket.OPEN) {
        const message = {
            type: 'pageAction',
            payload: {
                action: 'updateNews',
                timestamp: new Date().toISOString()
            }
        };
        
        adminWs.send(JSON.stringify(message));
        console.log('Sent updateNews message to public clients via WebSocket');
    } else {
        console.error('WebSocket not connected, cannot send updateNews message');
    }
}

// Start API server
const API_PORT = 3000;
apiServer.listen(API_PORT, () => {
    console.log(`API Server running on http://localhost:${API_PORT}`);
    console.log(`GET  http://localhost:${API_PORT}/api/news`);
    console.log(`POST http://localhost:${API_PORT}/api/news/webhook`);
    
    // Connect to WebSocket admin channel
    connectToAdminChannel();
});