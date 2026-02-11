/**
 * Violation Handler Utility
 * Detects violations and records enforcement actions
 * 
 * MULTILINGUAL: Fetches user's oracle language to provide translated responses
 */

import { detectViolation, recordViolationAndGetAction, getSelfHarmHotlineResponse } from '../violationEnforcement.js';
import { storeMessage } from '../messages.js';
import { fetchUserOracleLanguagePreference } from '../helpers/userDataQueries.js';

/**
 * Check message for violations and handle enforcement
 * Returns response if violation detected and handled, null if no violation
 * 
 * @param {string} userId - User ID
 * @param {string} message - User message to check
 * @param {boolean} tempUser - Is this a temporary/trial account
 * @returns {Promise<string|null>} - Response message if violation detected, null if OK
 */
export async function handleViolation(userId, message, tempUser) {
    try {
        
        // Detect if message contains violation
        const violation = detectViolation(message);

        if (violation) {
            // Fetch user's oracle language preference for translated responses
            const oracleLanguage = await fetchUserOracleLanguagePreference(userId);
            
            // Record violation and get enforcement action
            const enforcement = await recordViolationAndGetAction(userId, violation.type, message, tempUser, oracleLanguage);

            // SPECIAL CASE: Health/Medical content returns null (tracking only, no enforcement)
            // The health guardrail will handle the user-facing response
            if (!enforcement) {
                return null;
            }

            // Build response (includes self-harm hotline if needed)
            let responseToUser = enforcement.response;
            if (violation.type === 'self_harm') {
                responseToUser = getSelfHarmHotlineResponse(oracleLanguage) + '\n\n' + enforcement.response;
            }

            // Store response in database
            await storeMessage(userId, 'assistant', { text: responseToUser });

            // Note: For temp accounts, the account is deleted as part of enforcement
            return responseToUser;
        }

        // No violation detected
        return null;
          } catch (err) {
          throw err;
      }
}
