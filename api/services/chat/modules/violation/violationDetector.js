/**
 * Violation detection service
 * Detects policy violations based on keywords and patterns
 * 
 * MULTILINGUAL: Now detects violations in multiple languages
 * Keywords loaded from translation files
 */

import { getAllViolationKeywords } from '../../shared/i18n.js';

export const VIOLATION_TYPES = {
  SEXUAL_CONTENT: 'sexual_content',
  MINOR_CONTENT: 'minor_content',
  SELF_HARM: 'self_harm',
  HARM_OTHERS: 'harm_others',
  ABUSIVE_LANGUAGE: 'abusive_language',
  DOXXING_THREATS: 'doxxing_threats',
  ILLEGAL_ACTIVITY: 'illegal_activity',
  JAILBREAK_ATTEMPT: 'jailbreak_attempt',
  HATEFUL_CONTENT: 'hateful_content',
  HEALTH_MEDICAL_ADVICE: 'health_medical_advice'
};

// Load multilingual keywords from translation files
// These are cached after first load for performance
let keywordCache = null;

function getKeywords() {
  if (!keywordCache) {
    keywordCache = {
      MINOR_CONTENT: getAllViolationKeywords('minor_content'),
      SELF_HARM: getAllViolationKeywords('self_harm'),
      SEXUAL_CONTENT: getAllViolationKeywords('sexual_content'),
      HARM_OTHERS: getAllViolationKeywords('harm_others'),
      DOXXING_THREATS: getAllViolationKeywords('doxxing_threats'),
      ILLEGAL_ACTIVITY: getAllViolationKeywords('illegal_activity'),
      JAILBREAK_ATTEMPT: getAllViolationKeywords('jailbreak_attempt'),
      HATEFUL_CONTENT: getAllViolationKeywords('hateful_content'),
      ABUSIVE_LANGUAGE: getAllViolationKeywords('abusive_language')
    };
  }
  return keywordCache;
}

// Health/Medical advice requests - TRACK ONLY (non-enforced, just for monitoring)
// Not multilingual yet, keeping English only for monitoring
const HEALTH_MEDICAL_KEYWORDS = [
  // Physical health conditions
  'health', 'disease', 'sick', 'sickness', 'illness',
  'symptom', 'symptoms', 'pain', 'ache',
  'medication', 'medicine', 'drug', 'pharmaceutical',
  'doctor', 'physician', 'nurse', 'hospital', 'clinic',
  'cure', 'cured', 'curing', 'therapy', 'therapist',
  'diagnose', 'diagnosis', 'diagnosed',
  'treatment', 'treat', 'treating',
  'virus', 'bacterial', 'bacteria', 'infection',
  'vaccine', 'vaccination',
  
  // Specific conditions
  'cancer', 'tumor',
  'diabetes', 'diabetic',
  'heart', 'cardiac', 'cardiovascular',
  'stroke', 'seizure',
  'asthma', 'respiratory',
  'kidney', 'renal',
  'liver', 'hepatic',
  'blood pressure', 'hypertension',
  'cholesterol',
  'arthritis',
  'allergy', 'allergic',
  'migraine', 'headache',
  
  // Mental health conditions
  'mental health', 'mental illness',
  'depression', 'depressed',
  'anxiety', 'anxious', 'panic attack',
  'bipolar',
  'schizophrenia',
  'psychosis',
  'ptsd',
  'trauma', 'traumatic',
  'eating disorder', 'anorexia', 'bulimia',
  'addiction', 'addicted',
  
  // Neurological conditions
  'alzheimer',
  'dementia',
  'parkinson',
  'epilepsy',
  'brain',
  
  // Medical procedures
  'surgery', 'surgical',
  'operation',
  'injection',
  'transplant'
];

/**
 * Detect if message contains rule violations
 * Takes conservative approach to avoid false positives
 * Priority order: Minors > Self-harm > Violence/Threats > Hateful > Illegal > Sexual > Jailbreak > Abusive
 */
