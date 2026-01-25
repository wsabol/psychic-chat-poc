/**
 * Price Repository
 * Handles all database queries for prices and subscribers
 */
import { db } from '../../../shared/db.js';
import { logErrorFromCatch } from '../../../shared/errorLogger.js';
import { MIGRATION_SETTINGS } from './priceConfig.js';

/**
 * Get all active subscribers with a specific price interval
 * @param {string} interval - 'month' or 'year'
 * @returns {Promise<Array>} Array of user records with subscription info
 */
export async function getSubscribersByInterval(interval) {
  try {
    if (!process.env.ENCRYPTION_KEY) {
      throw new Error('ENCRYPTION_KEY not configured!');
    }

    const query = `
      SELECT 
        id,
        user_id,
        pgp_sym_decrypt(email_encrypted, $1) as email,
        subscription_status,
        price_interval,
        price_amount,
        current_period_end,
        pgp_sym_decrypt(stripe_subscription_id_encrypted, $1) as stripe_subscription_id
      FROM user_personal_info
      WHERE price_interval = $2
        AND subscription_status = 'active'
        AND stripe_subscription_id_encrypted IS NOT NULL
      ORDER BY id
    `;

    const result = await db.query(query, [process.env.ENCRYPTION_KEY, interval]);
    return result.rows;
  } catch (error) {
    logErrorFromCatch(error, 'price-repository', 'get-subscribers-by-interval');
    throw error;
  }
}

/**
 * Get count of active subscribers by interval
 * @param {string} interval - 'month' or 'year'
 * @returns {Promise<number>} Count of active subscribers
 */
export async function getActiveSubscriberCount(interval) {
  try {
    const query = `
      SELECT COUNT(*) as count
      FROM user_personal_info
      WHERE price_interval = $1
        AND subscription_status = 'active'
        AND stripe_subscription_id_encrypted IS NOT NULL
    `;

    const result = await db.query(query, [interval]);
    return parseInt(result.rows[0].count, 10);
  } catch (error) {
    logErrorFromCatch(error, 'price-repository', 'get-active-subscriber-count');
    throw error;
  }
}

/**
 * Update subscriber price amount in database
 * @param {number} userId - User ID
 * @param {number} newAmount - New price amount in cents
 * @returns {Promise<void>}
 */
export async function updateSubscriberPriceAmount(userId, newAmount) {
  try {
    await db.query(
      `UPDATE user_personal_info SET price_amount = $1 WHERE id = $2`,
      [newAmount, userId]
    );
  } catch (error) {
    logErrorFromCatch(error, 'price-repository', 'update-subscriber-price-amount');
    throw error;
  }
}

/**
 * Mark migration as completed for a subscriber
 * @param {string} userIdHash - Hashed user ID
 * @param {string} interval - 'month' or 'year'
 * @returns {Promise<void>}
 */
export async function markMigrationCompleted(userIdHash, interval) {
  try {
    await db.query(
      `UPDATE price_change_notifications 
       SET migration_completed = true, migration_completed_at = CURRENT_TIMESTAMP
       WHERE user_id_hash = $1 AND price_interval = $2 AND migration_completed = false`,
      [userIdHash, interval]
    );
  } catch (error) {
    logErrorFromCatch(error, 'price-repository', 'mark-migration-completed');
    throw error;
  }
}

/**
 * Get migration status for a price change campaign
 * @param {string} interval - 'month' or 'year'
 * @returns {Promise<Object>} Migration statistics
 */
export async function getMigrationStatus(interval) {
  try {
    const query = `
      SELECT 
        COUNT(*) as total_notified,
        COUNT(*) FILTER (WHERE migration_completed = true) as completed,
        COUNT(*) FILTER (WHERE migration_completed = false) as pending
      FROM price_change_notifications
      WHERE price_interval = $1
        AND notified_at > NOW() - INTERVAL '${MIGRATION_SETTINGS.notificationWindowDays} days'
    `;

    const result = await db.query(query, [interval]);
    return result.rows[0];
  } catch (error) {
    logErrorFromCatch(error, 'price-repository', 'get-migration-status');
    throw error;
  }
}
