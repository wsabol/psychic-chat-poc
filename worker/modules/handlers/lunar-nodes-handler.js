import { fetchUserAstrology, getOracleSystemPrompt, callOracle, getUserGreeting, fetchUserPersonalInfo } from '../oracle.js';
import { storeMessage } from '../messages.js';
import { logErrorFromCatch } from '../../../shared/errorLogger.js';

export async function generateLunarNodesInsight(userId) {
    try {
        const userInfo = await fetchUserPersonalInfo(userId);
        const astrologyInfo = await fetchUserAstrology(userId);
        
        if (!astrologyInfo?.astrology_data) {
            throw new Error('No astrology data found');
        }
        
        const astro = astrologyInfo.astrology_data;
        if (!astro.north_node_sign) {
            throw new Error('Lunar nodes not calculated yet');
        }
        
        const userGreeting = getUserGreeting(userInfo, userId);
        const systemPrompt = getOracleSystemPrompt() + `

SPECIAL REQUEST - LUNAR NODES INSIGHT:
Generate a brief, profound insight about ${userGreeting}'s soul's purpose based on their Lunar Nodes.
Keep it concise (2-3 sentences) and transformative.
Do NOT include tarot cards.
`;
        
        const prompt = `${userGreeting}'s Lunar Nodes:
- North Node: ${astro.north_node_sign} (${astro.north_node_degree}°) - Soul's Growth Direction
- South Node: ${astro.south_node_sign} (${astro.south_node_degree}°) - Past Patterns to Release

Provide insight into their soul's journey and purpose.`;
        
                        const oracleResponses = await callOracle(systemPrompt, [], prompt, true);
        
        const lunarNodesDataFull = {
            text: oracleResponses.full,
            north_node_sign: astro.north_node_sign,
            north_node_degree: astro.north_node_degree,
            south_node_sign: astro.south_node_sign,
            south_node_degree: astro.south_node_degree,
            generated_at: new Date().toISOString()
        };
        const lunarNodesDataBrief = { text: oracleResponses.brief, generated_at: new Date().toISOString() };
        await storeMessage(userId, 'lunar_nodes', lunarNodesDataFull, lunarNodesDataBrief);
                } catch (err) {
        logErrorFromCatch(err, '[LUNAR-NODES-HANDLER] Error generating lunar nodes insight');
        // Continue silently on error
    }
}

export function isLunarNodesRequest(message) {
    return message.includes('[SYSTEM]') && message.includes('lunar nodes');
}
