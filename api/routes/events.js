import { Router } from "express";
import { logErrorFromCatch } from "../shared/errorLogger.js";
import { auth } from "../shared/firebase-admin.js";

const router = Router();

// Store active SSE connections per user
const connections = new Map();

/**
 * Middleware to authenticate SSE connection via query parameter
 * EventSource doesn't support custom headers, so we use query param
 * Uses Firebase Admin SDK to verify Firebase auth tokens
 */
async function authenticateSSE(req, res, next) {
    try {
        const token = req.query.token;
        
        if (!token) {
            res.status(401).json({ error: 'No token provided' });
            return;
        }
        
        // Verify Firebase token using Admin SDK
        const decodedToken = await auth.verifyIdToken(token);
        req.userId = decodedToken.uid;
        req.userEmail = decodedToken.email;
        
        // Verify userId in params matches token
        if (req.params.userId !== decodedToken.uid) {
            res.status(403).json({ error: 'User ID mismatch' });
            return;
        }
        
        next();
    } catch (err) {
        logErrorFromCatch(err, '[SSE-AUTH] Token verification failed');
        res.status(401).json({ error: 'Invalid token' });
    }
}

/**
 * GET /events/:userId?token=xxx
 * Server-Sent Events endpoint for real-time notifications
 * Maintains a persistent connection to push updates to the client
 */
router.get("/:userId", authenticateSSE, (req, res) => {
    const { userId } = req.params;
    
    // Set headers for SSE
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // Disable nginx buffering
    });
    
    // Send initial connection confirmation
    res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}\n\n`);
    
    // Store connection
    connections.set(userId, res);
    
    // Send heartbeat every 30 seconds to keep connection alive
    const heartbeat = setInterval(() => {
        if (connections.has(userId)) {
            res.write(`: heartbeat ${Date.now()}\n\n`);
        } else {
            clearInterval(heartbeat);
        }
    }, 30000);
    
    // Clean up on disconnect
    req.on('close', () => {
        connections.delete(userId);
        clearInterval(heartbeat);
    });
});

/**
 * Notify a specific user that a new message is ready
 * Called when Redis pub/sub receives a notification
 * @param {string} userId - User ID to notify
 * @param {object} data - Notification data
 */
export function notifyUser(userId, data = {}) {
    const connection = connections.get(userId);
    if (connection) {
        try {
            const message = {
                type: 'message_ready',
                timestamp: new Date().toISOString(),
                ...data
            };
            connection.write(`data: ${JSON.stringify(message)}\n\n`);
        } catch (err) {
            logErrorFromCatch(err, '[SSE] Error sending notification to user:', userId);
            // Remove broken connection
            connections.delete(userId);
        }
    }
}

/**
 * Get count of active SSE connections
 * Useful for monitoring
 */
export function getActiveConnectionsCount() {
    return connections.size;
}

/**
 * Close all SSE connections
 * Useful for graceful shutdown
 */
export function closeAllConnections() {
    for (const [userId, connection] of connections.entries()) {
        try {
            connection.end();
        } catch (err) {
            // Ignore errors during shutdown
        }
    }
    connections.clear();
}

export default router;
