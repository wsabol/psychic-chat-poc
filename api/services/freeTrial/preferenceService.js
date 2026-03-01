/**
 * Free Trial — Preference Service
 * Handles user_preferences updates for language and timezone.
 * All functions are non-fatal: errors are logged but do not interrupt callers.
 */

import { db } from '../../shared/db.js';
import { logErrorFromCatch } from '../../shared/errorLogger.js';

/**
 * Refresh `language` and `oracle_language` in `user_preferences` for a free
 * trial user.
 *
 * Called by the horoscope endpoint so that if the user changed their language
 * AFTER session creation, the oracle still responds in the correct language
 * instead of falling back to the creation-time value.
 *
 * @param {string} userIdHash - Hashed user ID
 * @param {string} language   - BCP-47 language code (e.g. 'pt-BR')
 */
export async function refreshLanguagePreference(userIdHash, language) {
  if (!userIdHash || !language) return;
  try {
    await db.query(
      `INSERT INTO user_preferences
       (user_id_hash, language, oracle_language, timezone, response_type, created_at, updated_at)
       VALUES ($1, $2, $2, 'UTC', 'full', NOW(), NOW())
       ON CONFLICT (user_id_hash) DO UPDATE SET
         language        = EXCLUDED.language,
         oracle_language = EXCLUDED.oracle_language,
         updated_at      = NOW()`,
      [userIdHash, language]
    );
  } catch (err) {
    logErrorFromCatch(err, 'free-trial', '[PREFERENCE-SERVICE] Failed to refresh language preference');
  }
}

/**
 * Update the user's IANA timezone in `user_preferences`.
 *
 * Called by the horoscope endpoint so the horoscope handler uses the user's
 * LOCAL date (not UTC/GMT) when generating the reading. Free trial sessions
 * start with timezone='UTC' — this corrects it using the browser-supplied
 * IANA timezone string (e.g. 'America/Chicago') sent by the client.
 *
 * @param {string} userIdHash - Hashed user ID
 * @param {string} timezone   - IANA timezone string
 */
export async function updateTimezonePreference(userIdHash, timezone) {
  if (!userIdHash || !timezone) return;
  try {
    await db.query(
      `UPDATE user_preferences SET timezone = $1, updated_at = NOW() WHERE user_id_hash = $2`,
      [timezone, userIdHash]
    );
  } catch (err) {
    logErrorFromCatch(err, 'free-trial', '[PREFERENCE-SERVICE] Failed to update timezone preference');
  }
}
