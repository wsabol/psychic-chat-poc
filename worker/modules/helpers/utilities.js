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
  if (isTemporaryUser) {
    return "Seeker";
  }
  
  if (!userInfo) {
    return "Friend";
  }
  
  // Try familiar name first, then first name, fallback to Friend
  const familiarName = userInfo.address_preference?.trim();
  if (familiarName && familiarName.length > 0) {
    return familiarName;
  }
  
  const firstName = userInfo.first_name?.trim();
  if (firstName && firstName.length > 0) {
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
