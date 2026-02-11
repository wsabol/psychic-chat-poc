import { getMessageFromQueue, redis, closeRedisConnection } from "./shared/queue.js";
import { getCurrentMoonPhase } from "./modules/astrology.js";
import { isAstrologyRequest, handleAstrologyCalculation } from "./modules/handlers/astrology-handler.js";
import { isHoroscopeRequest, extractHoroscopeRange, generateHoroscope } from "./modules/handlers/horoscope-handler.js";
import { isMoonPhaseRequest, extractMoonPhase, generateMoonPhaseCommentary } from "./modules/handlers/moon-phase-handler.js";
import { isLunarNodesRequest, generateLunarNodesInsight } from "./modules/handlers/lunar-nodes-handler.js";
import { isCosmicWeatherRequest, generateCosmicWeather } from "./modules/handlers/cosmic-weather-handler.js";
import { isVoidOfCourseRequest, generateVoidOfCourseMoonAlert } from "./modules/handlers/void-of-course-handler.js";
import { handleChatMessage } from "./modules/handlers/chat-handler.js";
import { db, closeDbConnection } from "./shared/db.js";
import { logErrorFromCatch } from './shared/errorLogger.js';

const API_URL = process.env.API_URL || 'http://localhost:3000';

// Worker state
let shouldStop = false;
let currentJob = null;

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
        // Only select established users with valid subscriptions AND complete astrology data
        // This prevents infinite loop from old temp users or incomplete accounts
        const { rows: users } = await db.query(
            `SELECT DISTINCT upi.user_id as id 
             FROM user_personal_info upi
             INNER JOIN user_astrology ua ON ENCODE(DIGEST(upi.user_id, 'sha256'), 'hex') = ua.user_id_hash
             WHERE upi.created_at > NOW() - INTERVAL '1 year' 
             AND upi.user_id NOT LIKE 'temp_%'
             AND upi.subscription_status IS NOT NULL
             AND upi.subscription_status != 'trialing'
             AND ua.astrology_data IS NOT NULL`
        );
        
        if (users.length === 0) {
            return;
        }
        
        // Get current moon phase once for all users
        let currentPhase = null;
        try {
            const moonPhaseData = await getCurrentMoonPhase();
            if (moonPhaseData && moonPhaseData.success && moonPhaseData.phase) {
                currentPhase = moonPhaseData.phase;
            } else {
                logErrorFromCatch(new Error('Moon phase calculation failed or returned invalid data'), '[STARTUP] Cannot generate moon phase commentaries');
            }
        } catch (err) {
            logErrorFromCatch(err, '[STARTUP] Error fetching current moon phase');
        }
        for (let i = 0; i < users.length; i++) {
            const user = users[i];
            try {
                await generateHoroscope(user.id, 'daily');
                // Only generate moon phase if we successfully got the current phase
                if (currentPhase) {
                    await generateMoonPhaseCommentary(user.id, currentPhase);
                }
            } catch (err) {
                logErrorFromCatch(err, `[STARTUP] Error updating user ${user.id}`);
            }
        }
    } catch (err) {
        logErrorFromCatch(err, '[STARTUP] Error generating daily mystical updates');
    }
}

/**
 * Shutdown worker gracefully
 */
export async function shutdownWorker() {
    console.log('[WORKER] Initiating shutdown...');
    shouldStop = true;
    
    // Wait for current job to finish (with timeout)
    if (currentJob) {
        console.log('[WORKER] Waiting for current job to complete...');
        const timeout = new Promise(resolve => setTimeout(resolve, 10000));
        await Promise.race([currentJob, timeout]);
    }
    
    // Close connections
    console.log('[WORKER] Closing database connection...');
    await closeDbConnection();
    
    console.log('[WORKER] Closing Redis connection...');
    await closeRedisConnection();
    
    console.log('[WORKER] Shutdown complete');
}

/**
 * Main worker loop
 */
export async function workerLoop() {
    console.log('[WORKER] Starting job processing loop...');
    
    // DISABLED: No need to generate for all users on startup
    // On-demand generation (when users log in) is sufficient and more efficient
    // try {
    //     await generateDailyMysticalUpdates();
    // } catch (err) {
    //     logErrorFromCatch(err, '[WORKER] Failed to generate daily updates');
    // }
    
    let jobCount = 0;
    let emptyPolls = 0;
    let lastHealthLog = Date.now();
    
    while (!shouldStop) {
        try {
            // Log health status every 5 minutes
            if (Date.now() - lastHealthLog > 300000) {
                console.log(`[WORKER] Health check: Running normally (${jobCount} jobs processed)`);
                lastHealthLog = Date.now();
            }
            
            const job = await getMessageFromQueue();
            if (!job) {
                emptyPolls++;
                if (emptyPolls % 120 === 0) { // Log every 60 seconds (120 * 500ms)
                    console.log(`[WORKER] Waiting for jobs... (${jobCount} processed so far)`);
                }
                await new Promise((r) => setTimeout(r, 500));
                continue;
            }
            
            emptyPolls = 0;
            jobCount++;
            console.log(`[WORKER] Processing job #${jobCount} for user: ${job.userId?.substring(0, 8)}...`);
            
            // Track current job for graceful shutdown
            currentJob = routeJob(job);
            await currentJob;
            currentJob = null;
            
            console.log(`[WORKER] Job #${jobCount} completed successfully`);
        } catch (err) {
            currentJob = null;
            logErrorFromCatch(err, '[WORKER] Error in job loop');
            await new Promise((r) => setTimeout(r, 1000));
        }
    }
    
    console.log('[WORKER] Worker loop stopped');
}
