import { getMessageFromQueue, redis } from "./shared/queue.js";
import { getCurrentMoonPhase } from "./modules/astrology.js";
import { isAstrologyRequest, handleAstrologyCalculation } from "./modules/handlers/astrology-handler.js";
import { isHoroscopeRequest, extractHoroscopeRange, generateHoroscope } from "./modules/handlers/horoscope-handler.js";
import { isMoonPhaseRequest, extractMoonPhase, generateMoonPhaseCommentary } from "./modules/handlers/moon-phase-handler.js";
import { isLunarNodesRequest, generateLunarNodesInsight } from "./modules/handlers/lunar-nodes-handler.js";
import { isCosmicWeatherRequest, generateCosmicWeather } from "./modules/handlers/cosmic-weather-handler.js";
import { isVoidOfCourseRequest, generateVoidOfCourseMoonAlert } from "./modules/handlers/void-of-course-handler.js";
import { handleChatMessage } from "./modules/handlers/chat-handler.js";
import { db } from "./shared/db.js";

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
 * Generate daily horoscope and moon phase for all users on app startup
 */
async function generateDailyMysticalUpdates() {
    try {
        const { rows: users } = await db.query(
            `SELECT user_id as id FROM user_personal_info WHERE created_at > NOW() - INTERVAL '1 year' AND user_id NOT LIKE 'temp_%'`
        );
        
        if (users.length === 0) {
            return;
        }
        
        for (const user of users) {
            try {
                await generateHoroscope(user.id, 'daily');
                await generateMoonPhaseCommentary(user.id, 'waxing');
            } catch (err) {
                console.error(`[STARTUP] Error updating user ${user.id}:`, err.message);
            }
        }
    } catch (err) {
        console.error('[STARTUP] Error generating daily mystical updates:', err.message);
    }
}

/**
 * Cleanup old temporary accounts every 24 hours
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
    
    try {
        await generateDailyMysticalUpdates();
    } catch (err) {
        console.error('[WORKER] Failed to generate daily updates:', err.message);
    }
    
    setInterval(cleanupOldTempAccounts, 86400000);
    setTimeout(cleanupOldTempAccounts, 5000);
    while (true) {
        try {
            const job = await getMessageFromQueue();
            if (!job) {
                await new Promise((r) => setTimeout(r, 500));
                continue;
            }
            await routeJob(job);
        } catch (err) {
            console.error('[WORKER] Fatal error in job loop:', err.message);
            await new Promise((r) => setTimeout(r, 1000));
        }
    }
}
