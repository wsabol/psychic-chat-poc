/**
 * Reusable database queries for user-data operations
 * Centralizes all SQL queries and table definitions
 */

import { db } from '../../../shared/db.js';
import { hashUserId } from '../../../shared/hashUtils.js';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default_key';

/**
 * Table configurations for deletion operations.
 *
 * NOTE: 'messages' and 'user_personal_info' are intentionally excluded here.
 * - messages          : retained for 7 years for legal/litigation purposes,
 *                       then deleted by the account-cleanup Lambda (Phase 2).
 * - user_personal_info: PII columns are NULLed out (anonymized) rather than
 *                       the row being deleted, so that email_hash + user_id
 *                       survive as a legal traceability anchor.
 *
 * Column name corrections vs. original:
 *   user_2fa_codes    → user_id_hash (was incorrectly 'user_id')
 *   user_2fa_settings → user_id_hash (was incorrectly 'user_id')
 *   user_consents     → user_id_hash (was incorrectly 'user_id')
 *   audit_log         → user_id_hash (was incorrectly 'user_id')
 */
export const DELETION_TABLES = [
  { table: 'user_2fa_codes',          column: 'user_id_hash' },
  { table: 'user_2fa_settings',       column: 'user_id_hash' },
  { table: 'astrology_readings',      column: 'user_id'      },
  { table: 'user_consents',           column: 'user_id_hash' },
  { table: 'user_preferences',        column: 'user_id_hash' },
  { table: 'user_settings',           column: 'user_id_hash' },
  { table: 'password_reset_tokens',   column: 'user_id'      },
  { table: 'audit_log',               column: 'user_id_hash' },
];

/**
 * Fetch personal information
 */
export async function fetchPersonalInfo(userId) {
  return db.query(
    `SELECT user_id, 
            pgp_sym_decrypt(first_name_encrypted, $2) as first_name,
            pgp_sym_decrypt(last_name_encrypted, $2) as last_name,
            pgp_sym_decrypt(email_encrypted, $2) as email,
            pgp_sym_decrypt(phone_number_encrypted, $2) as phone_number,
            pgp_sym_decrypt(sex_encrypted, $2) as sex,
            pgp_sym_decrypt(familiar_name_encrypted, $2) as familiar_name,
            pgp_sym_decrypt(birth_date_encrypted, $2) as birth_date,
            pgp_sym_decrypt(birth_city_encrypted, $2) as birth_city,
            pgp_sym_decrypt(birth_timezone_encrypted, $2) as birth_timezone,
            created_at
     FROM user_personal_info WHERE user_id = $1`,
    [userId, ENCRYPTION_KEY]
  );
}

/**
 * Fetch user settings
 */
export async function fetchSettings(userIdHash) {
  return db.query(
    `SELECT cookies_enabled, analytics_enabled, email_marketing_enabled, push_notifications_enabled
     FROM user_settings WHERE user_id_hash = $1`,
    [userIdHash]
  );
}

/**
 * Fetch user consents
 */
export async function fetchConsents(userId) {
  return db.query(
    'SELECT consent_astrology, consent_health_data, consent_chat_analysis, agreed_at FROM user_consents WHERE user_id = $1',
    [userId]
  );
}

/**
 * Fetch chat messages
 */
export async function fetchMessages(userIdHash, limit = 1000) {
  return db.query(
    `SELECT created_at, role,
            pgp_sym_decrypt(content_full_encrypted, $2)::text as content
     FROM messages WHERE user_id_hash = $1 ORDER BY created_at ASC LIMIT $3`,
    [userIdHash, ENCRYPTION_KEY, limit]
  );
}

/**
 * Fetch astrology readings
 */
