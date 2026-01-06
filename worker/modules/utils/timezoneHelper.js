import { db } from '../../shared/db.js';

/**
 * Get user's timezone from user_preferences
 * Falls back to UTC if not set
 */
export async function getUserTimezone(userIdHash) {
  try {
    const { rows } = await db.query(
      `SELECT timezone FROM user_preferences WHERE user_id_hash = $1`,
      [userIdHash]
    );
    
    if (rows.length > 0 && rows[0].timezone) {
      return rows[0].timezone;
    }
    
    // Default to UTC if not set
    console.warn(`[TIMEZONE] No timezone found for user, defaulting to UTC`);
    return 'UTC';
  } catch (err) {
    console.error('[TIMEZONE] Error fetching timezone:', err);
    return 'UTC';
  }
}

/**
 * Get today's date in user's local timezone (YYYY-MM-DD format)
 * @param {string} timezone - IANA timezone string
 * @returns {string} Date string in YYYY-MM-DD format
 */
export function getLocalDateForTimezone(timezone = 'UTC') {
  const now = new Date();
  
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    
    return formatter.format(now);
  } catch (err) {
    console.error(`[TIMEZONE] Invalid timezone: ${timezone}, defaulting to UTC`);
    return new Date().toISOString().split('T')[0];
  }
}

/**
 * Check if a horoscope/moon phase/cosmic weather needs to be regenerated
 * Returns true if created_at_local_date < today's local date
 * @param {string} createdAtLocalDate - Previous creation date (YYYY-MM-DD)
 * @param {string} todayLocalDate - Today's date in user's timezone (YYYY-MM-DD)
 * @returns {boolean} True if needs regeneration
 */
export function needsRegeneration(createdAtLocalDate, todayLocalDate) {
  if (!createdAtLocalDate) {
    console.log('[TIMEZONE] No previous creation date, needs generation');
    return true;
  }
  
  const previousDate = new Date(createdAtLocalDate);
  const todayDate = new Date(todayLocalDate);
  
  const needsRegen = previousDate < todayDate;
  console.log(`[TIMEZONE] Previous: ${createdAtLocalDate}, Today: ${todayLocalDate}, Needs regen: ${needsRegen}`);
  
  return needsRegen;
}
