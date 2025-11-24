import { getMessageFromQueue, redis } from "./shared/queue.js";
import { getCurrentMoonPhase } from "./modules/astrology.js";
import { isAstrologyRequest, handleAstrologyCalculation } from "./modules/handlers/astrology-handler.js";
import { isHoroscopeRequest, extractHoroscopeRange, generateHoroscope } from "./modules/handlers/horoscope-handler.js";
import { handleChatMessage } from "./modules/handlers/chat-handler.js";

/**
 * Route job to appropriate handler based on message content
 */
async function routeJob(job) {
    const { userId, message } = job;
    
    try {
        if (isAstrologyRequest(message)) {
            await handleAstrologyCalculation(userId);
        } else if (isHoroscopeRequest(message)) {
            const range = extractHoroscopeRange(message);
            await generateHoroscope(userId, range);
        } else {
            await handleChatMessage(userId, message);
        }
    } catch (err) {
        console.error(`[PROCESSOR] Error processing job for user ${userId}:`, err.message);
    }
}

/**
 * Update moon phase cache every hour
 */
async function updateMoonPhaseCache() {
    try {
        const moonPhaseData = await getCurrentMoonPhase();
        if (moonPhaseData.success) {
            await redis.setEx('current:moon-phase', 3600, JSON.stringify(moonPhaseData));
        }
    } catch (err) {
        console.error('[PROCESSOR] Error updating moon phase cache:', err.message);
    }
}

/**
 * Main worker loop
 */
export async function workerLoop() {
    // Initialize moon phase cache
    await updateMoonPhaseCache();
    
    // Update cache hourly
    setInterval(updateMoonPhaseCache, 3600000);
    
    // Main job processing loop
    while (true) {
        const job = await getMessageFromQueue();
        if (!job) {
            await new Promise((r) => setTimeout(r, 500)); // poll interval
            continue;
        }
        
        await routeJob(job);
    }
}
