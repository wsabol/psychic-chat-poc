import { Router } from "express";
import { authenticateToken, authorizeUser } from "../middleware/auth.js";
import { checkResponseReady } from "../shared/notifications.js";
import { serverError } from "../utils/responses.js";
import { successResponse } from '../utils/responses.js';

const router = Router();

/**
 * GET /response-status/:userId
 * Check if a response is ready for the user
 * Returns the notification data if ready, or empty object if not
 * This endpoint allows the frontend to quickly fetch responses
 * as soon as the worker has finished processing and storing them
 */
router.get("/:userId", authenticateToken, authorizeUser, async (req, res) => {
    const { userId } = req.params;
    
    try {
        const notification = await checkResponseReady(userId);
        
        if (notification) {
            // Response is ready - return the notification details
            return successResponse(res, {
                ready: true,
                messageType: notification.messageType,
                timestamp: notification.timestamp,
                notifiedAt: notification.notifiedAt
            });
        }
        
        // No response ready yet
        return successResponse(res, {
            ready: false
        });
    } catch (err) {
        return serverError(res, 'Failed to check response status');
    }
});

export default router;
