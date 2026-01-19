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
import { logErrorFromCatch } from '../shared/errorLogger.js';

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
        logErrorFromCatch(err, `[PROCESSOR] Error processing job for user ${userId}`);
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
                logErrorFromCatch(err, `[STARTUP] Error updating user ${user.id}`);
            }
        }
    } catch (err) {
        logErrorFromCatch(err, '[STARTUP] Error generating daily mystical updates');
    }
}

/**
 * Main worker loop
 */
export async function workerLoop() {
    
        try {
        await generateDailyMysticalUpdates();
    } catch (err) {
        logErrorFromCatch(err, '[WORKER] Failed to generate daily updates');
    }
    
    // Cleanup job disabled temporarily - needs endpoint fix
    // Will be re-enabled after fixing /cleanup/cleanup-old-temp-accounts endpoint
    
    while (true) {
        try {
            const job = await getMessageFromQueue();
            if (!job) {
                await new Promise((r) => setTimeout(r, 500));
                continue;
            }
            await routeJob(job);
                } catch (err) {
            logErrorFromCatch(err, '[WORKER] Fatal error in job loop');
            await new Promise((r) => setTimeout(r, 1000));
        }
    }
}
