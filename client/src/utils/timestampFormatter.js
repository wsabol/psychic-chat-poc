/**
 * Format a GMT timestamp to user's local timezone
 * @param {string} gmtTimestamp - ISO timestamp string (e.g., "2026-02-03T10:30:00.000Z")
 * @param {string} language - Language code for formatting
 * @param {object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date/time in user's local timezone
 */
export function formatTimestampToLocal(gmtTimestamp, language = 'en-US', options = {}) {
  if (!gmtTimestamp) return '';
  
  try {
    const date = new Date(gmtTimestamp);
    
    const defaultOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      ...options
    };
    
    // Format in user's local timezone automatically
    const formatter = new Intl.DateTimeFormat(language, defaultOptions);
    return formatter.format(date);
  } catch (err) {
    console.error('[TIMESTAMP-FORMATTER] Error formatting timestamp:', err);
    return new Date(gmtTimestamp).toLocaleString();
  }
}

/**
 * Format just the date (no time) in user's local timezone
 * @param {string} gmtTimestamp - ISO timestamp string
 * @param {string} language - Language code for formatting
 * @returns {string} Formatted date in user's local timezone
 */
export function formatDateToLocal(gmtTimestamp, language = 'en-US') {
  return formatTimestampToLocal(gmtTimestamp, language, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: undefined,
    minute: undefined,
    hour12: undefined
  });
}
