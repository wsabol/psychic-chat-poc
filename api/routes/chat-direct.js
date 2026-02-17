/**
 * CHAT-DIRECT ROUTE
 * Mobile-friendly chat endpoints that don't require hashed userIds in URLs
 * All authentication is handled via JWT tokens (authenticateToken + verify2FA)
 * Phase 2 of Architecture Consolidation Plan
 */

import { Router } from "express";
import { verify2FA } from "../middleware/auth.js";
import { processChatMessageSync } from "../services/chat/processor.js";
import { hashUserId } from "../shared/hashUtils.js";
import { db } from "../shared/db.js";
import { generatePsychicOpening } from "../shared/opening.js";
import { getRecentMessages, insertMessage } from "../shared/user.js";
import { guardName } from "../shared/nameGuard.js";
import { getLocalDateForTimezone } from "../shared/timezoneHelper.js";
import { successResponse, serverError, noContentResponse } from "../utils/responses.js";
import { logErrorFromCatch } from "../shared/errorLogger.js";

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

/**
 * GET /chat-direct/history
 * Returns chat history for the authenticated user (no userId in URL needed)
 * User identification comes from JWT token
 */
router.get("/history", verify2FA, async (req, res) => {
    const userId = req.userId;
    const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
    
    try {
        const userIdHash = hashUserId(userId);
        
        // Fetch messages from database
        const query = `SELECT 
            id, 
            role, 
            language_code,
            pgp_sym_decrypt(content_full_encrypted, $2)::text as content_full,
            pgp_sym_decrypt(content_brief_encrypted, $2)::text as brief_full,
            created_at
        FROM messages 
        WHERE user_id_hash = $1 
        ORDER BY created_at ASC`;
        
        const { rows } = await db.query(query, [userIdHash, ENCRYPTION_KEY]);
        
        // Transform: format for frontend
        const transformedRows = rows.map(msg => {
            let fullContent = msg.content_full;
            let briefContent = msg.brief_full;
            
            // Parse JSON if valid (skip if null or empty object string)
            try {
                if (fullContent && fullContent !== '{}' && fullContent !== null) {
                    fullContent = JSON.parse(fullContent);
                }
            } catch (e) {
                // Keep as string if not JSON
            }
            try {
                if (briefContent && briefContent !== '{}') briefContent = JSON.parse(briefContent);
            } catch (e) {
                // Keep as string if not JSON
            }
            
            return {
                id: msg.id,
                role: msg.role,
                language_code: msg.language_code,
                content: fullContent || briefContent,
                brief_content: briefContent,
                created_at: msg.created_at
            };
        });
        
        successResponse(res, transformedRows);
    } catch (err) {
        logErrorFromCatch(err, 'app', 'chat-direct-history');
        return serverError(res, 'Failed to retrieve message history');
    }
});

/**
 * GET /chat-direct/opening
 * Get or generate opening message for today (no userId in URL needed)
 * User identification comes from JWT token
 * Returns 204 No Content if opening already exists for today
 */
router.get("/opening", verify2FA, async (req, res) => {
    const userId = req.userId;

    try {
        // Get user's local timezone date
        const userIdHash = hashUserId(userId);
        const { rows: tzRows } = await db.query(
            `SELECT timezone FROM user_preferences WHERE user_id_hash = $1`,
            [userIdHash]
        );
        const userTimezone = tzRows.length > 0 && tzRows[0].timezone ? tzRows[0].timezone : 'UTC';
        const todayLocalDate = getLocalDateForTimezone(userTimezone);
        
        // Check if opening already exists for today
        const { rows: existingOpenings } = await db.query(
            `SELECT id, created_at FROM messages 
             WHERE user_id_hash = $1 
             AND role = 'assistant' 
             AND created_at_local_date = $2
             ORDER BY created_at ASC 
             LIMIT 1`,
            [userIdHash, todayLocalDate]
        );

        // If we already have an assistant message from today (opening), don't create a new one
        if (existingOpenings.length > 0) {
            return noContentResponse(res);
        }

        // Fetch user's language preference
        const { rows: prefRows } = await db.query(
            `SELECT language, oracle_language FROM user_preferences WHERE user_id_hash = $1`,
            [userIdHash]
        );
        const userLanguage = prefRows.length > 0 ? prefRows[0].language : 'en-US';
        const oracleLanguage = prefRows.length > 0 ? prefRows[0].oracle_language : 'en-US';

        // Get recent messages for context
        const recentMessages = await getRecentMessages(userId);
        
        // Fetch and sanitize user's name for oracle greeting
        const isTempUser = userId.startsWith('temp_');
        let rawClientName = null;
        
        try {
            const { rows: personalInfoRows } = await db.query(
                "SELECT pgp_sym_decrypt(first_name_encrypted, $1) as first_name, pgp_sym_decrypt(familiar_name_encrypted, $1) as familiar_name FROM user_personal_info WHERE user_id = $2",
                [process.env.ENCRYPTION_KEY, userId]
            );
            if (personalInfoRows.length > 0 && personalInfoRows[0]) {
                rawClientName = personalInfoRows[0].familiar_name || 
                               personalInfoRows[0].first_name;
            }
        } catch (err) {
            rawClientName = null;
        }
        
        // Apply name protection
        const clientName = guardName(rawClientName, isTempUser);

        let opening = await generatePsychicOpening({
            clientName: clientName,
            recentMessages: recentMessages,
            oracleLanguage: oracleLanguage,
            userTimezone: userTimezone
        });

        // Store opening as proper content object
        let openingContent = { text: opening };

        // Final safety check on fallback message
        if (opening === '') {
            const safeFallbackName = guardName(clientName, isTempUser);
            opening = `Hi ${safeFallbackName}, thank you for being here today. Before we begin, is there an area of your life you're hoping to get clarity on?`;
            openingContent.text = opening;
        }

        await insertMessage(userId, 'assistant', openingContent, null, userTimezone);

        successResponse(res, {
            role: 'assistant',
            content: opening
        });
    } catch (err) {
        logErrorFromCatch(err, 'app', 'chat-direct-opening');
        return serverError(res, 'Failed to generate opening');
    }
});

export default router;
