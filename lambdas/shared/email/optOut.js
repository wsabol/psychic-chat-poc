/**
 * Email Opt-Out Management
 *
 * Checks user_settings.email_marketing_enabled and persists unsubscribe
 * events.  Both functions are used by every public send function in
 * emailService.js before a non-critical email is dispatched.
 *
 * Opt-out strategy:
 *   email_marketing_enabled = false  →  skip non-critical (marketing) emails.
 *   Rows missing from user_settings are treated as opted-IN (COALESCE default).
 *
 * Exports:
 *   isEmailOptedOut(userIdHash, db)       → Promise<boolean>
 *   recordEmailUnsubscribe(userIdHash, db) → Promise<boolean>
 */

import { createLogger } from '../errorLogger.js';

const logger = createLogger('email-opt-out');

/**
 * Check whether a user has opted out of email communications.
 *
 * @param {string} userIdHash  SHA-256 hex hash of the user's ID
 * @param {object} db          Lambda DB helper (lambdas/shared/db.js)
 * @returns {Promise<boolean>} true = opted OUT (do not send)
 */
export async function isEmailOptedOut(userIdHash, db) {
  try {
    const { rows } = await db.query(
      `SELECT email_marketing_enabled
         FROM user_settings
        WHERE user_id_hash = $1`,
      [userIdHash]
    );
    if (rows.length === 0) return false; // no row → treat as opted in
    return rows[0].email_marketing_enabled === false;
  } catch (err) {
    logger.errorFromCatch(err, 'isEmailOptedOut', userIdHash);
    return false; // Fail-open: don't silently drop emails on DB errors
  }
}

/**
 * Persist an unsubscribe event (upsert).
 * Safe to call multiple times — idempotent by design.
 *
 * @param {string} userIdHash
 * @param {object} db
 * @returns {Promise<boolean>} true on success, false on DB error
 */
export async function recordEmailUnsubscribe(userIdHash, db) {
  try {
    await db.query(
      `INSERT INTO user_settings (user_id_hash, email_marketing_enabled, updated_at)
            VALUES ($1, false, NOW())
       ON CONFLICT (user_id_hash)
       DO UPDATE SET email_marketing_enabled = false, updated_at = NOW()`,
      [userIdHash]
    );
    return true;
  } catch (err) {
    logger.errorFromCatch(err, 'recordEmailUnsubscribe', userIdHash);
    return false;
  }
}
