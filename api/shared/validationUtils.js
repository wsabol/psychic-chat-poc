/**
 * Validation Utilities
 * Common validation functions for data processing
 */

/**
 * Parse and validate date string for storage
 * @param {string} dateString - Date string to parse
 * @returns {string|null} Validated date in YYYY-MM-DD format or null if invalid
 */
export function parseDateForStorage(dateString) {
  if (!dateString) return null;
  
  try {
    const isoRegex = /^\d{4}-\d{2}-\d{2}$/;
    const trimmed = dateString.trim();
    
    if (isoRegex.test(trimmed)) {
      return trimmed;
    }
    
    return null;
  } catch (e) {
    return null;
  }
}

/**
 * Validate free trial step value
 * @param {string} step - Step value to validate
 * @returns {boolean} True if valid step
 */
export function isValidFreeTrialStep(step) {
  const validSteps = ['chat', 'personal_info', 'horoscope', 'completed'];
  return validSteps.includes(step);
}

/**
 * Get valid free trial steps
 * @returns {string[]} Array of valid step values
 */
export function getValidFreeTrialSteps() {
  return ['chat', 'personal_info', 'horoscope', 'completed'];
}

export default {
  parseDateForStorage,
  isValidFreeTrialStep,
  getValidFreeTrialSteps
};
