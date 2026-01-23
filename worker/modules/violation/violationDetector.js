/**
 * Violation detection service
 * Detects policy violations based on keywords and patterns
 * 
 * FIXED: More conservative approach - only detect clearly intentional violations
 */

export const VIOLATION_TYPES = {
  SEXUAL_CONTENT: 'sexual_content',
  MINOR_CONTENT: 'minor_content',
  SELF_HARM: 'self_harm',
  HARM_OTHERS: 'harm_others',
  ABUSIVE_LANGUAGE: 'abusive_language',
  DOXXING_THREATS: 'doxxing_threats',
  ILLEGAL_ACTIVITY: 'illegal_activity',
  JAILBREAK_ATTEMPT: 'jailbreak_attempt',
  HATEFUL_CONTENT: 'hateful_content'
};

// Content involving minors - HIGHEST PRIORITY
const MINOR_CONTENT_KEYWORDS = [
  'child porn', 'child sexual', 'underage sex', 'minor sex', 'child abuse',
  'sexualize child', 'sexualize minor', 'loli', 'shota', 'child erotica',
  'preteen sex', 'teenager sex', 'teen porn', 'school girl sex', 'young child'
];

// Self-harm keywords - clear intent required
const SELF_HARM_KEYWORDS = [
  'suicide', 'kill myself', 'end my life', 'hurt myself', 'self harm',
  'self-harm', 'cut myself', 'overdose', 'jump off', 'hang myself'
];

// Sexual keywords - explicit content only
const SEXUAL_KEYWORDS = [
  'porn', 'xxx', 'sexually explicit', 'orgy', 'escort service',
  'non-consensual sex', 'sexual assault', 'rape porn', 'sex slave'
];

// Harm to others - clear intent, violence promotion
const HARM_OTHERS_KEYWORDS = [
  'kill someone', 'murder', 'assault someone', 'torture', 'rape',
  'bomb making', 'school shooting', 'mass shooting', 'terrorist attack',
  'incite violence', 'harm people', 'hurt people', 'attack people'
];

// Doxxing, threats, stalking
const DOXXING_THREAT_KEYWORDS = [
  'dox', 'doxx', 'home address', 'personal info', 'social security',
  'will kill you', 'going to hurt you', 'find where you live', 'track you down',
  'stalk', 'stalking', 'follow you home', 'hunt you down'
];

// Illegal activity instructions
const ILLEGAL_ACTIVITY_KEYWORDS = [
  'how to make meth', 'cook meth', 'fentanyl', 'synthesize drugs', 'make drugs',
  'build a bomb', 'create explosives', 'make weapon', 'illegal weapon',
  'how to hack', 'credit card fraud', 'identity theft', 'forge document',
  'counterfeit money', 'trafficking', 'smuggle', 'drug deal'
];

// Jailbreak attempts
const JAILBREAK_KEYWORDS = [
  'ignore previous instructions', 'disregard safety', 'bypass filter',
  'override system', 'disable safety', 'jailbreak', 'ignore guidelines',
  'pretend you are', 'roleplay as unrestricted', 'act as if no rules',
  'forget your training', 'ignore restrictions'
];

// Hateful/discriminatory content
const HATEFUL_CONTENT_KEYWORDS = [
  'nazi', 'white supremacy', 'hate jews', 'hate muslims', 'hate blacks',
  'racial slur', 'ethnic cleansing', 'genocide', 'holocaust denial',
  'hate crime', 'kkk', 'white power', 'gas the', 'lynch', 'lynching'
];

// Only the most egregious profanity - common single words that are clearly profane
const SEVERE_PROFANITY = [
  'fuck', 'shit', 'motherfucker', 'cunt'
];

/**
 * Detect if message contains rule violations
 * Takes conservative approach to avoid false positives
 * Priority order: Minors > Self-harm > Violence/Threats > Hateful > Illegal > Sexual > Jailbreak > Abusive
 */
export function detectViolation(userMessage) {
  const messageLower = userMessage.toLowerCase();

  // PRIORITY 1: Content involving minors (IMMEDIATE BAN - ZERO TOLERANCE)
  for (const keyword of MINOR_CONTENT_KEYWORDS) {
    if (messageLower.includes(keyword)) {
      return {
        type: VIOLATION_TYPES.MINOR_CONTENT,
        severity: 'CRITICAL_ZERO_TOLERANCE',
        keyword: keyword
      };
    }
  }

  // PRIORITY 2: Self-harm (CRITICAL)
  for (const keyword of SELF_HARM_KEYWORDS) {
    if (messageLower.includes(keyword)) {
      return {
        type: VIOLATION_TYPES.SELF_HARM,
        severity: 'CRITICAL',
        keyword: keyword
      };
    }
  }

  // PRIORITY 3: Harm to others / Violence promotion (ZERO TOLERANCE)
  for (const keyword of HARM_OTHERS_KEYWORDS) {
    if (messageLower.includes(keyword)) {
      return {
        type: VIOLATION_TYPES.HARM_OTHERS,
        severity: 'CRITICAL_ZERO_TOLERANCE',
        keyword: keyword
      };
    }
  }

  // PRIORITY 4: Doxxing, threats, stalking (ZERO TOLERANCE)
  for (const keyword of DOXXING_THREAT_KEYWORDS) {
    if (messageLower.includes(keyword)) {
      return {
        type: VIOLATION_TYPES.DOXXING_THREATS,
        severity: 'CRITICAL_ZERO_TOLERANCE',
        keyword: keyword
      };
    }
  }

  // PRIORITY 5: Hateful/discriminatory content (ZERO TOLERANCE)
  for (const keyword of HATEFUL_CONTENT_KEYWORDS) {
    if (messageLower.includes(keyword)) {
      return {
        type: VIOLATION_TYPES.HATEFUL_CONTENT,
        severity: 'CRITICAL_ZERO_TOLERANCE',
        keyword: keyword
      };
    }
  }

  // PRIORITY 6: Illegal activity instructions (ZERO TOLERANCE)
  for (const keyword of ILLEGAL_ACTIVITY_KEYWORDS) {
    if (messageLower.includes(keyword)) {
      return {
        type: VIOLATION_TYPES.ILLEGAL_ACTIVITY,
        severity: 'CRITICAL_ZERO_TOLERANCE',
        keyword: keyword
      };
    }
  }

  // PRIORITY 7: Sexual content (HIGH - Warning on 1st, suspension on 2nd)
  for (const keyword of SEXUAL_KEYWORDS) {
    if (messageLower.includes(keyword)) {
      return {
        type: VIOLATION_TYPES.SEXUAL_CONTENT,
        severity: 'HIGH',
        keyword: keyword
      };
    }
  }

  // PRIORITY 8: Jailbreak attempts (CRITICAL)
  for (const keyword of JAILBREAK_KEYWORDS) {
    if (messageLower.includes(keyword)) {
      return {
        type: VIOLATION_TYPES.JAILBREAK_ATTEMPT,
        severity: 'CRITICAL',
        keyword: keyword
      };
    }
  }

  // PRIORITY 9: Severe profanity/abusive language (MEDIUM)
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
