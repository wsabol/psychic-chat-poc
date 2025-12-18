/**
 * Violation response messages
 * Provides appropriate user-facing messages for different violation types and actions
 */

import { VIOLATION_TYPES } from './violationDetector.js';

/**
 * Get violation response message
 */
export function getViolationResponse(violationType) {
  const responses = {
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

    [VIOLATION_TYPES.ABUSIVE_LANGUAGE]: `I appreciate you being here, but I'm not able to engage with abusive or profane language. This space is meant to be respectful and supportive for all who seek guidance.

I'm here to offer you spiritual wisdom through tarot, astrology, and crystal energy—but only within a respectful, constructive dialogue. 

Would you like to rephrase your question in a way that allows us to work together more positively?`,
  };

  return responses[violationType] || `I'm unable to provide guidance on that topic. Let's explore something else that aligns with tarot, astrology, and spiritual wisdom.`;
}

/**
 * Get self-harm hotline response
 */
export function getSelfHarmHotlineResponse() {
  return `
🔴 **CRISIS SUPPORT - YOU MATTER**

If you're having thoughts of self-harm or suicide:

**National Suicide Prevention Lifeline: 988** (call or text)
**Crisis Text Line: Text HOME to 741741**
**International Association for Suicide Prevention: https://www.iasp.info/resources/Crisis_Centres/**

You don't have to face this alone. Real people are available right now to listen and support you. Please reach out. Your life has value, and there is help available.`;
}

/**
 * Get temporary account violation response
 */
export function getTempAccountViolationResponse(violationType) {
  const response = getViolationResponse(violationType);

  return response + `

---
*Your trial session is ending. Please restart the app to begin a new session.*`;
}

/**
 * Get warning response (first offense for established account)
 */
export function getWarningResponse(violationType, violationCount) {
  const baseResponse = getViolationResponse(violationType);

  return baseResponse + `

**Note:** This is your first warning for this type of content. Future violations may result in account restrictions.`;
}

/**
 * Get suspension response (second offense)
 */
export function getSuspensionResponse(violationType) {
  const baseResponse = getViolationResponse(violationType);

  return baseResponse + `

**Account Action:** Your account has been suspended for 7 days due to repeated guideline violations. You will be able to access your account again after the suspension period.

If you believe this is in error, please contact support.`;
}

/**
 * Get permanent ban response (third offense)
 */
export function getPermanentBanResponse(violationType) {
  const baseResponse = getViolationResponse(violationType);

  return baseResponse + `

**Account Action:** Your account has been permanently disabled due to repeated violations of our community guidelines. 

If you wish to appeal this decision, please contact our support team.`;
}
