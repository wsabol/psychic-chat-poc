import { db } from '../shared/db.js';
import { hashUserId } from '../shared/hashUtils.js';

/**
 * Violation detection and enforcement service
 * 
 * SIMPLIFIED VERSION - Database only, no Firebase
 * 
 * ENFORCED VIOLATIONS (trigger warnings/suspensions):
 * - Sexual content
 * - Self-harm/suicide intent
 * - Harm to others
 * - Abusive/profane language
 * 
 * NOT ENFORCED (handled by oracle in guardrails):
 * - Financial advice requests (oracle just won't provide it)
 * - Medical advice requests (oracle just won't provide it)
 */

const VIOLATION_TYPES = {
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

const PROFANE_KEYWORDS = [
    'fuck', 'shit', 'ass', 'bitch', 'damn', 'hell', 'crap', 'piss',
    'cock', 'dick', 'pussy', 'asshole', 'bastard', 'motherfucker',
    'dumbass', 'bullshit', 'fuckhead', 'arsehole', 'twat', 'wanker',
    'bollocks', 'cunt', 'arse'
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
    
    // Check for profane/abusive language
    for (const keyword of PROFANE_KEYWORDS) {
        if (messageLower.includes(keyword)) {
            return {
                type: VIOLATION_TYPES.ABUSIVE_LANGUAGE,
                severity: 'MEDIUM',
                keyword: keyword
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

/**
 * Check if account is currently suspended
 */
export async function isAccountSuspended(userId) {
    try {
        const { rows } = await db.query(
            `SELECT is_suspended, suspension_end_date FROM user_personal_info WHERE user_id = $1`,
            [userId]
        );
        
        if (rows.length === 0) return false;
        
        const { is_suspended, suspension_end_date } = rows[0];
        
        if (!is_suspended) return false;
        
        // Check if suspension has expired
        if (suspension_end_date && new Date() > new Date(suspension_end_date)) {
            // Lift suspension
            await db.query(
                `UPDATE user_personal_info SET is_suspended = FALSE, suspension_end_date = NULL WHERE user_id = $1`,
                [userId]
            );
            return false;
        }
        
        return true;
    } catch (err) {
        console.error('[VIOLATION] Error checking account suspension:', err);
        return false;
    }
}

/**
 * Record violation and get enforcement action
 * DATABASE ONLY - No Firebase operations
 */
export async function recordViolationAndGetAction(userId, violationType, userMessage, isTemporaryUser) {
    try {
        const userIdHash = hashUserId(userId);
        
        // Get current violation count for this type
        const { rows: violationRows } = await db.query(
            `SELECT violation_count FROM user_violations 
             WHERE user_id_hash = $1 AND violation_type = $2 
             ORDER BY created_at DESC LIMIT 1`,
            [userIdHash, violationType]
        );
        
        let violationCount = (violationRows.length > 0 ? violationRows[0].violation_count : 0) + 1;
        
        // Record the violation
        const userIdHash = hashUserId(userId);
        await db.query(
            `INSERT INTO user_violations (user_id, user_id_hash, violation_type, violation_count, violation_message)
            VALUES ($1, $2, $3, $4, $5)`,
            [userId, userIdHash, violationType, violationCount, userMessage.substring(0, 500)]
        );
        
        // TEMP ACCOUNT: Delete immediately on any violation
        if (isTemporaryUser) {
            return {
                action: 'TEMP_ACCOUNT_DELETED',
                violationCount: violationCount,
                response: getTempAccountViolationResponse(violationType)
            };
        }
        
        // ESTABLISHED ACCOUNT: Enforce based on violation count
        if (violationCount === 1) {
            // First offense: Warning
            return {
                action: 'WARNING',
                violationCount: violationCount,
                response: getWarningResponse(violationType, violationCount)
            };
        } else if (violationCount === 2) {
            // Second offense: 7-day suspension
            const suspensionEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
            
            await db.query(
                `UPDATE user_personal_info SET is_suspended = TRUE, suspension_end_date = $1 WHERE user_id = $2`,
                [suspensionEnd, userId]
            );
            
            return {
                action: 'SUSPENDED_7_DAYS',
                violationCount: violationCount,
                suspensionEnd: suspensionEnd,
                response: getSuspensionResponse(violationType)
            };
        } else {
            // Third+ offense: Permanent ban
            // Mark as disabled in database
            await db.query(
                `UPDATE user_violations SET is_account_disabled = TRUE WHERE user_id = $1`,
                [userId]
            );
            
            return {
                action: 'ACCOUNT_DISABLED_PERMANENT',
                violationCount: violationCount,
                response: getPermanentBanResponse(violationType)
            };
        }
    } catch (err) {
        console.error('[VIOLATION] Error recording violation:', err);
        throw err;
    }
}

/**
 * Check if account is permanently disabled
 */
export async function isAccountDisabled(userId) {
    try {
        const userIdHash = hashUserId(userId);
        const { rows } = await db.query(
            `SELECT is_account_disabled FROM user_violations WHERE user_id_hash = $1 AND is_account_disabled = TRUE LIMIT 1`,
            [userIdHash]
        );
        
        return rows.length > 0;
    } catch (err) {
        console.error('[VIOLATION] Error checking if account is disabled:', err);
        return false;
    }
}

export { VIOLATION_TYPES };
