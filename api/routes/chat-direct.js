/**
 * CHAT-DIRECT ROUTE
 * Mobile-friendly chat endpoints that don't require hashed userIds in URLs
 * All authentication is handled via JWT tokens (authenticateToken + verify2FA)
 * Phase 2 of Architecture Consolidation Plan
 */

import { Router } from "express";
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
router.post("/", async (req, res) => {
    const { message } = req.body;
    // req.userId is set by authenticateToken middleware in index.js
    const userId = req.userId || req.user?.userId;

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
router.get("/history", async (req, res) => {
    // req.userId is set by authenticateToken middleware in index.js
    const userId = req.userId || req.user?.userId;
    const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
    
    try {
        const userIdHash = hashUserId(userId);
        
        // Fetch messages from database - only user/assistant chat messages (exclude astrology)
        const query = `SELECT 
            id, 
            role, 
            language_code,
            pgp_sym_decrypt(content_full_encrypted, $2)::text as content_full,
            pgp_sym_decrypt(content_brief_encrypted, $2)::text as brief_full,
            created_at
        FROM messages 
        WHERE user_id_hash = $1 
        AND role IN ('user', 'assistant')
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
router.get("/opening", async (req, res) => {
    // req.userId is set by authenticateToken middleware in index.js
    const userId = req.userId || req.user?.userId;

    try {
        // Get user's local timezone date
        const userIdHash = hashUserId(userId);
        const { rows: tzRows } = await db.query(
            `SELECT timezone FROM user_preferences WHERE user_id_hash = $1`,
            [userIdHash]
        );
        // The mobile app sends the device's IANA timezone as ?timezone=America/Chicago.
        // Use the DB value as the authoritative source; fall back to the client-supplied
        // value when the DB row is absent or blank (e.g. new account that hasn't saved
        // preferences yet).  This fixes the "good afternoon at 10 AM" bug where the
        // oracle was defaulting to UTC because no timezone was stored in the DB.
        const clientTimezone = req.query.timezone;
        const userTimezone = (tzRows.length > 0 && tzRows[0].timezone)
            ? tzRows[0].timezone
            : (clientTimezone || 'UTC');
        const todayLocalDate = getLocalDateForTimezone(userTimezone);
        
        // Acquire a PostgreSQL advisory lock keyed to this user to prevent race conditions.
        // If two requests arrive within the same second, the second will see the lock is taken
        // and bail out immediately rather than generating a duplicate greeting.
        // The lock key is a stable 32-bit integer derived from the first 8 hex chars of the hash.
        const lockKey = parseInt(userIdHash.substring(0, 8), 16);
        const { rows: lockResult } = await db.query(
            'SELECT pg_try_advisory_lock($1) as acquired',
            [lockKey]
        );

        if (!lockResult[0].acquired) {
            // Another concurrent request is already generating the opening for this user.
            // Treat as "already handled" — the other request will store the greeting.
            return noContentResponse(res);
        }

        try {
        // Re-check AFTER acquiring the lock — a concurrent request that just released
        // the lock may have already stored today's opening.
        // When ?force=true is passed (e.g. after an oracle character change), skip
        // this check so a fresh greeting from the new character is always generated.
        const isForced = req.query.force === 'true';

        if (!isForced) {
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
        }

        // Fetch user's language and oracle character preferences
        const { rows: prefRows } = await db.query(
            `SELECT language, oracle_language, oracle_character FROM user_preferences WHERE user_id_hash = $1`,
            [userIdHash]
        );
        const userLanguage = prefRows.length > 0 ? prefRows[0].language : 'en-US';
        const oracleLanguage = prefRows.length > 0 ? prefRows[0].oracle_language : 'en-US';
        const oracleCharacter = prefRows.length > 0 ? (prefRows[0].oracle_character || 'sage') : 'sage';

            // Get recent messages for context
            const recentMessages = await getRecentMessages(userId);
            
            // Fetch and sanitize user's name for oracle greeting
            const isTempUser = userId.startsWith('temp_');
            let rawClientName = null;
            
            try {
                const { rows: personalInfoRows } = await db.query(
                    "SELECT pgp_sym_decrypt(familiar_name_encrypted, $1) as familiar_name FROM user_personal_info WHERE user_id = $2",
                    [process.env.ENCRYPTION_KEY, userId]
                );
                if (personalInfoRows.length > 0 && personalInfoRows[0]) {
                    rawClientName = personalInfoRows[0].familiar_name;
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
                userTimezone: userTimezone,
                oracleCharacter: oracleCharacter,
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
        } finally {
            // Always release the advisory lock so other requests can proceed
            await db.query('SELECT pg_advisory_unlock($1)', [lockKey]);
        }
    } catch (err) {
        logErrorFromCatch(err, 'app', 'chat-direct-opening');
        return serverError(res, 'Failed to generate opening');
    }
});

export default router;
