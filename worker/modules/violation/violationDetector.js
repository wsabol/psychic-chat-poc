/**
 * Violation detection service
 * Detects policy violations based on keywords and patterns
 */

export const VIOLATION_TYPES = {
  SEXUAL_CONTENT: 'sexual_content',
  SELF_HARM: 'self_harm',
  HARM_OTHERS: 'harm_others',
  ABUSIVE_LANGUAGE: 'abusive_language'
};

const SELF_HARM_KEYWORDS = [
  'suicide', 'kill myself', 'end my life', 'hurt myself', 'self harm',
  'self-harm', 'cut myself', 'overdose', 'jump', 'hang myself', 'die',
  'no point living', 'better off dead', 'want to die'
];

const SEXUAL_KEYWORDS = [
  'sex', 'sexual', 'porn', 'xxx', 'naked', 'nude', 'horny', 'orgasm',
  'penetrate', 'fuck', 'cum', 'blow job', 'handjob', 'escort', 'prostitute'
];

const HARM_OTHERS_KEYWORDS = [
  'hurt someone', 'kill someone', 'harm', 'violence', 'attack', 'assault',
  'revenge', 'get back at', 'murder', 'shoot', 'stab', 'poison'
];

// Profane keywords - only those that can't be substring matched safely
const PROFANE_KEYWORDS = [
  'fuck', 'shit', 'bitch', 'damn', 'hell', 'crap', 'piss',
  'pussy', 'bastard', 'motherfucker',
  'bullshit', 'fuckhead', 'twat', 'wanker',
  'bollocks', 'cunt'
];

// Patterns for problematic words that need word boundaries to avoid false positives
// Examples of false positives avoided:
// - ass → assistant, pass, bypass, compass, class
// - cock → cockpit, cocktail
// - dick → dictionary, prediction, predict
// - arse → parse, sparse, arsehole
const PROFANE_PATTERNS = [
  /\bass\b/i,           // ass (but not: assistant, pass, compass, class)
  /\bare\b/i,           // are (but not: care, share, stare)
  /\barse\b/i,          // arse (but not: parse, sparse)
  /\bcock\b/i,          // cock (but not: cockpit, cocktail)
  /\bdick\b/i,          // dick (but not: dictionary, prediction)
  /\basshole\b/i,       // asshole (but not: compound words)
  /\bdumbass\b/i,       // dumbass
  /\barsehole\b/i       // arsehole
];

const ABUSIVE_PATTERNS = [
  /you (suck|'re (stupid|dumb|retarded))/i,
  /i (hate|despise) (you|this)/i,
  /(you|this) is (trash|garbage|worthless)/i,
  /go (fuck|kill) yourself/i,
  /(stupid|dumb|idiot|moron)\s*(oracle|bot|you)/i
];

/**
 * Detect if message contains rule violations
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

  // Check for sexual content
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

  // Check for profane/abusive language (simple keywords - safe from false positives)
  for (const keyword of PROFANE_KEYWORDS) {
    if (messageLower.includes(keyword)) {
      return {
        type: VIOLATION_TYPES.ABUSIVE_LANGUAGE,
        severity: 'MEDIUM',
        keyword: keyword
      };
    }
  }

  // Check for profane patterns (word boundaries to avoid false positives like "assistant")
  for (const pattern of PROFANE_PATTERNS) {
    if (pattern.test(userMessage)) {
      return {
        type: VIOLATION_TYPES.ABUSIVE_LANGUAGE,
        severity: 'MEDIUM',
        keyword: 'profane language'
      };
    }
  }

  // Check for abusive patterns
  for (const pattern of ABUSIVE_PATTERNS) {
    if (pattern.test(userMessage)) {
      return {
        type: VIOLATION_TYPES.ABUSIVE_LANGUAGE,
        severity: 'MEDIUM',
        keyword: 'abusive pattern'
      };
    }
  }

  return null;
}
