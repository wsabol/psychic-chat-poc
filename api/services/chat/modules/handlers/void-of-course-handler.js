import { getCurrentMoonPhase } from '../astrology.js';
import { fetchUserAstrology, getOracleSystemPrompt, callOracle, getUserGreeting, fetchUserPersonalInfo } from '../oracle.js';
import { storeMessage } from '../messages.js';
import { logErrorFromCatch } from '../../../shared/errorLogger.js';

export async function generateVoidOfCourseMoonAlert(userId) {
    try {
        const userInfo = await fetchUserPersonalInfo(userId);
        
        const moonPhaseData = await getCurrentMoonPhase();
        
        if (!moonPhaseData.success) {
            throw new Error('Failed to calculate moon phase');
        }
        
                if (!moonPhaseData.void_of_course) {
            // Not void of course, store as normal
            await storeMessage(userId, 'void_of_course', {
                is_void: false,
                phase: moonPhaseData.phase,
                generated_at: new Date().toISOString(),
                message: 'Moon is well-aspected today. Good time for new endeavors.'
            });
            return;
        }
        
        const userGreeting = getUserGreeting(userInfo, userId);
        const systemPrompt = getOracleSystemPrompt() + `

SPECIAL REQUEST - VOID OF COURSE MOON ALERT:
The Moon is currently Void of Course (transitioning between signs, not aspecting planets).
Generate a brief practical alert for ${userGreeting}.
1-2 sentences only.
Suggest what NOT to start, and what IS good to do.
Do NOT include tarot cards.
`;
        
        const prompt = `The Moon is Void of Course right now for ${userGreeting}.
What should they know? What should they avoid starting? What reflective activities would be good?`;
        
        const oracleResponses = await callOracle(systemPrompt, [], prompt, true);
        
                        const voidOfCourseDataFull = {
            is_void: true,
            phase: moonPhaseData.phase,
            text: oracleResponses.full,
            generated_at: new Date().toISOString(),
            timestamp: moonPhaseData.timestamp
        };
        const voidOfCourseBrief = { is_void: true, phase: moonPhaseData.phase, text: oracleResponses.brief, generated_at: new Date().toISOString() };
        await storeMessage(userId, 'void_of_course', voidOfCourseDataFull, voidOfCourseBrief);
        
                } catch (err) {
        logErrorFromCatch(err, '[VOID-OF-COURSE-HANDLER] Error generating void of course alert');
        // Continue silently on error
    }
}

export function isVoidOfCourseRequest(message) {
    return message.includes('[SYSTEM]') && message.includes('void of course');
}
