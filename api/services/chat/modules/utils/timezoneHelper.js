import { db } from '../../../../shared/db.js';
import { logErrorFromCatch } from '../../../../shared/errorLogger.js';

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
    logErrorFromCatch('[TIMEZONE] Error fetching timezone:', err);
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
    logErrorFromCatch(`[TIMEZONE] Invalid timezone: ${timezone}, defaulting to UTC`);
    return new Date().toISOString().split('T')[0];
  }
}

/**
 * Get current timestamp in ISO format for user's timezone
 * This ensures generated_at reflects the user's local time, not GMT
 * @param {string} timezone - IANA timezone string
 * @returns {string} ISO timestamp string with timezone offset
 */
export function getLocalTimestampForTimezone(timezone = 'UTC') {
  try {
    const now = new Date();
    
    // Get date/time components in user's timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    
    const parts = formatter.formatToParts(now);
    const get = (type) => parts.find(p => p.type === type)?.value;
    
    // Construct date string in user's timezone
    const year = get('year');
    const month = get('month');
    const day = get('day');
    const hour = get('hour');
    const minute = get('minute');
    const second = get('second');
    
    const localeDateString = `${year}-${month}-${day}T${hour}:${minute}:${second}`;
    
    // Calculate timezone offset using a more robust method
    // Create a date in the target timezone and compare with UTC
    const testDate = new Date(now.getTime());
    
    // Get the UTC timestamp
    const utcTimestamp = testDate.getTime();
    
    // Parse the local time components to create a "fake UTC" date
    const localAsDate = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}Z`);
    const localTimestamp = localAsDate.getTime();
    
    // Calculate the difference (this gives us the offset)
    let offsetMinutes = Math.round((localTimestamp - utcTimestamp) / 60000);
    
    // Validate offset is within PostgreSQL's valid range (-14 to +14 hours = -840 to +840 minutes)
    if (offsetMinutes < -840 || offsetMinutes > 840) {
      logErrorFromCatch(`[TIMEZONE] Calculated offset ${offsetMinutes} minutes out of valid range for timezone ${timezone}, using fallback`);
      // Fallback: just return UTC timestamp
      return new Date().toISOString();
    }
    
    const offsetHours = Math.floor(Math.abs(offsetMinutes) / 60);
    const offsetMins = Math.abs(offsetMinutes) % 60;
    const offsetSign = offsetMinutes >= 0 ? '+' : '-';
    const offsetString = `${offsetSign}${String(offsetHours).padStart(2, '0')}:${String(offsetMins).padStart(2, '0')}`;
    
    // Return ISO timestamp with timezone offset
    return `${localeDateString}${offsetString}`;
  } catch (err) {
    logErrorFromCatch(`[TIMEZONE] Error getting local timestamp for ${timezone}, defaulting to UTC`, err);
    return new Date().toISOString();
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
