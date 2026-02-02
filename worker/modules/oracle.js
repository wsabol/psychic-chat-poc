/**
 * ORACLE.JS - Mystical Guidance Engine (~100 lines)
 * Thin orchestrator that coordinates oracle reading generation
 * Re-exports from specialized helper modules for easy access
 */

import dotenv from 'dotenv';
dotenv.config();

import { getOpenAIClient } from '../shared/openaiClient.js';
import { getBriefSummaryPrompt, getOracleSystemPrompt } from './helpers/systemPrompts.js';

// Re-export all functions from helpers for backwards compatibility
export {
  fetchUserPersonalInfo,
  fetchUserAstrology,
  isTemporaryUser,
  fetchUserLanguagePreference,
  fetchUserOracleLanguagePreference
} from './helpers/userDataQueries.js';

export {
  buildPersonalInfoContext,
  buildAstrologyContext
} from './helpers/contextBuilders.js';

export { getOracleSystemPrompt } from './helpers/systemPrompts.js';

export {
  getUserGreeting,
  extractScentDataFromResponse
} from './helpers/utilities.js';

// ============================================================================
// ORACLE API CALL
// ============================================================================

/**
 * Call Oracle API (OpenAI GPT) to generate response
 * Generates both full reading and brief summary in a single flow
 * @param {string} systemPrompt - System prompt with oracle instructions
 * @param {array} messageHistory - Previous messages in conversation
 * @param {string} userMessage - Current user message
 * @param {boolean} generateBrief - Whether to also generate brief summary
 * @returns {object} { full: fullResponse, brief: briefResponse }
 */
export async function callOracle(systemPrompt, messageHistory, userMessage, generateBrief = true) {
  try {
    // Reverse history: input is ASC (oldest first), reverse to DESC for context relevance
    const reversedHistory = messageHistory.slice().reverse();
    const openaiClient = getOpenAIClient();
    
    const fullCompletion = await openaiClient.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        ...reversedHistory,
        { role: "user", content: userMessage },
      ]
    });
    
    const fullResponse = fullCompletion.choices[0]?.message?.content || "";
    if (!generateBrief) return { full: fullResponse, brief: null };
    
    // Generate brief summary from full response
    const briefCompletion = await openaiClient.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: getBriefSummaryPrompt() },
        { role: "user", content: "Brief synopsis (20% length): " + fullResponse },
      ]
    });
    
    return { 
      full: fullResponse, 
      brief: briefCompletion.choices[0]?.message?.content || "" 
    };
  } catch (err) {
    throw err;
  }
}
