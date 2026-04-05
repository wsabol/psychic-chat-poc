/**
 * Temp User DB Cleanup Lambda
 *
 * Scheduled to run once per day via EventBridge (0 1 * * ? * — 1:00 AM UTC).
 *
 * Database:
 *   Targets the psychic_chat PostgreSQL database explicitly via the
 *   DB_DATABASE_NAME=psychic_chat environment variable set in template.yaml.
 *   This overrides the default database name stored in the shared DB secret so
 *   that only this Lambda connects to psychic_chat; all other Lambdas use their
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
 *     – also: any message whose user_id_hash does not belong to an established
 *       user (onboarding_completed = TRUE) is deleted, regardless of origin.
 *   • user_astrology       – astrology readings        (keyed by user_id_hash)
 *     – also: any row older than 24 hours whose zodiac_sign is NULL is deleted.
 *   • user_preferences     – language / voice prefs   (keyed by user_id_hash)
 *   • pending_migrations   – migration placeholders   (keyed by temp_user_id)
 *   • free_trial_sessions  – session records older than 24 hours are deleted.
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
//  CLEANUP — TEMP USERS (user_personal_info + dependents)
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
      temp_users_found:           0,
      messages_deleted:           0,
      user_astrology_deleted:     0,
      user_preferences_deleted:   0,
      pending_migrations_deleted: 0,
      user_personal_info_deleted: 0,
    };
  }

  const userIds      = staleUsers.map(r => r.user_id);
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

  logger.info?.(`Temp user cleanup complete: ${JSON.stringify(counts)}`);
  return counts;
}

// ─────────────────────────────────────────────────────────────────
//  CLEANUP — FREE TRIAL SESSIONS (> 24 hours old)
// ─────────────────────────────────────────────────────────────────

/**
 * Delete free_trial_sessions rows that were started more than 24 hours ago.
 * These records are no longer needed once the session window has closed.
 *
 * @returns {Promise<number>} Number of rows deleted
 */
async function cleanupFreeTrialSessions() {
  const { rowCount } = await db.query(
    `DELETE FROM free_trial_sessions
      WHERE started_at < NOW() - INTERVAL '1 day'`
  );

  const deleted = rowCount ?? 0;
  logger.info?.(`free_trial_sessions cleanup: ${deleted} row(s) deleted.`);
  return deleted;
}

// ─────────────────────────────────────────────────────────────────
//  CLEANUP — ORPHANED ASTROLOGY ROWS (> 24 hours old, no zodiac sign)
// ─────────────────────────────────────────────────────────────────

/**
 * Delete user_astrology rows that are older than 24 hours and still have
 * zodiac_sign = NULL.  These represent incomplete or abandoned reads that
 * were never fulfilled.
 *
 * @returns {Promise<number>} Number of rows deleted
 */
async function cleanupOrphanedAstrologyRows() {
  const { rowCount } = await db.query(
    `DELETE FROM user_astrology
      WHERE zodiac_sign IS NULL
        AND created_at < NOW() - INTERVAL '1 day'`
  );

  const deleted = rowCount ?? 0;
  logger.info?.(`user_astrology orphan cleanup: ${deleted} row(s) deleted.`);
  return deleted;
}

// ─────────────────────────────────────────────────────────────────
//  CLEANUP — MESSAGES NOT OWNED BY AN ESTABLISHED USER
// ─────────────────────────────────────────────────────────────────

/**
 * Delete any messages whose user_id_hash does not correspond to an established
 * user — defined as a user_personal_info row with onboarding_completed = TRUE.
 *
 * The comparison is made by deriving the SHA-256 hash of each established
 * user's user_id inside PostgreSQL (using pgcrypto's digest()) to match the
 * hash stored in the messages table.
 *
 * Note: temp-user messages deleted by cleanupTempUsers() above will already
 * be gone by the time this runs; this sweep catches any remaining stragglers
 * (e.g. users who started but never finished onboarding).
 *
 * @returns {Promise<number>} Number of rows deleted
 */
async function cleanupOrphanedMessages() {
  const { rowCount } = await db.query(
    `DELETE FROM messages
      WHERE user_id_hash NOT IN (
        SELECT encode(digest(user_id, 'sha256'), 'hex')
          FROM user_personal_info
         WHERE onboarding_completed = TRUE
      )`
  );

  const deleted = rowCount ?? 0;
  logger.info?.(`messages orphan cleanup: ${deleted} row(s) deleted.`);
  return deleted;
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
    // Run temp-user cleanup first so that its messages / astrology rows are
    // already gone before the broader orphan sweeps execute.
    const tempUserCounts = await cleanupTempUsers();

    const freeTrialSessionsDeleted    = await cleanupFreeTrialSessions();
    const orphanedAstrologyDeleted    = await cleanupOrphanedAstrologyRows();
    const orphanedMessagesDeleted     = await cleanupOrphanedMessages();

    const result = {
      success:     true,
      duration_ms: Date.now() - startTime,

      // Temp-user sweep
      ...tempUserCounts,

      // Supplemental sweeps
      free_trial_sessions_deleted:   freeTrialSessionsDeleted,
      orphaned_astrology_deleted:    orphanedAstrologyDeleted,
      orphaned_messages_deleted:     orphanedMessagesDeleted,
    };

    logger.info?.(`All cleanup tasks complete: ${JSON.stringify(result)}`);

    return {
      statusCode: 200,
      body: JSON.stringify(result),
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
