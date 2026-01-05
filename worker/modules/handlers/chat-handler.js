import { fetchUserPersonalInfo, fetchUserAstrology, fetchUserLanguagePreference, isTemporaryUser } from '../oracle.js';
import { storeMessage } from '../messages.js';
import { checkAccountStatus } from '../utils/accountStatusCheck.js';
import { handleViolation } from '../utils/violationHandler.js';
import { detectAndHandleSpecialRequest } from '../utils/specialRequestDetector.js';
import { ensureUserAstrology } from '../utils/astrologySetup.js';
import { processOracleRequest } from '../utils/oracleProcessor.js';

/**
 * Handle regular chat messages from users
 * Orchestrates the complete chat pipeline with a clean, linear flow
 */
export async function handleChatMessage(userId, message) {
    try {
        // STEP 1: Fetch user context and preferences
        const userInfo = await fetchUserPersonalInfo(userId);
        let astrologyInfo = await fetchUserAstrology(userId);
        const userLanguage = await fetchUserLanguagePreference(userId);
        const tempUser = await isTemporaryUser(userId);

        // STEP 2: Check account status (disabled/suspended)
        const accountError = await checkAccountStatus(userId, tempUser);
        if (accountError) {
            await storeMessage(userId, 'assistant', { text: accountError });
            return;
        }

        // STEP 3: Check for violations in message
        const violationResponse = await handleViolation(userId, message, tempUser);
        if (violationResponse) {
            return;
        }

        // STEP 4: Check for special requests (horoscope, moon phase, cosmic weather)
        const wasSpecialRequest = await detectAndHandleSpecialRequest(userId, message, userInfo, astrologyInfo);
        if (wasSpecialRequest) {
            return;
        }

        // STEP 5: Ensure user has astrology data (calculate if needed)
        astrologyInfo = await ensureUserAstrology(userInfo, astrologyInfo, userId);

        // STEP 6: Process oracle request (API call, translation, storage)
        await processOracleRequest(userId, userInfo, astrologyInfo, userLanguage, message, tempUser);

    } catch (err) {
        console.error('[CHAT-HANDLER] Error handling chat message:', err.message);
        throw err;
    }
}


