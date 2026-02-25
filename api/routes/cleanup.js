import { Router } from "express";
import { db } from "../shared/db.js";
import { hashUserId } from "../shared/hashUtils.js";
import { serverError } from "../utils/responses.js";
import { successResponse } from '../utils/responses.js';
import { logErrorFromCatch } from '../shared/errorLogger.js';

const router = Router();

/**
 * DELETE /delete-temp-account/:tempUserId
 * Immediate cleanup when a free-trial user exits.
 *
 * Unauthenticated — guest users do not have Firebase tokens.
 * Safety: only accepts temp_-prefixed IDs so regular accounts cannot be
 * accidentally (or maliciously) deleted through this endpoint.
 */
router.delete("/delete-temp-account/:tempUserId", async (req, res) => {
    try {
        const { tempUserId } = req.params;

        if (!tempUserId || !tempUserId.startsWith('temp_')) {
            return res.status(400).json({ success: false, error: 'Invalid temp user ID' });
        }

        const userIdHash = hashUserId(tempUserId);

        // Delete all database records associated with this guest session
        await db.query(`DELETE FROM user_personal_info WHERE user_id = $1`, [tempUserId]);
        await db.query(`DELETE FROM user_astrology WHERE user_id_hash = $1`, [userIdHash]);
        await db.query(`DELETE FROM messages WHERE user_id_hash = $1`, [userIdHash]);
        await db.query(`DELETE FROM free_trial_sessions WHERE user_id_hash = $1`, [userIdHash]);
        await db.query(`DELETE FROM user_preferences WHERE user_id_hash = $1`, [userIdHash]);
        // 2FA tables are non-critical for free trial users — wrap in try-catch to
        // prevent schema differences from surfacing as errors in the API logs
        try {
            await db.query(`DELETE FROM user_2fa_settings WHERE user_id = $1`, [tempUserId]);
        } catch (_) { /* non-fatal: table may not have this column for guest users */ }
        try {
            await db.query(`DELETE FROM user_2fa_codes WHERE user_id = $1`, [tempUserId]);
        } catch (_) { /* non-fatal */ }

        return successResponse(res, {
            success: true,
            message: "Temporary account deleted"
        });
    } catch (err) {
        await logErrorFromCatch(err, 'cleanup', 'Error deleting temp account');
        return serverError(res, 'Failed to delete temporary account');
    }
});

/**
 * DELETE /cleanup-old-temp-accounts
 * Batch cleanup for guest sessions older than 24 hours.
 * No longer touches Firebase — all temp users are stored in the database only.
 */
router.delete("/cleanup-old-temp-accounts", async (req, res) => {
    try {
        const oneDayAgo = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);

        // Find stale guest sessions (temp_ prefix stored in free_trial_sessions)
        const { rows: staleSessions } = await db.query(
            `SELECT user_id_hash
             FROM free_trial_sessions
             WHERE created_at < $1
             LIMIT 500`,
            [oneDayAgo]
        );

        const hashes = staleSessions.map(r => r.user_id_hash);
        let deletedCount = 0;

        if (hashes.length > 0) {
            // Also collect raw user_ids from user_personal_info for tables keyed by user_id
            const { rows: piRows } = await db.query(
                `SELECT user_id FROM user_personal_info
                 WHERE user_id LIKE 'temp_%'
                   AND created_at < $1
                 LIMIT 500`,
                [oneDayAgo]
            );
            const userIds = piRows.map(r => r.user_id);

            if (userIds.length > 0) {
                await db.query(`DELETE FROM user_personal_info WHERE user_id = ANY($1)`, [userIds]);
                await db.query(`DELETE FROM user_2fa_settings WHERE user_id = ANY($1)`, [userIds]);
                await db.query(`DELETE FROM user_2fa_codes WHERE user_id = ANY($1)`, [userIds]);
            }

            await db.query(`DELETE FROM user_astrology WHERE user_id_hash = ANY($1)`, [hashes]);
            await db.query(`DELETE FROM messages WHERE user_id_hash = ANY($1)`, [hashes]);
            await db.query(`DELETE FROM user_preferences WHERE user_id_hash = ANY($1)`, [hashes]);
            await db.query(`DELETE FROM free_trial_sessions WHERE user_id_hash = ANY($1)`, [hashes]);

            deletedCount = hashes.length;
        }

        return successResponse(res, {
            success: true,
            message: `Cleaned up ${deletedCount} stale guest sessions`,
            deletedCount
        });
    } catch (err) {
        await logErrorFromCatch(err, 'cleanup', 'Error cleaning up old temp accounts');
        return serverError(res, 'Failed to cleanup old temp accounts');
    }
});

export default router;
