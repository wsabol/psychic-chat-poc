/**
 * Temp User DB Cleanup Lambda
 *
 * Scheduled to run once per day via EventBridge (0 1 * * ? * — 1:00 AM UTC).
 *
 * Database:
 *   Targets the psychic_dhat PostgreSQL database explicitly via the
 *   DB_DATABASE_NAME=psychic_dhat environment variable set in template.yaml.
 *   This overrides the default database name stored in the shared DB secret so
 *   that only this Lambda connects to psychic_dhat; all other Lambdas use their
 *   own configured database.
 *
 * Purpose:
 *   Removes stale temporary (free-trial) user rows that accumulate in
 *   user_personal_info and their associated chat messages.  Temp users are
 *   identified by a "temp_" prefix on their user_id and are created when a
 *   visitor starts a free trial session.  Because no Firebase account is ever
 *   created for these users, no Firebase cleanup is required.
 *
 * Scope — tables cleaned:
 *   • user_personal_info   – the temp user row itself  (keyed by user_id)
 *   • messages             – chat messages             (keyed by user_id_hash)
 *   • user_astrology       – astrology readings        (keyed by user_id_hash)
 *   • user_preferences     – language / voice prefs   (keyed by user_id_hash)
 *   • pending_migrations   – migration placeholders   (keyed by temp_user_id)
 *
 * Tables intentionally NOT touched:
 *   • free_trial_sessions  – this is the fraud-prevention source of truth that
 *                            prevents free-trial reuse.  It must be preserved
 *                            indefinitely and is managed separately.
 *
 * Age threshold:
 *   Only temp users whose user_personal_info row was created more than 24 hours
 *   ago are deleted.  This gives any in-flight session a full day of headroom
 *   before its data is removed.
 *
 * Batch size:
 *   Up to BATCH_SIZE (500) rows are processed per invocation to keep query
 *   execution times predictable.  If more rows remain, they will be picked up
 *   on the next daily run.
 */

import { db } from '../shared/db.js';
import { createLogger } from '../shared/errorLogger.js';
import crypto from 'crypto';

const logger     = createLogger('temp-user-db-cleanup');
const BATCH_SIZE = 500;

// ─────────────────────────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────────────────────────

/**
 * Derive the user_id_hash that is stored in all hash-keyed tables.
 * Matches the logic used by the API's hashUtils.hashUserId().
 *
 * @param {string} userId  Raw temp user ID (e.g. "temp_abc123")
 * @returns {string}       64-character hex SHA-256 digest
 */
function toUserIdHash(userId) {
  return crypto
    .createHash('sha256')
    .update(userId)
    .digest('hex')
    .substring(0, 64);
}

// ─────────────────────────────────────────────────────────────────
//  CLEANUP
// ─────────────────────────────────────────────────────────────────

/**
 * Find temp user rows in user_personal_info that are older than 24 hours,
 * then delete all associated data across every affected table.
 *
 * @returns {Promise<Object>} Counts of rows deleted per table
 */
async function cleanupTempUsers() {
  // ── 1. Discover stale temp users ─────────────────────────────────────────
  const { rows: staleUsers } = await db.query(
    `SELECT user_id
       FROM user_personal_info
      WHERE user_id LIKE 'temp_%'
        AND created_at < NOW() - INTERVAL '1 day'
      LIMIT $1`,
    [BATCH_SIZE]
  );

  if (staleUsers.length === 0) {
    logger.info?.('No stale temp users found — nothing to clean up.');
    return {
      temp_users_found:        0,
      messages_deleted:        0,
      user_astrology_deleted:  0,
      user_preferences_deleted: 0,
      pending_migrations_deleted: 0,
      user_personal_info_deleted: 0,
    };
  }

  const userIds     = staleUsers.map(r => r.user_id);
  const userIdHashes = userIds.map(toUserIdHash);

  logger.info?.(`Found ${userIds.length} stale temp user(s) — starting cleanup…`);

  // ── 2. Delete hash-keyed child records ───────────────────────────────────
  const { rowCount: messagesDeleted } = await db.query(
    `DELETE FROM messages
      WHERE user_id_hash = ANY($1)`,
    [userIdHashes]
  );

  const { rowCount: astrologyDeleted } = await db.query(
    `DELETE FROM user_astrology
      WHERE user_id_hash = ANY($1)`,
    [userIdHashes]
  );

  const { rowCount: preferencesDeleted } = await db.query(
    `DELETE FROM user_preferences
      WHERE user_id_hash = ANY($1)`,
    [userIdHashes]
  );

  // ── 3. Delete user_id-keyed child records ────────────────────────────────
  const { rowCount: migrationsDeleted } = await db.query(
    `DELETE FROM pending_migrations
      WHERE temp_user_id = ANY($1)`,
    [userIds]
  );

  // ── 4. Delete the user_personal_info rows themselves ─────────────────────
  const { rowCount: usersDeleted } = await db.query(
    `DELETE FROM user_personal_info
      WHERE user_id = ANY($1)`,
    [userIds]
  );

  const counts = {
    temp_users_found:           userIds.length,
    messages_deleted:           messagesDeleted        ?? 0,
    user_astrology_deleted:     astrologyDeleted       ?? 0,
    user_preferences_deleted:   preferencesDeleted     ?? 0,
    pending_migrations_deleted: migrationsDeleted      ?? 0,
    user_personal_info_deleted: usersDeleted           ?? 0,
  };

  logger.info?.(`Cleanup complete: ${JSON.stringify(counts)}`);
  return counts;
}

// ─────────────────────────────────────────────────────────────────
//  LAMBDA HANDLER
// ─────────────────────────────────────────────────────────────────

/**
 * Lambda entry point — invoked by EventBridge on the daily schedule.
 *
 * @param {Object} _event  EventBridge scheduled event (contents not used)
 * @returns {Object}       HTTP-style response with deletion summary
 */
export const handler = async (_event) => {
  const startTime = Date.now();

  try {
    const counts = await cleanupTempUsers();

    return {
      statusCode: 200,
      body: JSON.stringify({
        success:     true,
        duration_ms: Date.now() - startTime,
        ...counts,
      }),
    };
  } catch (error) {
    logger.errorFromCatch(error, 'Lambda handler');

    return {
      statusCode: 500,
      body: JSON.stringify({
        success:     false,
        error:       error.message,
        duration_ms: Date.now() - startTime,
      }),
    };
  }
};

export default { handler };
