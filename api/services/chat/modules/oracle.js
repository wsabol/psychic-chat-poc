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
    // Reverse history: input is ASC (oldest first), reverse to DESC for context relevance
    const reversedHistory = messageHistory.slice().reverse();
    const openaiClient = getOpenAIClient();
    
    // Add timeout wrapper (120 seconds max)
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('OpenAI API timeout after 120 seconds')), 120000);
    });
    
    if (!generateBrief) {
      // Simple single response for cases that don't need brief version
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
      return { full: response, brief: null };
    }
    
    // OPTIMIZED: Single call that generates BOTH full and brief versions at once
    const enhancedPrompt = `${systemPrompt}

CRITICAL OUTPUT FORMATTING:
Your response must contain EXACTLY TWO SECTIONS separated by the marker "===BRIEF VERSION===":

1. FULL VERSION: Your complete, rich, detailed response (3-4 paragraphs)
2. BRIEF VERSION: A concise 20% length summary of the full version (1 paragraph)

Format your response EXACTLY like this:
[Your full detailed response here - multiple paragraphs with all the rich detail requested]

===BRIEF VERSION===
[Your concise summary here - one paragraph, 20% the length of the full version]

IMPORTANT: 
- The brief version MUST be a faithful summary of the full version above it
- The brief version should be substantially shorter (approximately 20% of full length)
- You MUST include the "===BRIEF VERSION===" separator exactly as shown
- Do NOT omit this structure under any circumstances`;
    
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
    
    // Parse the response to extract full and brief sections
    const sections = fullResponseText.split('===BRIEF VERSION===');
    
    if (sections.length >= 2) {
      // Get the full response (before the first marker)
      let fullResponse = sections[0].trim();
      
      // Get the brief response (after the first marker, before any additional markers)
      // This handles cases where AI mistakenly includes the marker multiple times
      let briefResponse = sections[1].trim();
      
      // Remove any remaining markers from both responses
      fullResponse = fullResponse.replace(/===BRIEF VERSION===/g, '').trim();
      briefResponse = briefResponse.replace(/===BRIEF VERSION===/g, '').trim();
      
      // Also remove any emojis or text that might appear at the very end after the brief
      // (like the 🔊 that appears in the user's example)
      briefResponse = briefResponse.split('\n')[0].trim(); // Take only first line/paragraph if multiple exist
      
      // Validate that brief is actually different and shorter
      if (fullResponse === briefResponse || briefResponse.length < 50) {
        console.warn('[ORACLE] WARNING: Brief response is invalid - regenerating brief');
        // Generate a quick brief summary using simple truncation as fallback
        const words = fullResponse.split(/\s+/);
        const briefWordCount = Math.floor(words.length * 0.2);
        const quickBrief = words.slice(0, Math.max(briefWordCount, 50)).join(' ') + '...';
        return { full: fullResponse, brief: quickBrief };
      }
      
      return { full: fullResponse, brief: briefResponse };
    } else {
      // Fallback if parsing fails - generate brief from full
      console.warn('[ORACLE] Failed to parse brief section, generating brief from full response');
      let cleanedResponse = fullResponseText.replace(/===BRIEF VERSION===/g, '').trim();
      const words = cleanedResponse.split(/\s+/);
      const briefWordCount = Math.floor(words.length * 0.2);
      const briefResponse = words.slice(0, Math.max(briefWordCount, 50)).join(' ') + '...';
      return { full: cleanedResponse, brief: briefResponse };
    }
  } catch (err) {
    console.error('[ORACLE] Error:', err.message);
    console.error('[ORACLE] Stack:', err.stack);
    throw err;
  }
}