export function detectViolation(userMessage) {
  const messageLower = userMessage.toLowerCase();
  const keywords = getKeywords();

  // PRIORITY 1: Content involving minors (IMMEDIATE BAN - ZERO TOLERANCE)
  for (const keyword of keywords.MINOR_CONTENT) {
    if (messageLower.includes(keyword)) {
      return {
        type: VIOLATION_TYPES.MINOR_CONTENT,
        severity: 'CRITICAL_ZERO_TOLERANCE',
        keyword: keyword
      };
    }
  }

  // PRIORITY 2: Self-harm (CRITICAL)
  // Use regex to handle spacing variations (e.g., "kill myself" and "kill my self")
  for (const keyword of keywords.SELF_HARM) {
    // Replace spaces with optional space pattern for flexible matching
    const flexiblePattern = keyword.replace(/\s+/g, '\\s*');
    const regex = new RegExp(flexiblePattern, 'i');
    if (regex.test(messageLower)) {
      return {
        type: VIOLATION_TYPES.SELF_HARM,
        severity: 'CRITICAL',
        keyword: keyword
      };
    }
  }

  // PRIORITY 3: Harm to others / Violence promotion (ZERO TOLERANCE)
  for (const keyword of keywords.HARM_OTHERS) {
    if (messageLower.includes(keyword)) {
      return {
        type: VIOLATION_TYPES.HARM_OTHERS,
        severity: 'CRITICAL_ZERO_TOLERANCE',
        keyword: keyword
      };
    }
  }

  // PRIORITY 4: Doxxing, threats, stalking (ZERO TOLERANCE)
  for (const keyword of keywords.DOXXING_THREATS) {
    if (messageLower.includes(keyword)) {
      return {
        type: VIOLATION_TYPES.DOXXING_THREATS,
        severity: 'CRITICAL_ZERO_TOLERANCE',
        keyword: keyword
      };
    }
  }

  // PRIORITY 5: Hateful/discriminatory content (ZERO TOLERANCE)
  for (const keyword of keywords.HATEFUL_CONTENT) {
    if (messageLower.includes(keyword)) {
      return {
        type: VIOLATION_TYPES.HATEFUL_CONTENT,
        severity: 'CRITICAL_ZERO_TOLERANCE',
        keyword: keyword
      };
    }
  }

  // PRIORITY 6: Illegal activity instructions (ZERO TOLERANCE)
  // Use word boundaries to avoid false positives (e.g., "development" matching "develop")
  for (const keyword of keywords.ILLEGAL_ACTIVITY) {
    // For multi-word phrases, use simple includes
    if (keyword.includes(' ')) {
      if (messageLower.includes(keyword)) {
        return {
          type: VIOLATION_TYPES.ILLEGAL_ACTIVITY,
          severity: 'CRITICAL_ZERO_TOLERANCE',
          keyword: keyword
        };
      }
    } else {
      // For single words, use word boundaries to avoid false positives
      const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (regex.test(messageLower)) {
        return {
          type: VIOLATION_TYPES.ILLEGAL_ACTIVITY,
          severity: 'CRITICAL_ZERO_TOLERANCE',
          keyword: keyword
        };
      }
    }
  }

  // PRIORITY 7: Sexual content (HIGH - Warning on 1st, suspension on 2nd)
  for (const keyword of keywords.SEXUAL_CONTENT) {
    if (messageLower.includes(keyword)) {
      return {
        type: VIOLATION_TYPES.SEXUAL_CONTENT,
        severity: 'HIGH',
        keyword: keyword
      };
    }
  }

  // PRIORITY 8: Jailbreak attempts (CRITICAL)
  for (const keyword of keywords.JAILBREAK_ATTEMPT) {
    if (messageLower.includes(keyword)) {
      return {
        type: VIOLATION_TYPES.JAILBREAK_ATTEMPT,
        severity: 'CRITICAL',
        keyword: keyword
      };
    }
  }

  // PRIORITY 9: Severe profanity/abusive language (MEDIUM)
  // Use word boundaries to match whole words only
  for (const keyword of keywords.ABUSIVE_LANGUAGE) {
    const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (regex.test(messageLower)) {
      return {
        type: VIOLATION_TYPES.ABUSIVE_LANGUAGE,
        severity: 'MEDIUM',
        keyword: keyword
      };
    }
  }

  // PRIORITY 10: Health/Medical advice requests (LOW - TRACKING ONLY, NOT ENFORCED)
  // This is logged for compliance monitoring but does not result in account action
  // The oracle simply refuses to provide the advice
  for (const keyword of HEALTH_MEDICAL_KEYWORDS) {
    // Use word boundaries to avoid false positives
    const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
    if (regex.test(messageLower)) {
      return {
        type: VIOLATION_TYPES.HEALTH_MEDICAL_ADVICE,
        severity: 'LOW_TRACKING_ONLY',
        keyword: keyword
      };
    }
  }

  return null;
}
