import { Router } from "express";
import { hashUserId } from "../shared/hashUtils.js";
import { authenticateToken, authorizeUser } from "../middleware/auth.js";
import { db } from "../shared/db.js";
import { getUserTimezone, getLocalDateForTimezone, needsRegeneration } from "../shared/timezoneHelper.js";
import { checkUserCompliance } from "../shared/complianceChecker.js";
import { validationError, serverError, notFoundError, complianceError } from "../utils/responses.js";
import { successResponse } from '../utils/responses.js';


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
                return complianceError(res, 'Your acceptance of updated terms is required to continue', {
                    requiresTermsUpdate: compliance.termsVersion.requiresReacceptance,
                    requiresPrivacyUpdate: compliance.privacyVersion.requiresReacceptance,
                    termsVersion: compliance.termsVersion.current,
                    privacyVersion: compliance.privacyVersion.current
                });
            }
        }
        
        if (rows.length > 0 && rows[0].created_at_local_date) {
            // Convert created_at_local_date to YYYY-MM-DD string for comparison
            const createdDate = rows[0].created_at_local_date instanceof Date 
                ? rows[0].created_at_local_date.toISOString().split('T')[0]
                : String(rows[0].created_at_local_date).split('T')[0];
            
            const isStale = needsRegeneration(createdDate, todayLocalDate);
            
            if (isStale) {
                // NO REDIS - Return 404 to trigger frontend POST request for synchronous generation
                return notFoundError(res, `${range} horoscope is stale. Please request regeneration.`);
            }
        }
        
        if (rows.length === 0) {
            // NO REDIS - Return 404 to trigger frontend POST request for synchronous generation
            return notFoundError(res, `No ${range} horoscope found. Please request generation.`);
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
            return serverError(res, 'Failed to parse horoscope data');
        }
        
                if (!horoscope || !horoscope.generated_at) {
            return notFoundError(res, 'Horoscope data is incomplete');
        }
        
        successResponse(res, { 
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
 * Generate new horoscopes synchronously (no queue)
 */
router.post("/:userId/:range", authenticateToken, authorizeUser, async (req, res) => {
    const { userId, range } = req.params;
    
    try {
        // Validate range
        if (!['daily', 'weekly'].includes(range.toLowerCase())) {
            console.error('[HOROSCOPE-ROUTE] Invalid range:', range);
            return validationError(res, 'Invalid range. Must be daily or weekly.');
        }
        // Import synchronous processor
        const { processHoroscopeSync } = await import('../services/chat/processor.js');
        // Generate horoscope synchronously
        const result = await processHoroscopeSync(userId, range.toLowerCase());
        
        // Validate result
        if (!result) {
            console.error('[HOROSCOPE-ROUTE] processHoroscopeSync returned null/undefined');
            throw new Error('Horoscope generation returned no result');
        }
        
        if (!result.horoscope) {
            console.error('[HOROSCOPE-ROUTE] Result missing horoscope text:', result);
            throw new Error('Horoscope generation returned incomplete result');
        }
        
        successResponse(res, { 
            horoscope: result.horoscope,
            brief: result.brief,
            generated_at: result.generated_at,
            range: range.toLowerCase()
        });
        
    } catch (err) {
        console.error('[HOROSCOPE-ROUTE] Error generating horoscope:', err);
        console.error('[HOROSCOPE-ROUTE] Error message:', err.message);
        console.error('[HOROSCOPE-ROUTE] Error stack:', err.stack);
        console.error('[HOROSCOPE-ROUTE] Error details:', JSON.stringify(err, null, 2));
        return serverError(res, `Failed to generate horoscope: ${err.message}`);
    }
});

export default router;
