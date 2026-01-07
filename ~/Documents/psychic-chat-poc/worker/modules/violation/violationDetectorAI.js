/**
 * AI-Enhanced Violation Detection
 * Uses contextual analysis to reduce false positives and improve accuracy
 * 
 * Scores violations by confidence level:
 * - 1.0 = Definite violation (clear harmful intent)
 * - 0.8-0.9 = Likely violation (strong indicators present)
 * - 0.6-0.7 = Probable violation (context unclear, possibly legitimate)
 * - < 0.6 = Questionable (likely false positive, requires human review)
 */

export const VIOLATION_TYPES = {
  SEXUAL_CONTENT: 'sexual_content',
  SELF_HARM: 'self_harm',
  HARM_OTHERS: 'harm_others',
  ABUSIVE_LANGUAGE: 'abusive_language'
};

// Self-harm keywords and context patterns
const SELF_HARM_KEYWORDS = [
  'suicide', 'kill myself', 'end my life', 'hurt myself', 'self harm',
  'self-harm', 'cut myself', 'overdose', 'jump off', 'hang myself',
  'slit wrists', 'stab myself', 'drown myself'
];

const SELF_HARM_INDICATORS = {
  'thoughts': ['thinking about', 'considering', 'contemplating'],
  'intent': ['want to', 'going to', 'will'],
  'methods': ['pills', 'knife', 'rope', 'bridge', 'building'],
  'crisis': ['can\'t take it', 'can\'t handle', 'unbearable', 'hopeless'],
};

// Sexual keywords - explicit content only
const SEXUAL_KEYWORDS = [
  'porn', 'xxx', 'sexually explicit', 'orgy', 'escort service',
  'sex work', 'prostitute', 'adult content'
];

const SEXUAL_CONTEXT_KEYWORDS = {
  'educational': ['education', 'learn', 'understand', 'how does', 'why'],
  'support': ['survivor', 'trauma', 'help', 'therapy', 'counseling'],
  'fiction': ['story', 'novel', 'book', 'movie', 'character']
};

// Harm to others keywords
const HARM_OTHERS_KEYWORDS = [
  'kill someone', 'murder', 'assault someone', 'torture', 'rape',
  'kidnap', 'beat someone', 'punch someone', 'stab someone'
];

const HARM_OTHERS_INTENT_INDICATORS = {
  'hypothetical': ['if i could', 'what if', 'imagine', 'hypothetically'],
  'fantasy': ['game', 'character', 'imagine', 'scenario', 'would'],
  'threat': ['i will', 'i\'m going to', 'you\'re gonna', 'i\'ll']
};

// Severe profanity - only most egregious
const SEVERE_PROFANITY = [
  'fuck', 'shit', 'motherfucker', 'cunt',
  'asshole', 'bastard'
];

const PROFANITY_CONTEXT = {
  'casual': ['like', 'so', 'really', 'just', 'fucking'],
  'emotion': ['angry', 'frustrated', 'upset', 'mad', 'pissed'],
  'expression': ['that\'s', 'it\'s', 'he\'s', 'she\'s']
};

/**
 * Analyze violation with AI-powered contextual understanding
 * Returns violation with confidence score
 */
export function detectViolationWithAI(userMessage) {
  const messageLower = userMessage.toLowerCase();
  const words = messageLower.split(/\s+/);
  const context = analyzeMessageContext(userMessage, words);

  // Check for self-harm (highest priority, lower threshold for false negatives)
  for (const keyword of SELF_HARM_KEYWORDS) {
    if (messageLower.includes(keyword)) {
      const score = calculateSelfHarmConfidence(messageLower, words, context);
      if (score >= 0.5) { // Lower threshold to catch more potential self-harm
        return {
          type: VIOLATION_TYPES.SELF_HARM,
          severity: 'CRITICAL',
          keyword: keyword,
          confidence: score,
          analysis: {
            directKeyword: true,
            contextIndicators: context.selfHarmIndicators,
            hasCrisisLanguage: context.hasCrisisLanguage,
          }
        };
      }
    }
  }

  // Check for sexual content
  for (const keyword of SEXUAL_KEYWORDS) {
    if (messageLower.includes(keyword)) {
      const score = calculateSexualContentConfidence(messageLower, words, context);
      if (score >= 0.6) {
        return {
          type: VIOLATION_TYPES.SEXUAL_CONTENT,
          severity: 'HIGH',
          keyword: keyword,
          confidence: score,
          analysis: {
            directKeyword: true,
            hasEducationalContext: context.hasEducationalContext,
            hasSupportContext: context.hasSupportContext,
            hasFictionContext: context.hasFictionContext,
          }
        };
      }
    }
  }

  // Check for harm to others
  for (const keyword of HARM_OTHERS_KEYWORDS) {
    if (messageLower.includes(keyword)) {
      const score = calculateHarmOthersConfidence(messageLower, words, context);
      if (score >= 0.6) {
        return {
          type: VIOLATION_TYPES.HARM_OTHERS,
          severity: 'CRITICAL',
          keyword: keyword,
          confidence: score,
          analysis: {
            directKeyword: true,
            hasHypotheticalContext: context.hasHypotheticalContext,
            hasFantasyContext: context.hasFantasyContext,
            hasThreatLanguage: context.hasThreatLanguage,
          }
        };
      }
    }
  }

  // Check for severe profanity with context
  for (const keyword of SEVERE_PROFANITY) {
    if (messageLower.includes(keyword)) {
      const score = calculateProfanityConfidence(messageLower, words, context);
      if (score >= 0.7) {
        return {
          type: VIOLATION_TYPES.ABUSIVE_LANGUAGE,
          severity: 'MEDIUM',
          keyword: keyword,
          confidence: score,
          analysis: {
            directKeyword: true,
            isEmotionalExpression: context.isEmotionalExpression,
            isCasualUsage: context.isCasualUsage,
          }
        };
      }
    }
  }

  return null;
}

