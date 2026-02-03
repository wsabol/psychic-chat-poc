import { db } from './db.js';
import { logErrorFromCatch } from './errorLogger.js';

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
    return 'UTC';
    } catch (err) {
    logErrorFromCatch(err, 'timezone', 'fetch user timezone');
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
  
  // Ensure timezone is a valid string, default to UTC if null/undefined
  const validTimezone = timezone && typeof timezone === 'string' ? timezone : 'UTC';
  
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: validTimezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    
    return formatter.format(now);
    } catch (err) {
    // Only log error if timezone is actually invalid (not just null)
    if (timezone && timezone !== 'UTC') {
      logErrorFromCatch(err, 'timezone', `Invalid timezone: ${timezone}`);
    }
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
    return true;
  }
  
  // CRITICAL FIX: Compare date strings directly, not Date objects
  // Date objects interpret YYYY-MM-DD as UTC midnight, which causes
  // incorrect comparisons when GMT is ahead of local timezone
  const needsRegen = createdAtLocalDate !== todayLocalDate;
  
  return needsRegen;
}

