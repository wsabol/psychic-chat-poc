import { Router } from "express";
import { hashUserId } from "../shared/hashUtils.js";
import { enqueueMessage } from "../shared/queue.js";
import { authenticateToken, authorizeUser } from "../middleware/auth.js";
import { db } from "../shared/db.js";
import { getUserTimezone, getLocalDateForTimezone, needsRegeneration } from "../shared/timezoneHelper.js";
import { checkUserCompliance } from "../shared/complianceChecker.js";
import { validationError, serverError, notFoundError } from "../utils/responses.js";


const router = Router();

/**
 * GET /horoscope/:userId/:range
 * Fetch the cached horoscope for the user matching the range and TODAY'S LOCAL DATE
 * CRITICAL: Validates created_at_local_date matches user's timezone date
 */
router.get("/:userId/:range", authenticateToken, authorizeUser, async (req, res) => {
        const { userId, range } = req.params;
    
    try {
        // Validate range
        if (!['daily', 'weekly'].includes(range.toLowerCase())) {
            return validationError(res, 'Invalid range. Must be daily or weekly.');
        }
        
        const userIdHash = hashUserId(userId);
        
        // Fetch user's language preference AND timezone
        const { rows: prefRows } = await db.query(
            `SELECT language, timezone FROM user_preferences WHERE user_id_hash = $1`,
            [userIdHash]
        );
                const userLanguage = prefRows.length > 0 ? prefRows[0].language : 'en-US';
        // Browser timezone (from saveUserTimezone on login) is the authoritative source
        // NEVER use birth_timezone - causes day-off issues if user was born elsewhere
        const userTimezone = prefRows.length > 0 && prefRows[0].timezone ? prefRows[0].timezone : 'UTC';
        
        // Get today's date in user's LOCAL timezone
        const todayLocalDate = getLocalDateForTimezone(userTimezone);
        
        // Fetch horoscopes - return most recent for this range
        // NOTE: Only content_full_encrypted and content_brief_encrypted exist in database
        const { rows } = await db.query(
            `SELECT 
                pgp_sym_decrypt(content_full_encrypted, $2)::text as content_full,
                pgp_sym_decrypt(content_brief_encrypted, $2)::text as content_brief,
                language_code,
                horoscope_range,
                created_at_local_date
                FROM messages 
                WHERE user_id_hash = $1 
                  AND role = 'horoscope' 
                  AND (horoscope_range = $3 OR horoscope_range IS NULL)
                ORDER BY created_at DESC
                LIMIT 1`,
            [userIdHash, process.env.ENCRYPTION_KEY, range.toLowerCase()]
        );
        

        
        // Check if user is temporary (free trial) - EXEMPT from compliance checks
        const { rows: userRows } = await db.query(
            `SELECT pgp_sym_decrypt(email_encrypted, $1) as email FROM user_personal_info WHERE user_id = $2`,
            [process.env.ENCRYPTION_KEY, userId]
        );
        const isTemporaryUser = userRows.length > 0 && userRows[0].email && userRows[0].email.startsWith('temp_');
        
                // Only enforce compliance for established (permanent) users
        // Temporary/free trial users are EXEMPT
        if (!isTemporaryUser) {
            const compliance = await checkUserCompliance(userId);
            if (compliance.blocksAccess && compliance.termsVersion && compliance.privacyVersion) {
                return res.status(451).json({
                    error: 'COMPLIANCE_UPDATE_REQUIRED',
                    message: 'Your acceptance of updated terms is required to continue',
                    details: {
                        requiresTermsUpdate: compliance.termsVersion.requiresReacceptance,
                        requiresPrivacyUpdate: compliance.privacyVersion.requiresReacceptance,
                        termsVersion: compliance.termsVersion.current,
                        privacyVersion: compliance.privacyVersion.current
                    },
                    redirect: '/update-consent'
                });
            }
        }
        
        if (rows.length > 0 && rows[0].created_at_local_date) {
                        const isStale = needsRegeneration(rows[0].created_at_local_date, todayLocalDate);
            
            if (isStale) {
                // Queue regeneration in background
                                enqueueMessage({
                    userId,
                    message: `[SYSTEM] Generate horoscope for ${range.toLowerCase()}`
                }).catch(() => {});
                
                // Return 404 to trigger frontend regeneration request
                return notFoundError(res, `${range} horoscope is stale. Generating fresh one...`);
            }
        }
        
                if (rows.length === 0) {
            // Queue generation in background
                        enqueueMessage({
                userId,
                message: `[SYSTEM] Generate horoscope for ${range.toLowerCase()}`
            }).catch(() => {});
            
            return notFoundError(res, `No ${range} horoscope found. Generating now...`);
        }
        
        // Get content from the row
        const row = rows[0];
        let content = row.content_full;
        let brief = row.content_brief;
        
                if (!content) {
            return notFoundError(res, 'Horoscope data is empty');
        }
        
        let horoscope, briefContent;
        try {
            horoscope = typeof content === 'string' 
                ? JSON.parse(content) 
                : content;
            if (brief) {
                briefContent = typeof brief === 'string'
                    ? JSON.parse(brief)
                    : brief;
            }
                } catch (e) {
            return res.status(500).json({ error: `Failed to parse horoscope data` });
        }
        
                if (!horoscope || !horoscope.generated_at) {
            return notFoundError(res, 'Horoscope data is incomplete');
        }
        
        res.json({ 
            horoscope: horoscope.text, 
            brief: briefContent?.text || null,
            generated_at: horoscope.generated_at 
        });
        
        } catch (err) {
        return serverError(res, 'Failed to fetch horoscope');
    }
});

/**
 * POST /horoscope/:userId/:range
 * Generate new horoscopes by enqueueing a worker job
 */
router.post("/:userId/:range", authenticateToken, authorizeUser, async (req, res) => {
    const { userId, range } = req.params;
    
    try {
        // Validate range
        if (!['daily', 'weekly'].includes(range.toLowerCase())) {
            return validationError(res, 'Invalid range. Must be daily or weekly.');
        }
        
        // Enqueue horoscope generation job
        await enqueueMessage({
            userId,
            message: `[SYSTEM] Generate horoscope for ${range.toLowerCase()}`
        });
        
        res.json({ 
            status: 'Horoscope generation queued',
            message: 'Your horoscope is being generated. Please check back in a few seconds.',
            range: range.toLowerCase()
        });
        
        } catch (err) {
        return serverError(res, 'Failed to queue horoscope generation');
    }
});

export default router;
