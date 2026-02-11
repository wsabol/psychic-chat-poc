/**
 * Violation response messages
 * Provides appropriate user-facing messages for different violation types and actions
 * 
 * MULTILINGUAL: Now supports translated responses based on user's oracle language
 */

import { VIOLATION_TYPES } from './violationDetector.js';
import { getTranslator } from '../../shared/i18n.js';

/**
 * Get violation response message
 * @param {string} violationType - Type of violation
 * @param {string} language - User's oracle language (e.g., 'es-ES', 'de-DE')
 */
export function getViolationResponse(violationType, language = 'en-US') {
  const t = getTranslator(language, 'violations-enforce');
  
  // Map violation type to translation key
  const typeKey = `responses.${violationType}`;
  return t(typeKey);
}

// Legacy function for backward compatibility
function getViolationResponseLegacy(violationType) {
  const responses = {
    [VIOLATION_TYPES.MINOR_CONTENT]: `I cannot and will not engage with any content involving minors in any inappropriate context. This is a serious violation of our policies and the law.

This type of content is strictly prohibited and will result in immediate account termination. If you have concerns about child safety, please contact the National Center for Missing & Exploited Children (NCMEC) at 1-800-THE-LOST or visit www.cybertipline.org.`,

    [VIOLATION_TYPES.SEXUAL_CONTENT]: `I appreciate your trust, but I'm not able to discuss sexual or adult content. I'm here to provide spiritual guidance through tarot, astrology, and crystal wisdom. 

Let's refocus on a topic I can truly help with—perhaps a question about your life path, relationships, career, or personal growth. What else calls to your soul today?`,

    [VIOLATION_TYPES.SELF_HARM]: `I hear that you're going through something difficult, and I want you to know that your wellbeing matters deeply. While I can offer spiritual guidance, what you're experiencing needs immediate, professional support.

Please reach out to someone who can truly help:
🔴 **National Suicide Prevention Lifeline: 988** (US)
📱 **Crisis Text Line: Text HOME to 741741**
🌍 **International Crisis Lines: findahelpline.com**

You are not alone, and help is available right now. Please contact one of these resources. Your life has value.`,

    [VIOLATION_TYPES.HARM_OTHERS]: `I cannot provide guidance on harming others. Tarot and astrology are tools for understanding ourselves and making positive choices.

If you're experiencing conflict or anger, I encourage you to seek support from a counselor or therapist who can help you process these feelings in healthy ways. 

Is there something else—perhaps a personal challenge or life question—I can help you explore instead?`,

    [VIOLATION_TYPES.DOXXING_THREATS]: `I cannot engage with threatening, doxxing, or stalking behavior. This platform is designed to provide spiritual guidance in a safe, respectful environment.

Threatening or harassing behavior is a serious violation of our community guidelines and potentially illegal. If you are experiencing harassment or threats, please contact local law enforcement.

Let's focus on positive, constructive topics related to your spiritual growth and wellbeing.`,

    [VIOLATION_TYPES.HATEFUL_CONTENT]: `I cannot provide guidance or engage with hateful, discriminatory, or prejudiced content. Our community is built on respect, compassion, and understanding for all people regardless of race, ethnicity, religion, gender, sexual orientation, or any other characteristic.

Tarot and astrology are tools for personal growth and understanding—not for promoting hate or discrimination. 

I encourage you to reflect on how we can all contribute to a more compassionate world. Is there a different topic I can help you explore?`,

    [VIOLATION_TYPES.ILLEGAL_ACTIVITY]: `I cannot and will not provide instructions or guidance for illegal activities. This includes but is not limited to weapon creation, drug manufacturing, hacking, fraud, or any other criminal conduct.

My purpose is to provide spiritual guidance through tarot, astrology, and positive life coaching—not to facilitate illegal behavior.

If you're facing challenges that led you here, I encourage you to seek professional counseling or legal advice. Is there a positive, constructive topic I can help you with instead?`,

    [VIOLATION_TYPES.JAILBREAK_ATTEMPT]: `I've detected an attempt to bypass my safety guidelines or content filters. These protections exist to ensure this platform remains safe, legal, and beneficial for all users.

I'm designed to provide spiritual guidance through tarot, astrology, and positive life coaching within appropriate boundaries. I cannot and will not circumvent these safety measures.

Let's focus on how I can genuinely help you with your spiritual journey, life questions, or personal growth. What would you like to explore?`,

    [VIOLATION_TYPES.ABUSIVE_LANGUAGE]: `I appreciate you being here, but I'm not able to engage with abusive or profane language. This space is meant to be respectful and supportive for all who seek guidance.

I'm here to offer you spiritual wisdom through tarot, astrology, and crystal energy—but only within a respectful, constructive dialogue. 

Would you like to rephrase your question in a way that allows us to work together more positively?`,
  };

  return responses[violationType] || `I'm unable to provide guidance on that topic. Let's explore something else that aligns with tarot, astrology, and spiritual wisdom.`;
}

/**
 * Get self-harm hotline response
 * @param {string} language - User's oracle language
 */
export function getSelfHarmHotlineResponse(language = 'en-US') {
  const t = getTranslator(language, 'violations-enforce');
  return t('crisis.self_harm_hotline');
}

/**
 * Get temporary account violation response
 * @param {string} violationType - Type of violation
 * @param {string} language - User's oracle language
 */
export function getTempAccountViolationResponse(violationType, language = 'en-US') {
  const t = getTranslator(language, 'violations-enforce');
  const response = getViolationResponse(violationType, language);
  const suffix = t('actions.temp_account_suffix');
  
  return response + suffix;
}

/**
 * Get warning response (first offense for established account)
 * @param {string} violationType - Type of violation
 * @param {number} violationCount - Number of violations
 * @param {string} language - User's oracle language
 */
export function getWarningResponse(violationType, violationCount, language = 'en-US') {
  const t = getTranslator(language, 'violations-enforce');
  const baseResponse = getViolationResponse(violationType, language);
  const suffix = t('actions.warning_suffix');
  
  return baseResponse + suffix;
}

/**
 * Get suspension response (second offense)
 * @param {string} violationType - Type of violation
 * @param {string} language - User's oracle language
 */
export function getSuspensionResponse(violationType, language = 'en-US') {
  const t = getTranslator(language, 'violations-enforce');
  const baseResponse = getViolationResponse(violationType, language);
  const suffix = t('actions.suspension_suffix');
  
  return baseResponse + suffix;
}

/**
 * Get permanent ban response (third offense)
 * @param {string} violationType - Type of violation
 * @param {string} language - User's oracle language
 */
export function getPermanentBanResponse(violationType, language = 'en-US') {
  const t = getTranslator(language, 'violations-enforce');
  const baseResponse = getViolationResponse(violationType, language);
  const suffix = t('actions.permanent_ban_suffix');
  
  return baseResponse + suffix;
}
