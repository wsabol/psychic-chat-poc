/**
 * Violation detection service
 * Detects policy violations based on keywords and patterns
 * 
 * FIXED: More conservative approach - only detect clearly intentional violations
 */

export const VIOLATION_TYPES = {
  SEXUAL_CONTENT: 'sexual_content',
  SELF_HARM: 'self_harm',
  HARM_OTHERS: 'harm_others',
  ABUSIVE_LANGUAGE: 'abusive_language'
};

// Self-harm keywords - clear intent required
const SELF_HARM_KEYWORDS = [
  'suicide', 'kill myself', 'end my life', 'hurt myself', 'self harm',
  'self-harm', 'cut myself', 'overdose', 'jump off', 'hang myself'
];

// Sexual keywords - explicit content only
const SEXUAL_KEYWORDS = [
  'porn', 'xxx', 'sexually explicit', 'orgy', 'escort service'
];

// Harm to others - clear intent
const HARM_OTHERS_KEYWORDS = [
  'kill someone', 'murder', 'assault someone', 'torture', 'rape'
];

// Only the most egregious profanity - common single words that are clearly profane
const SEVERE_PROFANITY = [
  'fuck', 'shit', 'motherfucker', 'cunt'
];

/**
 * Detect if message contains rule violations
 * Takes conservative approach to avoid false positives
 */
export function detectViolation(userMessage) {
  const messageLower = userMessage.toLowerCase();

  // Check for self-harm (highest priority)
  for (const keyword of SELF_HARM_KEYWORDS) {
    if (messageLower.includes(keyword)) {
      return {
        type: VIOLATION_TYPES.SELF_HARM,
        severity: 'CRITICAL',
        keyword: keyword
      };
    }
  }

  // Check for sexual content (explicit only)
  for (const keyword of SEXUAL_KEYWORDS) {
    if (messageLower.includes(keyword)) {
      return {
        type: VIOLATION_TYPES.SEXUAL_CONTENT,
        severity: 'HIGH',
        keyword: keyword
      };
    }
  }

  // Check for harm to others
  for (const keyword of HARM_OTHERS_KEYWORDS) {
    if (messageLower.includes(keyword)) {
      return {
        type: VIOLATION_TYPES.HARM_OTHERS,
        severity: 'CRITICAL',
        keyword: keyword
      };
    }
  }

  // Check for severe profanity only (not medium-level language)
  for (const keyword of SEVERE_PROFANITY) {
    if (messageLower.includes(keyword)) {
      return {
        type: VIOLATION_TYPES.ABUSIVE_LANGUAGE,
        severity: 'MEDIUM',
        keyword: keyword
      };
    }
  }

  return null;
}
