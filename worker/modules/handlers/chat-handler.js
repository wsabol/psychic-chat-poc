import { storeMessage } from '../messages.js';
import { checkAccountStatus } from '../utils/accountStatusCheck.js';
import { handleViolation } from '../utils/violationHandler.js';
import { detectAndHandleSpecialRequest } from '../utils/specialRequestDetector.js';
import { ensureUserAstrology } from '../utils/astrologySetup.js';
import { processOracleRequest } from '../utils/oracleProcessor.js';
import { logErrorFromCatch } from '../../shared/errorLogger.js';
import { fetchAllUserData } from '../helpers/userDataQueries-optimized.js';

/**
 * Handle regular chat messages from users
 * Orchestrates the complete chat pipeline with a clean, linear flow
 */
export async function handleChatMessage(userId, message) {
    try {
        // STEP 1: Fetch ALL user data in a single optimized query (PERFORMANCE OPTIMIZATION)
        const userData = await fetchAllUserData(userId);
        
        if (!userData) {
            await storeMessage(userId, 'assistant', { text: 'Unable to load your profile. Please try again.' });
            return;
        }
        
        const userInfo = userData.personalInfo;
        let astrologyInfo = userData.astrologyInfo;
        const userLanguage = userData.language;
        const oracleLanguage = userData.oracleLanguage;
        const tempUser = userData.isTemp;

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
        // Skip special requests for temp accounts - they only get tarot readings in ONE message
        if (!tempUser) {
            const wasSpecialRequest = await detectAndHandleSpecialRequest(userId, message, userInfo, astrologyInfo);
            if (wasSpecialRequest) {
                return;
            }
        }

        // STEP 5: Ensure user has astrology data (calculate if needed)
        astrologyInfo = await ensureUserAstrology(userInfo, astrologyInfo, userId);

                // STEP 6: Process oracle request (API call, translation, storage)
        // Pass both userLanguage (page UI) and oracleLanguage (oracle responses)
        await processOracleRequest(userId, userInfo, astrologyInfo, userLanguage, oracleLanguage, message, tempUser);

    } catch (err) {
        logErrorFromCatch(err, '[CHAT-HANDLER] Error handling chat message');
        throw err;
    }
}


