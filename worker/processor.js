import { getMessageFromQueue, redis } from "./shared/queue.js";
import { getCurrentMoonPhase } from "./modules/astrology.js";
import { isAstrologyRequest, handleAstrologyCalculation } from "./modules/handlers/astrology-handler.js";
import { isHoroscopeRequest, extractHoroscopeRange, generateHoroscope } from "./modules/handlers/horoscope-handler.js";
import { isMoonPhaseRequest, extractMoonPhase, generateMoonPhaseCommentary } from "./modules/handlers/moon-phase-handler.js";
import { isLunarNodesRequest, generateLunarNodesInsight } from "./modules/handlers/lunar-nodes-handler.js";
import { isCosmicWeatherRequest, generateCosmicWeather } from "./modules/handlers/cosmic-weather-handler.js";
import { isVoidOfCourseRequest, generateVoidOfCourseMoonAlert } from "./modules/handlers/void-of-course-handler.js";
import { handleChatMessage } from "./modules/handlers/chat-handler.js";

const API_URL = process.env.API_URL || 'http://localhost:3000';

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
        } else if (isMoonPhaseRequest(message)) {
            const phase = extractMoonPhase(message);
            await generateMoonPhaseCommentary(userId, phase);
        } else if (isLunarNodesRequest(message)) {
            await generateLunarNodesInsight(userId);
        } else if (isCosmicWeatherRequest(message)) {
            await generateCosmicWeather(userId);
        } else if (isVoidOfCourseRequest(message)) {
            await generateVoidOfCourseMoonAlert(userId);
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
 * Cleanup old temporary accounts every 24 hours
 * Deletes temp accounts older than 7 days from Firebase and database
 */
async function cleanupOldTempAccounts() {
    try {
        const response = await fetch(`${API_URL}/cleanup/cleanup-old-temp-accounts`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (response.ok) {
            const result = await response.json();
        } else {
            console.error('[CLEANUP] ✗ Cleanup failed with status:', response.status);
        }
    } catch (err) {
        console.error('[CLEANUP] Error running cleanup job:', err.message);
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
    
    // Run cleanup job every 24 hours (86400000 ms)
    setInterval(cleanupOldTempAccounts, 86400000);
    
    // Also run cleanup once on startup (after 5 seconds delay to let system initialize)
    setTimeout(cleanupOldTempAccounts, 5000);
    
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
