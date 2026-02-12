/**
 * ORACLE.JS - Mystical Guidance Engine (~100 lines)
 * Thin orchestrator that coordinates oracle reading generation
 * Re-exports from specialized helper modules for easy access
 */

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
 * OPTIMIZED: Generates both full and brief responses in a SINGLE API call
 * @param {string} systemPrompt - System prompt with oracle instructions
 * @param {array} messageHistory - Previous messages in conversation
 * @param {string} userMessage - Current user message
 * @param {boolean} generateBrief - Whether to also generate brief summary
 * @returns {object} { full: fullResponse, brief: briefResponse }
 */
export async function callOracle(systemPrompt, messageHistory, userMessage, generateBrief = true) {
  try {
    console.log('[ORACLE] Starting OpenAI call...');
    // Reverse history: input is ASC (oldest first), reverse to DESC for context relevance
    const reversedHistory = messageHistory.slice().reverse();
    const openaiClient = getOpenAIClient();
    
    // Add timeout wrapper (120 seconds max)
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('OpenAI API timeout after 120 seconds')), 120000);
    });
    
    if (!generateBrief) {
      // Simple single response for cases that don't need brief version
      console.log('[ORACLE] Calling OpenAI for single response...');
      const completion = await Promise.race([
        openaiClient.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            ...reversedHistory,
            { role: "user", content: userMessage },
          ]
        }),
        timeoutPromise
      ]);
      
      const response = completion.choices[0]?.message?.content || "";
      console.log(`[ORACLE] Single response received (${response.length} chars)`);
      return { full: response, brief: null };
    }
    
    // OPTIMIZED: Single call that generates BOTH full and brief versions at once
    console.log('[ORACLE] Calling OpenAI for BOTH full and brief in single call...');
    const enhancedPrompt = `${systemPrompt}

CRITICAL OUTPUT FORMATTING:
Your response must contain EXACTLY TWO SECTIONS separated by the marker "===BRIEF VERSION===":

1. FULL VERSION: Your complete, rich, detailed response (3-4 paragraphs)
2. BRIEF VERSION: A concise 20% length summary of the full version (1 paragraph)

Format your response EXACTLY like this:
[Your full detailed response here - multiple paragraphs with all the rich detail requested]

===BRIEF VERSION===
[Your concise summary here - one paragraph, 20% the length of the full version]

IMPORTANT: The brief version MUST be a faithful summary of the full version above it. Do not omit this structure.`;
    
    const completion = await Promise.race([
      openaiClient.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: enhancedPrompt },
          ...reversedHistory,
          { role: "user", content: userMessage },
        ]
      }),
      timeoutPromise
    ]);
    
    const fullResponseText = completion.choices[0]?.message?.content || "";
    console.log(`[ORACLE] Combined response received (${fullResponseText.length} chars)`);
    
    // Parse the response to extract full and brief sections
    const sections = fullResponseText.split('===BRIEF VERSION===');
    
    if (sections.length === 2) {
      const fullResponse = sections[0].trim();
      const briefResponse = sections[1].trim();
      console.log(`[ORACLE] Successfully parsed - Full: ${fullResponse.length} chars, Brief: ${briefResponse.length} chars`);
      return { full: fullResponse, brief: briefResponse };
    } else {
      // Fallback if parsing fails - use full response for both
      console.warn('[ORACLE] Failed to parse brief section, using full response for both');
      return { full: fullResponseText, brief: fullResponseText };
    }
  } catch (err) {
    console.error('[ORACLE] Error:', err.message);
    console.error('[ORACLE] Stack:', err.stack);
    throw err;
  }
}
