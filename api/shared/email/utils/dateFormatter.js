/**
 * Date formatting utilities for emails
 */

/**
 * Format a date for display in emails
 * @param {Date|string} date - Date to format
 * @param {string} locale - Locale string (default: 'en-US')
 * @returns {string} Formatted date
 */
export function formatEmailDate(date, locale = 'en-US') {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    return dateObj.toLocaleDateString(locale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

/**
 * Calculate days remaining until a date
 * @param {Date|string} targetDate - Target date
 * @returns {number} Days remaining (can be negative if date has passed)
 */
export function calculateDaysRemaining(targetDate) {
    const target = typeof targetDate === 'string' ? new Date(targetDate) : targetDate;
    const now = new Date();
    const diffTime = target - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
}

/**
 * Format a relative time string (e.g., "in 5 days", "2 hours ago")
 * @param {Date|string} date - Date to format
 * @returns {string} Relative time string
 */
export function formatRelativeTime(date) {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffMs = dateObj - now;
    const diffMins = Math.round(diffMs / 60000);
    const diffHours = Math.round(diffMs / 3600000);
    const diffDays = Math.round(diffMs / 86400000);
    
    if (Math.abs(diffMins) < 60) {
        return diffMins >= 0 ? `in ${diffMins} minutes` : `${Math.abs(diffMins)} minutes ago`;
    } else if (Math.abs(diffHours) < 24) {
        return diffHours >= 0 ? `in ${diffHours} hours` : `${Math.abs(diffHours)} hours ago`;
    } else {
        return diffDays >= 0 ? `in ${diffDays} days` : `${Math.abs(diffDays)} days ago`;
    }
}
