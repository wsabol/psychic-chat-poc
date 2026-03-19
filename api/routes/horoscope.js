import { Router } from "express";
import { hashUserId } from "../shared/hashUtils.js";
import { authenticateToken, authorizeUser } from "../middleware/auth.js";
import { db } from "../shared/db.js";
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
        
        // Get today's date in user's LOCAL timezone.
        // Use the same inline toLocaleDateString approach as astrology-insights.js
        // (functionally identical to getLocalDateForTimezone but consistent across routes).
        const todayLocalDate = new Date().toLocaleDateString('en-CA', {
            timeZone: userTimezone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
        
        // Fetch horoscopes for today's local date only (identical approach to moon-phase.js).
        // Filtering by created_at_local_date IN THE SQL means PostgreSQL will never return a
        // stale record — if no row matches today's date we get 0 rows → 404 → client POSTs.
        // Removing "OR horoscope_range IS NULL" prevents unranked legacy records from
        // cross-contaminating daily vs weekly requests.
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
                  AND horoscope_range = $3
                  AND created_at_local_date = $4
                ORDER BY created_at DESC
                LIMIT 1`,
            [userIdHash, process.env.ENCRYPTION_KEY, range.toLowerCase(), todayLocalDate]
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
        
        if (rows.length === 0) {
            // No horoscope exists for today's local date yet.
            // Generate inline — same pattern used by cosmic-weather and venus-love-profile —
            // so we never return 404 to the client and never risk fetchMessageByRole
            // picking up a stale/old record when the generator early-exits.
            try {
                const { processHoroscopeSync } = await import('../services/chat/processor.js');
                const result = await processHoroscopeSync(userId, range.toLowerCase());

                if (!result?.horoscope) {
                    return notFoundError(res, `No ${range} horoscope found and generation returned empty.`);
                }

                return successResponse(res, {
                    horoscope: result.horoscope,
                    brief: result.brief || null,
                    generated_at: result.generated_at,
                    zodiac_sign: result.zodiac_sign || null
                });
            } catch (genErr) {
                console.error(`[HOROSCOPE-ROUTE] Inline generation failed for ${range}:`, genErr.message);
                // Surface profile-incomplete / compliance errors to the client intact
                const status = genErr?.status || genErr?.statusCode;
                if (status === 451) return complianceError(res, genErr.message);
                return serverError(res, `Failed to generate ${range} horoscope: ${genErr.message}`);
            }
        }

        // NOTE: Staleness check removed — the SQL WHERE clause now guarantees the returned
        // record is for today's local date (created_at_local_date = $4).  There is nothing
        // left to check here; any record that survived the query is fresh.
        
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
            generated_at: horoscope.generated_at,
            zodiac_sign: horoscope.zodiac_sign || null
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
            zodiac_sign: result.zodiac_sign || null,
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
