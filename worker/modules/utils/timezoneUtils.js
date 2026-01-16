/**
 * Timezone Utility Functions
 * 
 * Provides timezone-aware date/time operations for horoscope and cosmic weather
 * Uses browser timezone (captured client-side) or calculates from birth location
 */

/**
 * Get today's date in user's timezone (YYYY-MM-DD format)
 * 
 * @param {string} userTimezone - IANA timezone string (e.g., "America/Chicago")
 * @returns {string} Date in user's timezone as YYYY-MM-DD
 */
export function getTodayInUserTimezone(userTimezone) {
  if (!userTimezone) {
    return new Date().toISOString().split('T')[0];
  }

  try {
    const now = new Date();
    
    // Create formatter with user's timezone
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: userTimezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    
    const parts = formatter.formatToParts(now);
    const year = parts.find(p => p.type === 'year')?.value;
    const month = parts.find(p => p.type === 'month')?.value;
    const day = parts.find(p => p.type === 'day')?.value;
    
    return `${year}-${month}-${day}`;
  } catch (err) {
    logErrorFromCatch(`[TIMEZONE] Error formatting date for timezone ${userTimezone}:`, err.message);
    return new Date().toISOString().split('T')[0];
  }
}

/**
 * Get current time in user's timezone
 * 
 * @param {string} userTimezone - IANA timezone string
 * @returns {Object} {date, time, hour, minute, second, dayOfWeek}
 */
export function getCurrentTimeInUserTimezone(userTimezone) {
  if (!userTimezone) {
    return getCurrentTimeInTimezone('UTC');
  }

  try {
    const now = new Date();
    
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: userTimezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    
    const parts = formatter.formatToParts(now);
    const date = `${parts.find(p => p.type === 'year')?.value}-${parts.find(p => p.type === 'month')?.value}-${parts.find(p => p.type === 'day')?.value}`;
    const time = `${parts.find(p => p.type === 'hour')?.value}:${parts.find(p => p.type === 'minute')?.value}:${parts.find(p => p.type === 'second')?.value}`;
    const hour = parseInt(parts.find(p => p.type === 'hour')?.value);
    const minute = parseInt(parts.find(p => p.type === 'minute')?.value);
    const second = parseInt(parts.find(p => p.type === 'second')?.value);
    
    // Calculate day of week
    const tempDate = new Date(now.toLocaleString('en-US', { timeZone: userTimezone }));
    const dayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][tempDate.getDay()];
    
    return {
      date,
      time,
      hour,
      minute,
      second,
      dayOfWeek,
      timezone: userTimezone
    };
  } catch (err) {
    logErrorFromCatch(`[TIMEZONE] Error getting time for timezone ${userTimezone}:`, err.message);
    return getCurrentTimeInTimezone('UTC');
  }
}

/**
 * Helper: Get time in specific timezone
 */
function getCurrentTimeInTimezone(timezone) {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
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
  const date = `${parts.find(p => p.type === 'year')?.value}-${parts.find(p => p.type === 'month')?.value}-${parts.find(p => p.type === 'day')?.value}`;
  const time = `${parts.find(p => p.type === 'hour')?.value}:${parts.find(p => p.type === 'minute')?.value}:${parts.find(p => p.type === 'second')?.value}`;
  
  return { date, time, timezone };
}

/**
 * Fetch user's timezone preference from database
 * 
 * @param {object} db - Database connection
 * @param {string} userId - User ID
 * @returns {Promise<string>} User's timezone or null if not set
 */
export async function fetchUserTimezonePreference(db, userId) {
  try {
    const { hashUserId } = await import('../../shared/hashUtils.js');
    const userIdHash = hashUserId(userId);
    
    const { rows } = await db.query(
      `SELECT timezone FROM user_preferences WHERE user_id_hash = $1`,
      [userIdHash]
    );
    
    if (rows.length > 0 && rows[0].timezone) {
      return rows[0].timezone;
    }
    
    return null;
  } catch (err) {
    logErrorFromCatch('[TIMEZONE] Error fetching user timezone:', err.message);
    return null;
  }
}

/**
 * Store user's timezone preference
 * 
 * @param {object} db - Database connection
 * @param {string} userId - User ID
 * @param {string} timezone - IANA timezone string
 * @returns {Promise<void>}
 */
export async function storeUserTimezonePreference(db, userId, timezone) {
  try {
    const { hashUserId } = await import('../../shared/hashUtils.js');
    const userIdHash = hashUserId(userId);
    
    await db.query(
      `UPDATE user_preferences 
       SET timezone = $1 
       WHERE user_id_hash = $2`,
      [timezone, userIdHash]
    );
    
  } catch (err) {
    logErrorFromCatch('[TIMEZONE] Error storing user timezone:', err.message);
  }
}

/**
 * List all valid IANA timezones (for reference)
 */
export function getValidTimezones() {
  // Common timezones grouped by region
  return {
    'North America': [
      'America/New_York',
      'America/Chicago',
      'America/Denver',
      'America/Los_Angeles',
      'America/Anchorage',
      'Pacific/Honolulu',
      'America/Toronto',
      'America/Mexico_City'
    ],
    'South America': [
      'America/Buenos_Aires',
      'America/Sao_Paulo',
      'America/Lima',
      'America/Caracas'
    ],
    'Europe': [
      'Europe/London',
      'Europe/Paris',
      'Europe/Berlin',
      'Europe/Madrid',
      'Europe/Rome',
      'Europe/Amsterdam',
      'Europe/Brussels',
      'Europe/Vienna',
      'Europe/Prague',
      'Europe/Moscow'
    ],
    'Asia': [
      'Asia/Dubai',
      'Asia/Kolkata',
      'Asia/Bangkok',
      'Asia/Singapore',
      'Asia/Hong_Kong',
      'Asia/Shanghai',
      'Asia/Tokyo',
      'Asia/Seoul',
      'Asia/Manila'
    ],
    'Australia/Pacific': [
      'Australia/Sydney',
      'Australia/Melbourne',
      'Australia/Brisbane',
      'Pacific/Auckland',
      'Pacific/Fiji'
    ],
    'Africa': [
      'Africa/Cairo',
      'Africa/Johannesburg',
      'Africa/Lagos',
      'Africa/Nairobi'
    ]
  };
}

/**
 * Validate IANA timezone string
 * 
 * @param {string} timezone - Timezone to validate
 * @returns {boolean} True if valid IANA timezone
 */
export function isValidTimezone(timezone) {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Format timestamp in user's timezone
 * 
 * @param {Date|string} date - Date to format
 * @param {string} userTimezone - User's timezone
 * @param {Object} options - Formatting options
 * @returns {string} Formatted date/time string
 */
export function formatDateInUserTimezone(date, userTimezone, options = {}) {
  if (!userTimezone || !isValidTimezone(userTimezone)) {
    userTimezone = 'UTC';
  }

  const dateObj = typeof date === 'string' ? new Date(date) : date;

  const defaultOptions = {
    timeZone: userTimezone,
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  };

  const formatOptions = { ...defaultOptions, ...options };
  return dateObj.toLocaleString('en-US', formatOptions);
}

