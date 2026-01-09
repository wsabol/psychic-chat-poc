/**
 * Get user's timezone from browser
 * Returns IANA timezone string (e.g., 'America/New_York')
 */
export function getBrowserTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * Get today's date in user's local timezone (YYYY-MM-DD format)
 * @param {string} timezone - IANA timezone string (e.g., 'America/New_York')
 * @returns {string} Date string in YYYY-MM-DD format
 */
export function getLocalDateString(timezone = null) {
  const tz = timezone || getBrowserTimezone();
  
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  
  return formatter.format(now);
}

/**
 * Store user's timezone in user_preferences
 * @param {string} userId - User ID
 * @param {string} token - Auth token
 * @param {string} timezone - IANA timezone (auto-detected if not provided)
 */
export async function saveUserTimezone(userId, token, timezone = null) {
  try {
    const tz = timezone || getBrowserTimezone();
    const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';
    
    console.log(`[TIMEZONE] Saving timezone for user: ${tz}`);
    
    // For temp users, also send the language they selected on landing page
    const tempUserLanguage = localStorage.getItem('temp_user_language');
    const body = {
      timezone: tz
    };
    
    // If temp user selected a language, send it so oracle_language is set correctly
    if (tempUserLanguage) {
      body.language = tempUserLanguage;
      body.oracle_language = tempUserLanguage;
      body.response_type = 'full';  // Default to full for temp users
      console.log(`[TIMEZONE] Including temp user language: ${tempUserLanguage} and oracle_language: ${tempUserLanguage}`);
    }
    
    const response = await fetch(`${API_URL}/user-profile/${userId}/preferences`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    
    if (!response.ok) {
      console.warn('[TIMEZONE] Failed to save timezone:', response.statusText);
      return false;
    }
    
    console.log('[TIMEZONE] ✓ Timezone saved successfully');
    return true;
  } catch (err) {
    console.error('[TIMEZONE] Error saving timezone:', err);
    return false;
  }
}

/**
 * Compare two local dates in a specific timezone
 * Returns true if date1 > date2
 */
export function isLocalDateAfter(date1String, date2String, timezone) {
  const d1 = new Date(date1String);
  const d2 = new Date(date2String);
  return d1 > d2;
}
