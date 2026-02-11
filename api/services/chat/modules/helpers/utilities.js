/**
 * Oracle Utility Functions
 * General helpers for oracle operations
 */

/**
 * Get personalized greeting for user
 * Trial/temporary users get default "Seeker"
 * Established users get their first/familiar name
 */
export function getUserGreeting(userInfo, userId, isTemporaryUser = false) {
  // CRITICAL SAFETY LAYER 1: Check if userId contains "temp_" - always return "Seeker"
  if (userId && userId.includes('temp_')) {
    return "Seeker";
  }
  
  // CRITICAL SAFETY LAYER 2: Check isTemporaryUser flag
  if (isTemporaryUser) {
    return "Seeker";
  }
  
  if (!userInfo) {
    return "Friend";
  }
  
  // Try familiar name first, then first name, fallback to Friend
  const familiarName = userInfo.address_preference?.trim();
  if (familiarName && familiarName.length > 0) {
    // CRITICAL SAFETY LAYER 3: Never return temp_ UIDs even if they're in the database
    if (familiarName.includes('temp_')) {
      return "Seeker";
    }
    return familiarName;
  }
  
  const firstName = userInfo.first_name?.trim();
  if (firstName && firstName.length > 0) {
    // CRITICAL SAFETY LAYER 4: Never return temp_ UIDs even if they're in the database
    if (firstName.includes('temp_')) {
      return "Seeker";
    }
    return firstName;
  }
  
  return "Friend";
}

/**
 * Extract aromatherapy guidance section from oracle response
 * Utility for future analytics/logging features
 */
export function extractScentDataFromResponse(responseText) {
  if (!responseText) return null;

  const scentSectionRegex = /<h3>Aromatherapy Support<\/h3>([\s\S]*?)(?=<h3>|$)/i;
  const match = responseText.match(scentSectionRegex);

  if (match) {
    return {
      hasScentGuidance: true,
      content: match[1].trim()
    };
  }

  return {
    hasScentGuidance: false,
    content: null
  };
}
