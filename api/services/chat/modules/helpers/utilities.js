/**
 * Oracle Utility Functions
 * General helpers for oracle operations
 */

/**
 * Get personalized greeting for user
 * Trial/temporary users can use their familiar name if saved
 * Established users get their first/familiar name
 */
export function getUserGreeting(userInfo, userId, isTemporaryUser = false) {
  if (!userInfo) {
    // No user info at all - use appropriate default
    if (userId && userId.includes('temp_')) {
      return "Seeker";
    }
    return "Friend";
  }
  
  // Try familiar name first (address_preference), then first name
  const familiarName = userInfo.address_preference?.trim();
  if (familiarName && familiarName.length > 0) {
    // CRITICAL SAFETY: Never return temp_ UIDs even if they're in the database
    if (familiarName.includes('temp_')) {
      return "Seeker";
    }
    return familiarName;
  }
  
  const firstName = userInfo.first_name?.trim();
  if (firstName && firstName.length > 0) {
    // CRITICAL SAFETY: Never return temp_ UIDs even if they're in the database  
    if (firstName.includes('temp_')) {
      return "Seeker";
    }
    return firstName;
  }
  
  // No name saved - use appropriate default based on user type
  if (userId && userId.includes('temp_')) {
    return "Seeker";
  }
  
  if (isTemporaryUser) {
    return "Seeker";
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
