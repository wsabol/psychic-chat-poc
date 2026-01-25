/**
 * NAME GUARD - Triple Redundancy System
 * 
 * CRITICAL BUSINESS RULE: The oracle must NEVER address a user with a temporary user_id.
 * This could end a potential sale before it starts.
 * 
 * This module provides multiple layers of protection to ensure friendly, professional greetings.
 */

// List of friendly fallback names for different contexts
const FRIENDLY_FALLBACKS = [
  'Seeker',
  'Friend',
  'Traveler',
  'Soul',
  'Dear One'
];

/**
 * Get a random friendly fallback name
 * @returns {string} A friendly greeting name
 */
function getRandomFriendlyName() {
  const randomIndex = Math.floor(Math.random() * FRIENDLY_FALLBACKS.length);
  return FRIENDLY_FALLBACKS[randomIndex];
}

/**
 * LAYER 1: Sanitize and validate a client name for oracle greetings
 * 
 * This function implements multiple checks to ensure no temporary user IDs
 * or inappropriate values reach the oracle.
 * 
 * @param {string} name - The name to sanitize
 * @param {boolean} isTempUser - Whether this is a temporary user
 * @returns {string} A safe, friendly name for greetings
 */
export function sanitizeClientName(name, isTempUser = false) {
  // CHECK 1: If explicitly marked as temp user, always use friendly fallback
  if (isTempUser) {
    return 'Seeker';
  }
  
  // CHECK 2: If name is null, undefined, or empty string
  if (!name || typeof name !== 'string' || name.trim() === '') {
    return 'Seeker';
  }
  
  // CHECK 3: If name contains "temp_" (case-insensitive)
  if (name.toLowerCase().includes('temp_')) {
    return 'Seeker';
  }
  
  // CHECK 4: If name looks like a UUID or technical ID
  // UUIDs: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidPattern.test(name)) {
    return 'Seeker';
  }
  
  // CHECK 5: If name looks like a technical identifier (long alphanumeric strings)
  // More than 20 chars with no spaces = likely a technical ID
  if (name.length > 20 && !name.includes(' ')) {
    const alphanumericCount = (name.match(/[a-zA-Z0-9]/g) || []).length;
    const ratio = alphanumericCount / name.length;
    if (ratio > 0.9) {
      return 'Seeker';
    }
  }
  
  // CHECK 6: If name contains suspicious patterns (user_, id_, temp, test, etc.)
  const suspiciousPatterns = [
    /user_/i,
    /userid/i,
    /^user[0-9]/i,
    /^id[0-9]/i,
    /^test/i,
    /^demo/i,
    /^guest/i,
    /_temp/i,
    /temp$/i,
    /^tmp/i,
    /^anonymous/i
  ];
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(name)) {
      return 'Seeker';
    }
  }
  
  // CHECK 7: Name should not be excessively long (max 50 chars for a real name)
  if (name.length > 50) {
    return 'Seeker';
  }
  
  // CHECK 8: Name should contain at least some letters
  if (!/[a-zA-Z]/.test(name)) {
    return 'Seeker';
  }
  
  // All checks passed - name appears legitimate
  return name.trim();
}

/**
 * LAYER 2: Validate that a name is safe for use in oracle messages
 * 
 * This is a secondary check that can be used before sending to AI
 * 
 * @param {string} name - The name to validate
 * @returns {boolean} True if name is safe, false otherwise
 */
export function isNameSafeForOracle(name) {
  if (!name || typeof name !== 'string') {
    return false;
  }
  
  // Re-run key checks
  if (name.toLowerCase().includes('temp_')) return false;
  if (name.toLowerCase().includes('user_')) return false;
  if (name.length > 50) return false;
  if (name.length < 1) return false;
  if (!/[a-zA-Z]/.test(name)) return false;
  
  return true;
}

/**
 * LAYER 3: Emergency fallback - strips any remaining problematic content
 * 
 * This is a last-resort function to clean up names that somehow passed other checks
 * 
 * @param {string} name - The name to clean
 * @returns {string} A cleaned name or fallback
 */
export function emergencyNameCleanup(name) {
  if (!name || typeof name !== 'string') {
    return 'Seeker';
  }
  
  // Remove any text that looks like temp_ patterns
  let cleaned = name.replace(/temp_[a-zA-Z0-9]+/gi, '');
  cleaned = cleaned.replace(/user_[a-zA-Z0-9]+/gi, '');
  cleaned = cleaned.trim();
  
  // If nothing left after cleanup, use fallback
  if (cleaned.length === 0) {
    return 'Seeker';
  }
  
  return cleaned;
}

/**
 * MASTER FUNCTION: Apply all three layers of protection
 * 
 * This is the main function to use throughout the application
 * 
 * @param {string} name - The name to sanitize
 * @param {boolean} isTempUser - Whether this is a temporary user
 * @returns {string} A guaranteed-safe name for oracle greetings
 */
export function guardName(name, isTempUser = false) {
  // Layer 1: Sanitize
  let safeName = sanitizeClientName(name, isTempUser);
  
  // Layer 2: Validate
  if (!isNameSafeForOracle(safeName)) {
    safeName = 'Seeker';
  }
  
  // Layer 3: Emergency cleanup
  safeName = emergencyNameCleanup(safeName);
  
  // Final safety net: if somehow still empty or problematic, use fallback
  if (!safeName || safeName.length === 0 || safeName.toLowerCase().includes('temp')) {
    safeName = 'Seeker';
  }
  
  return safeName;
}

export default {
  sanitizeClientName,
  isNameSafeForOracle,
  emergencyNameCleanup,
  guardName,
  getRandomFriendlyName
};
