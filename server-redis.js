/* High-Performance Clustered WebSocket Server 
  Stack: uWebSockets.js + Redis
*/
const uWS = require('uWebSockets.js');
const Redis = require('ioredis');
const { TextDecoder, TextEncoder } = require('util');
const os = require('os');

const PORT = 8080;
const decoder = new TextDecoder();
const POD_NAME = os.hostname(); // This helps us see which Pod we are on
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

// 1. Setup Redis Clients
// Publisher: Sends messages to other pods
// Subscriber: Listens for messages from other pods
const redisPub = new Redis(redisUrl);
const redisSub = new Redis(redisUrl);

// 2. Redis Subscription Logic (The "Glue")
// When Redis tells us there is a message, we broadcast it to OUR local users
redisSub.subscribe('GLOBAL_BROADCAST', (err) => {
    if (err) console.error(`[${POD_NAME}] Redis Subscribe Error:`, err);
    else console.log(`[${POD_NAME}] Subscribed to GLOBAL_BROADCAST`);
});

redisSub.on('message', (channel, message) => {
    // This triggers uWebSockets.js C++ internal broadcast
    // It is extremely efficient (millions of ops/sec)
    console.log('Received message from Redis:', message);
    app.publish('broadcast_room', message);
});

// 3. uWebSockets.js Application
const app = uWS.App().ws('/*', {
    /* Options */
    compression: uWS.SHARED_COMPRESSOR,
    maxPayloadLength: 16 * 1024,
    idleTimeout: 60,

    open: (ws) => {
        // Subscribe the new connection to a specific 'topic' inside uWS
        ws.subscribe('broadcast_room');
        console.log(`[${POD_NAME}] New Connection established`);
        ws.send(JSON.stringify({ type: 'info', msg: `Connected to pod: ${POD_NAME}` }));
    },

    message: (ws, message, isBinary) => {
        // SCENARIO: User sent a message.
        // We do NOT broadcast locally immediately. 
        // We publish to Redis so ALL pods get it.
        const msgString = decoder.decode(message);
        
        // Publish to Redis Channel
        // Construct a payload to verify clustering
        const payload = JSON.stringify({
            from_pod: POD_NAME,
            content: msgString
        });

        // Publish to Redis -> This goes to ALL pods (including this one)
        redisPub.publish('GLOBAL_BROADCAST', payload);
        console.log('Published message to Redis:', msgString);
    },

    close: (ws, code, message) => {
        console.log(`[${POD_NAME}] Connection closed`);
    }

}).listen(PORT, (token) => {
    if (token) {
        console.log(`[${POD_NAME}] Listening on port ${PORT}`);
    } else {
        console.log(`[${POD_NAME}] Failed to listen on port ${PORT}`);
    }
});