/**
 * Calculate confidence score for self-harm violations
 */
function calculateSelfHarmConfidence(messageLower, words, context) {
  let score = 0.9; // Start high for self-harm (safety first)

  // If message contains explicit intent indicators
  if (hasKeywordsFromGroup(messageLower, SELF_HARM_INDICATORS.intent)) {
    score = Math.max(score, 0.95);
  }

  // If message contains crisis language
  if (context.hasCrisisLanguage) {
    score = Math.max(score, 0.92);
  }

  // Reduce score if this appears to be discussion of someone else's struggle
  if (messageLower.includes('my friend') || messageLower.includes('my family') || messageLower.includes('someone')) {
    score -= 0.1;
  }

  // Reduce score if discussing past or recovered state
  if (messageLower.includes('used to') || messageLower.includes('when i was') || messageLower.includes('had thoughts')) {
    score -= 0.15;
  }

  return Math.max(score, 0.5);
}

/**
 * Calculate confidence score for sexual content violations
 */
function calculateSexualContentConfidence(messageLower, words, context) {
  let score = 0.85; // Start fairly high

  // If has educational context, reduce significantly
  if (context.hasEducationalContext) {
    score -= 0.25;
  }

  // If has support/therapy context, reduce
  if (context.hasSupportContext) {
    score -= 0.2;
  }

  // If fictional context, reduce
  if (context.hasFictionContext) {
    score -= 0.15;
  }

  // Check for explicit descriptive language (increases score)
  const explicitDescriptors = ['explicit', 'graphic', 'detailed', 'description'];
  if (hasKeywordsFromGroup(messageLower, explicitDescriptors)) {
    score = Math.max(score, 0.9);
  }

  return Math.max(score, 0.4);
}

/**
 * Calculate confidence score for harm to others violations
 */
function calculateHarmOthersConfidence(messageLower, words, context) {
  let score = 0.9; // Start high (safety critical)

  // If hypothetical context, reduce significantly
  if (context.hasHypotheticalContext) {
    score -= 0.3;
  }

  // If fantasy/game context, reduce
  if (context.hasFantasyContext) {
    score -= 0.25;
  }

  // If clear threat language present, increase
  if (context.hasThreatLanguage) {
    score = Math.max(score, 0.95);
  }

  // If discussing violence in media/history, reduce
  if (messageLower.includes('movie') || messageLower.includes('book') || 
      messageLower.includes('history') || messageLower.includes('game')) {
    score -= 0.2;
  }

  return Math.max(score, 0.4);
}

/**
 * Calculate confidence score for abusive language violations
 */
function calculateProfanityConfidence(messageLower, words, context) {
  let score = 0.75; // Moderate starting score

  // If emotional context, reduce score (acceptable in passionate speech)
  if (context.isEmotionalExpression) {
    score -= 0.15;
  }

  // If casual usage pattern, reduce score
  if (context.isCasualUsage) {
    score -= 0.1;
  }

  // If directed at someone as attack, increase
  if (messageLower.includes('you') || messageLower.includes('you\'re')) {
    score = Math.max(score, 0.85);
  }

  // If used for emphasis without personal attack, reduce
  if (!messageLower.includes('you') && !messageLower.includes('he') && !messageLower.includes('she')) {
    score -= 0.05;
  }

  return Math.max(score, 0.5);
}

/**
 * Analyze broader message context
 */
function analyzeMessageContext(message, words) {
  const lowerMessage = message.toLowerCase();

  return {
    // Self-harm context
    hasCrisisLanguage: hasKeywordsFromGroup(lowerMessage, SELF_HARM_INDICATORS.crisis),
    
    // Sexual content context
    hasEducationalContext: hasKeywordsFromGroup(lowerMessage, SEXUAL_CONTEXT_KEYWORDS.educational),
    hasSupportContext: hasKeywordsFromGroup(lowerMessage, SEXUAL_CONTEXT_KEYWORDS.support),
    hasFictionContext: hasKeywordsFromGroup(lowerMessage, SEXUAL_CONTEXT_KEYWORDS.fiction),
    
    // Harm context
    hasHypotheticalContext: hasKeywordsFromGroup(lowerMessage, HARM_OTHERS_INTENT_INDICATORS.hypothetical),
    hasFantasyContext: hasKeywordsFromGroup(lowerMessage, HARM_OTHERS_INTENT_INDICATORS.fantasy),
    hasThreatLanguage: hasKeywordsFromGroup(lowerMessage, HARM_OTHERS_INTENT_INDICATORS.threat),
    
    // Profanity context
    isEmotionalExpression: hasKeywordsFromGroup(lowerMessage, PROFANITY_CONTEXT.emotion),
    isCasualUsage: hasKeywordsFromGroup(lowerMessage, PROFANITY_CONTEXT.casual),
    
    // Self-harm specific indicators
    selfHarmIndicators: SELF_HARM_INDICATORS.methods.filter(m => lowerMessage.includes(m))
  };
}

/**
 * Check if message contains any keywords from a group
 */
function hasKeywordsFromGroup(message, keywordGroup) {
  if (Array.isArray(keywordGroup)) {
    return keywordGroup.some(keyword => message.includes(keyword));
  }
  return false;
}

/**
 * Legacy detection function - wraps AI detection for backward compatibility
 */
export function detectViolation(userMessage) {
  const detection = detectViolationWithAI(userMessage);
  
  if (!detection) {
    return null;
  }

  // Return legacy format
  return {
    type: detection.type,
    severity: detection.severity,
    keyword: detection.keyword,
    confidence: detection.confidence,
    aiAnalysis: detection.analysis
  };
}
