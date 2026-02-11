/**
 * CHAT-DIRECT ROUTE
 * Synchronous chat endpoint that processes messages directly without queue
 * Phase 2 of Architecture Consolidation Plan
 */

import { Router } from "express";
import { verify2FA } from "../middleware/auth.js";
import { processChatMessageSync } from "../services/chat/processor.js";

const router = Router();

/**
 * POST /chat-direct
 * Process chat message synchronously and return response immediately
 * 
 * Body: { message: string }
 * Response: { success, role, contentFull, contentBrief, ... }
 */
router.post("/", verify2FA, async (req, res) => {
    const { message } = req.body;
    const userId = req.userId;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
        return res.status(400).json({
            success: false,
            error: 'Message is required'
        });
    }

    try {
        
        const response = await processChatMessageSync(userId, message);
        
        if (!response.success) {
            return res.status(500).json(response);
        }
        
        return res.json({
            success: true,
            id: response.id,
            role: response.role,
            content: response.contentFull,
            contentBrief: response.contentBrief,
            responseType: response.responseType,
            createdAt: response.createdAt
        });
        
    } catch (err) {
        console.error('[CHAT-DIRECT] Error processing message:', err);
        return res.status(500).json({
            success: false,
            error: 'Failed to process message',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

export default router;
