/**
 * Context Building Utilities
 * Formats user data into context strings for system prompts
 */

/**
 * Format user's personal information into context string
 * Used to personalize oracle readings with user data
 */
export function buildPersonalInfoContext(userInfo) {
  if (!userInfo || Object.keys(userInfo).length === 0) return '';
  return `
USER PROFILE INFORMATION:
${userInfo.first_name ? `- Name: ${userInfo.first_name} ${userInfo.last_name || ''}` : ''}
${userInfo.birth_date ? `- Date of Birth: ${userInfo.birth_date}` : ''}
${userInfo.birth_time ? `- Time of Birth: ${userInfo.birth_time}` : ''}
${userInfo.birth_city ? `- Birth City: ${userInfo.birth_city}${userInfo.birth_province ? ', ' + userInfo.birth_province : ''}` : ''}
${userInfo.sex ? `- Gender: ${userInfo.sex}` : ''}
`;
}

/**
 * Format user's astrology profile into context string
 * Includes sun, moon, rising signs and birth chart coordinates
 */
export function buildAstrologyContext(astrologyInfo, userInfo) {
  if (!astrologyInfo || !astrologyInfo.astrology_data) return '';
  const astro = astrologyInfo.astrology_data;
  let astrologyLines = [];
  if (astro.sun_sign) {
    astrologyLines.push(`- Sun Sign (Core Identity): ${astro.sun_sign} (${astro.sun_degree}°)`);
    astrologyLines.push(`- Rising Sign (Ascendant): ${astro.rising_sign} (${astro.rising_degree}°)`);
    astrologyLines.push(`- Moon Sign (Emotional Nature): ${astro.moon_sign} (${astro.moon_degree}°)`);
    if (userInfo?.birth_city) astrologyLines.push(`- Birth Location: ${userInfo.birth_city}, ${userInfo.birth_province}, ${userInfo.birth_country}`);
    astrologyLines.push(`- Birth Timezone: ${astro.timezone}`);
    astrologyLines.push(`- Coordinates: ${astro.latitude}°N, ${astro.longitude}°W`);
  }
  return `
ASTROLOGICAL PROFILE:
${astrologyLines.join('\n')}
`;
}