export async function fetchReadings(userId) {
  return db.query(
    `SELECT created_at, reading_type,
            CASE WHEN reading_encrypted IS NOT NULL 
                 THEN pgp_sym_decrypt(reading_encrypted, $2)::text
                 ELSE reading_content 
            END as content
     FROM astrology_readings WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId, ENCRYPTION_KEY]
  );
}

/**
 * Fetch audit logs
 */
export async function fetchAuditLogs(userId, limit = 100) {
  return db.query(
    'SELECT created_at, action, ip_address FROM audit_log WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2',
    [userId, limit]
  );
}

/**
 * Fetch deletion code for verification
 */
export async function fetchDeletionCode(userId, verificationCode) {
  const userIdHash = hashUserId(userId);
  return db.query(
    `SELECT id FROM user_2fa_codes 
     WHERE user_id_hash = $1 
     AND code = $2 
     AND code_type = 'account_deletion'
     AND expires_at > NOW()
     AND used = FALSE`,
    [userIdHash, verificationCode]
  );
}

/**
 * Store deletion verification code
 */
export async function storeDeletionCode(userId, verificationCode) {
  const userIdHash = hashUserId(userId);
  return db.query(
    `INSERT INTO user_2fa_codes (user_id_hash, code, code_type, expires_at)
     VALUES ($1, $2, 'account_deletion', NOW() + INTERVAL '10 minutes')`,
    [userIdHash, verificationCode]
  );
}

/**
 * Mark deletion code as used
 */
export async function markCodeAsUsed(userId, verificationCode) {
  const userIdHash = hashUserId(userId);
  return db.query(
    `UPDATE user_2fa_codes SET used = TRUE 
     WHERE user_id_hash = $1 AND code = $2`,
    [userIdHash, verificationCode]
  );
}

/**
 * Fetch user deletion status
 */
export async function fetchDeletionStatus(userId) {
  return db.query(
    'SELECT user_id, deletion_status, deletion_requested_at FROM user_personal_info WHERE user_id = $1',
    [userId]
  );
}

/**
 * Mark account for deletion (starts 30-day grace period)
 *
 * Timeline after this call:
 *   +30 days  → anonymization_date : PII columns are NULLed out by account-cleanup Lambda (Phase 1)
 *   +7 years  → final_deletion_date: chat messages are deleted by account-cleanup Lambda (Phase 2)
 *
 * The 30-day window lets the user cancel/reactivate.
 * email_hash is preserved indefinitely so legal lookup by email remains possible.
 */
export async function markAccountForDeletion(userId) {
  return db.query(
    `UPDATE user_personal_info 
     SET deletion_status        = 'pending_deletion',
         deletion_requested_at  = NOW(),
         anonymization_date     = NOW() + INTERVAL '30 days',
         final_deletion_date    = NOW() + INTERVAL '2555 days',
         updated_at             = NOW()
     WHERE user_id = $1
     RETURNING deletion_requested_at, anonymization_date, final_deletion_date`,
    [userId]
  );
}

/**
 * Anonymize all PII columns for a user.
 *
 * Preserves the row itself (and email_hash + user_id) so that:
 *   1. Legal lookup by email still works via SHA-256(email) → email_hash → user_id → messages
 *   2. The account-cleanup Lambda can find and delete messages at the 7-year mark
 *
 * email_hash is computed from email_encrypted immediately before the encrypted
 * column is NULLed out, so it is always available for future legal lookups.
 *
 * Called by:
 *   - account-cleanup Lambda Phase 1 (at the 30-day mark for grace-period deletions)
 *   - performCompleteAccountDeletion (immediately, for verification-code deletions)
 */
export async function anonymizeUserPII(userId) {
  return db.query(
    `UPDATE user_personal_info
     SET
       -- Compute and persist email_hash BEFORE nulling email_encrypted,
       -- so legal lookup by email is still possible after anonymization.
       email_hash                    = COALESCE(
                                         email_hash,
                                         CASE WHEN email_encrypted IS NOT NULL
                                              THEN encode(
                                                     digest(
                                                       pgp_sym_decrypt(email_encrypted, $2)::text,
                                                       'sha256'
                                                     ),
                                                     'hex'
                                                   )
                                              ELSE NULL
                                         END
                                       ),
       -- NULL out every PII field
       first_name_encrypted          = NULL,
       last_name_encrypted           = NULL,
       email_encrypted               = NULL,
       phone_number_encrypted        = NULL,
       birth_date_encrypted          = NULL,
       birth_time_encrypted          = NULL,
       birth_city_encrypted          = NULL,
       birth_province_encrypted      = NULL,
       birth_country_encrypted       = NULL,
       birth_timezone_encrypted      = NULL,
       sex_encrypted                 = NULL,
       familiar_name_encrypted       = NULL,
       stripe_customer_id_encrypted  = NULL,
       stripe_subscription_id_encrypted = NULL,
       billing_country_encrypted     = NULL,
       billing_state_encrypted       = NULL,
       billing_city_encrypted        = NULL,
       billing_postal_code_encrypted = NULL,
       billing_address_line1_encrypted = NULL,
       -- Status + timestamps
       deletion_status               = 'anonymized',
       anonymization_date            = COALESCE(anonymization_date, NOW()),
       final_deletion_date           = COALESCE(final_deletion_date, NOW() + INTERVAL '2555 days'),
       updated_at                    = NOW()
     WHERE user_id = $1`,
    [userId, ENCRYPTION_KEY]
  );
}

/**
 * Reactivate deleted account
 */
export async function reactivateDeletionAccount(userId) {
  return db.query(
    `UPDATE user_personal_info 
     SET deletion_status = 'active',
         deletion_requested_at = NULL,
         anonymization_date = NULL,
         final_deletion_date = NULL,
         updated_at = NOW()
     WHERE user_id = $1`,
    [userId]
  );
}

/**
 * Log deletion audit entry
 */
export async function logDeletionAudit(userId, action, ipAddress, userAgent) {
  return db.query(
    `INSERT INTO account_deletion_audit (user_id, action, ip_address, user_agent)
     VALUES ($1, $2, $3, $4)`,
    [userId, action, ipAddress, userAgent]
  );
}

/**
 * Fetch Stripe customer ID
 */
export async function fetchStripeCustomerId(userId) {
  return db.query(
    `SELECT stripe_customer_id_encrypted FROM user_personal_info WHERE user_id = $1`,
    [userId]
  );
}

/**
 * Generic delete from table
 */
export async function deleteFromTable(table, column, value) {
  return db.query(`DELETE FROM ${table} WHERE ${column} = $1`, [value]);
}

export { db, ENCRYPTION_KEY };
