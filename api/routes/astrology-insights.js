import { Router } from "express";
import { hashUserId } from "../shared/hashUtils.js";
import { enqueueMessage, getClient } from "../shared/queue.js";
import { authenticateToken, authorizeUser } from "../middleware/auth.js";
import { db } from "../shared/db.js";
import { getLocalDateForTimezone, needsRegeneration } from "../shared/timezoneHelper.js";
import { processingResponse, serverError } from "../utils/responses.js";
import { successResponse } from '../utils/responses.js';


const router = Router();

/**
 * Check if generation is already in progress for cosmic weather
 * Prevents infinite loop of duplicate queue jobs
 */
async function isCosmicWeatherGenerating(userId) {
    try {
        const redis = await getClient();
        const key = `cosmic-weather:generating:${userId}`;
        const exists = await redis.get(key);
        return !!exists;
    } catch (err) {
        return false; // If Redis fails, allow queuing
    }
}

/**
 * Mark cosmic weather generation as in progress for 3 minutes (180 seconds)
 * CRITICAL: Must be longer than actual generation time (~100 seconds) to prevent duplicate queue jobs
 */
async function markCosmicWeatherGenerating(userId) {
    try {
        const redis = await getClient();
        const key = `cosmic-weather:generating:${userId}`;
        await redis.setEx(key, 180, 'true'); // Expires in 3 minutes (covers ~100 second generation time)
    } catch (err) {
        // Ignore Redis errors
    }
}

// Cosmic Weather Endpoint - GET
router.get("/cosmic-weather/:userId", authenticateToken, authorizeUser, async (req, res) => {
    const { userId } = req.params;
    const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
    const userIdHash = hashUserId(userId);
    
    try {
        // Fetch user's timezone
        const { rows: prefRows } = await db.query(
            `SELECT timezone FROM user_preferences WHERE user_id_hash = $1`,
            [userIdHash]
        );
        const userTz = prefRows.length > 0 && prefRows[0].timezone ? prefRows[0].timezone : 'UTC';
        
        // Calculate today in user's timezone (YYYY-MM-DD format)
        const today = new Date().toLocaleDateString('en-CA', {
            timeZone: userTz,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
        
        // Fetch cosmic weather - use created_at_local_date for accurate timezone matching
        const query = `SELECT 
                pgp_sym_decrypt(content_full_encrypted, $2)::text as content_full,
                pgp_sym_decrypt(content_brief_encrypted, $2)::text as content_brief,
                created_at_local_date
            FROM messages 
            WHERE user_id_hash = $1 AND role = 'cosmic_weather' 
            ORDER BY created_at DESC LIMIT 5`;
        const { rows } = await db.query(query, [userIdHash, ENCRYPTION_KEY]);
        
        // Find today's cosmic weather using created_at_local_date
        let todaysWeather = null;
        let briefWeather = null;
        
        for (const row of rows) {
            try {
                // Convert created_at_local_date (timestamp) to YYYY-MM-DD string for comparison
                let rowDate = row.created_at_local_date;
                if (rowDate instanceof Date) {
                    rowDate = rowDate.toISOString().split('T')[0];
                } else if (typeof rowDate === 'string') {
                    // If it's already a string, extract just the date part
                    rowDate = rowDate.split('T')[0];
                }
                
                // Use created_at_local_date for accurate timezone-aware matching
                if (rowDate === today) {
                    const fullContent = row.content_full;
                    const briefContent = row.content_brief;
                    
                    todaysWeather = typeof fullContent === 'string' ? JSON.parse(fullContent) : fullContent;
                    briefWeather = briefContent ? (typeof briefContent === 'string' ? JSON.parse(briefContent) : briefContent) : null;
                    break;
                }
            } catch (parseErr) {
                // Skip malformed entries
                continue;
            }
        }
        
        if (!todaysWeather) {
            // Check if already generating to prevent duplicates
            const alreadyGenerating = await isCosmicWeatherGenerating(userId);
            if (alreadyGenerating) {
                return processingResponse(res, 'Generating today\'s cosmic weather...', 'generating');
            }
            
            // Mark as generating and trigger synchronous generation
            await markCosmicWeatherGenerating(userId);
            
            // Import synchronous processor
            const { processCosmicWeatherSync } = await import('../services/chat/processor.js');
            
            try {
                // Generate cosmic weather synchronously
                const result = await processCosmicWeatherSync(userId);
                
                return successResponse(res, { 
                    weather: result.weather,
                    brief: result.brief,
                    birthChart: result.birthChart,
                    currentPlanets: result.currentPlanets
                });
            } catch (genErr) {
                // If generation fails, return error
                return serverError(res, 'Failed to generate cosmic weather');
            }
        }
        
        // Ensure birth_chart is properly formatted for frontend
        const formattedBirthChart = todaysWeather.birth_chart ? {
          rising_sign: todaysWeather.birth_chart.rising_sign,
          moon_sign: todaysWeather.birth_chart.moon_sign,
          sun_sign: todaysWeather.birth_chart.sun_sign,
          sun_degree: todaysWeather.birth_chart.sun_degree,
          moon_degree: todaysWeather.birth_chart.moon_degree,
          rising_degree: todaysWeather.birth_chart.rising_degree,
          venus_sign: todaysWeather.birth_chart.venus_sign,
          venus_degree: todaysWeather.birth_chart.venus_degree,
          mars_sign: todaysWeather.birth_chart.mars_sign,
          mars_degree: todaysWeather.birth_chart.mars_degree,
          mercury_sign: todaysWeather.birth_chart.mercury_sign,
          mercury_degree: todaysWeather.birth_chart.mercury_degree
        } : null;
        
        // Ensure planets array has all required fields
        const formattedPlanets = Array.isArray(todaysWeather.planets) ? todaysWeather.planets.map(p => ({
          icon: p.icon,
          name: p.name,
          sign: p.sign,
          degree: p.degree,
          retrograde: p.retrograde || false
        })) : [];
        
        successResponse(res, {
            weather: todaysWeather.text,
            brief: briefWeather?.text || null,
            birthChart: formattedBirthChart,
            currentPlanets: formattedPlanets
        });
    } catch (err) {
        return serverError(res, 'Failed to fetch cosmic weather');
    }
});

// Cosmic Weather Endpoint - POST (trigger generation)
router.post("/cosmic-weather/:userId", authenticateToken, authorizeUser, async (req, res) => {
    const { userId } = req.params;
    const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
    const userIdHash = hashUserId(userId);
    
    try {
        // Check if already generating (duplicate prevention)
        const alreadyGenerating = await isCosmicWeatherGenerating(userId);
        if (alreadyGenerating) {
            return processingResponse(res, 'Cosmic weather generation already in progress...', 'generating');
        }
        
        // Check if today's cosmic weather already exists
        const { rows: prefRows } = await db.query(
            `SELECT timezone FROM user_preferences WHERE user_id_hash = $1`,
            [userIdHash]
        );
        const userTz = prefRows.length > 0 && prefRows[0].timezone ? prefRows[0].timezone : 'UTC';
        
        const today = new Date().toLocaleDateString('en-CA', {
            timeZone: userTz,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
        
        const { rows } = await db.query(
            `SELECT 
                pgp_sym_decrypt(content_full_encrypted, $2)::text as content_full,
                pgp_sym_decrypt(content_brief_encrypted, $2)::text as content_brief,
                created_at_local_date
            FROM messages 
            WHERE user_id_hash = $1 AND role = 'cosmic_weather' 
            ORDER BY created_at DESC LIMIT 1`,
            [userIdHash, ENCRYPTION_KEY]
        );
        
        // Check if today's data already exists
        if (rows.length > 0) {
            let rowDate = rows[0].created_at_local_date;
            if (rowDate instanceof Date) {
                rowDate = rowDate.toISOString().split('T')[0];
            } else if (typeof rowDate === 'string') {
                rowDate = rowDate.split('T')[0];
            }
            
            if (rowDate === today) {
                // Today's cosmic weather already exists, return it
                const fullContent = rows[0].content_full;
                const briefContent = rows[0].content_brief;
                
                const todaysWeather = typeof fullContent === 'string' ? JSON.parse(fullContent) : fullContent;
                const briefWeather = briefContent ? (typeof briefContent === 'string' ? JSON.parse(briefContent) : briefContent) : null;
                
                const formattedBirthChart = todaysWeather.birth_chart ? {
                    rising_sign: todaysWeather.birth_chart.rising_sign,
                    moon_sign: todaysWeather.birth_chart.moon_sign,
                    sun_sign: todaysWeather.birth_chart.sun_sign,
                    sun_degree: todaysWeather.birth_chart.sun_degree,
                    moon_degree: todaysWeather.birth_chart.moon_degree,
                    rising_degree: todaysWeather.birth_chart.rising_degree,
                    venus_sign: todaysWeather.birth_chart.venus_sign,
                    venus_degree: todaysWeather.birth_chart.venus_degree,
                    mars_sign: todaysWeather.birth_chart.mars_sign,
                    mars_degree: todaysWeather.birth_chart.mars_degree,
                    mercury_sign: todaysWeather.birth_chart.mercury_sign,
                    mercury_degree: todaysWeather.birth_chart.mercury_degree
                } : null;
                
                const formattedPlanets = Array.isArray(todaysWeather.planets) ? todaysWeather.planets.map(p => ({
                    icon: p.icon,
                    name: p.name,
                    sign: p.sign,
                    degree: p.degree,
                    retrograde: p.retrograde || false
                })) : [];
                
                return successResponse(res, { 
                    weather: todaysWeather.text,
                    brief: briefWeather?.text || null,
                    birthChart: formattedBirthChart,
                    currentPlanets: formattedPlanets
                });
            }
        }
        
        // Mark as generating to prevent duplicates
        await markCosmicWeatherGenerating(userId);
        
        // Import synchronous processor
        const { processCosmicWeatherSync } = await import('../services/chat/processor.js');
        
        // Generate cosmic weather synchronously
        const result = await processCosmicWeatherSync(userId);
        
        successResponse(res, { 
            weather: result.weather,
            brief: result.brief,
            birthChart: result.birthChart,
            currentPlanets: result.currentPlanets
        });
    } catch (err) {
        return serverError(res, 'Failed to generate cosmic weather');
    }
});

// Lunar Nodes Endpoint
router.get("/lunar-nodes/:userId", authenticateToken, authorizeUser, async (req, res) => {
    const { userId } = req.params;
    const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
    const userIdHash = hashUserId(userId);
    
    try {
        const { rows } = await db.query(
            `SELECT 
                pgp_sym_decrypt(content_full_encrypted, $2)::text as content
             FROM messages 
             WHERE user_id_hash = $1 AND role = 'lunar_nodes' 
             ORDER BY created_at DESC LIMIT 1`,
            [userIdHash, ENCRYPTION_KEY]
        );
        
        if (rows.length === 0) {
            return processingResponse(res, 'Generating lunar nodes insight...', 'generating');
        }
        
        const data = typeof rows[0].content === 'string' ? JSON.parse(rows[0].content) : rows[0].content;
        successResponse(res, { insight: data.text, nodes: { north: data.north_node_sign, south: data.south_node_sign } });
    } catch (err) {
        return serverError(res, 'Failed to fetch lunar nodes');
    }
});

router.post("/lunar-nodes/:userId", authenticateToken, authorizeUser, async (req, res) => {
    const { userId } = req.params;
    try {
        // Import synchronous processor
        const { processLunarNodesSync } = await import('../services/chat/processor.js');
        
        // Generate lunar nodes insight synchronously
        const result = await processLunarNodesSync(userId);
        
        successResponse(res, { 
            insight: result.insight,
            nodes: result.nodes
        });
    } catch (err) {
        return serverError(res, 'Failed to generate lunar nodes insight');
    }
});

// Void of Course Moon Endpoint
router.get("/void-of-course/:userId", authenticateToken, authorizeUser, async (req, res) => {
    const { userId } = req.params;
    const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
    const userIdHash = hashUserId(userId);
    
    try {
        // Fetch user's timezone
        const { rows: prefRows } = await db.query(
            `SELECT timezone FROM user_preferences WHERE user_id_hash = $1`,
            [userIdHash]
        );
        const userTz = prefRows.length > 0 && prefRows[0].timezone ? prefRows[0].timezone : 'UTC';
        
        // Calculate today in user's timezone (YYYY-MM-DD format)
        const today = new Date().toLocaleDateString('en-CA', {
            timeZone: userTz,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
        
        // Fetch void of course - check last 5 records for today's data
        const query = `SELECT 
                pgp_sym_decrypt(content_full_encrypted, $2)::text as content_full
            FROM messages 
            WHERE user_id_hash = $1 AND role = 'void_of_course' 
            ORDER BY created_at DESC LIMIT 5`;
        
        const { rows } = await db.query(query, [userIdHash, ENCRYPTION_KEY]);
        
        let todaysAlert = null;
        for (const row of rows) {
            const fullContent = row.content_full;
            
            const data = typeof fullContent === 'string' ? JSON.parse(fullContent) : fullContent;
            const dataDate = data.generated_at?.split('T')[0];
            if (dataDate === today) {
                todaysAlert = data;
                break;
            }
        }
        
        if (!todaysAlert) {
            return processingResponse(res, 'Calculating void of course moon...', 'generating');
        }
        
        successResponse(res, { 
            is_void: todaysAlert.is_void,
            alert: todaysAlert.text || todaysAlert.message,
            phase: todaysAlert.phase
        });
    } catch (err) {
        return serverError(res, 'Failed to fetch void of course');
    }
});

router.post("/void-of-course/:userId", authenticateToken, authorizeUser, async (req, res) => {
    const { userId } = req.params;
    try {
        // Import synchronous processor
        const { processVoidOfCourseSync } = await import('../services/chat/processor.js');
        
        // Generate void of course alert synchronously
        const result = await processVoidOfCourseSync(userId);
        
        successResponse(res, { 
            is_void: result.is_void,
            alert: result.alert,
            phase: result.phase
        });
    } catch (err) {
        return serverError(res, 'Failed to generate void of course alert');
    }
});

// Moon Phase Endpoint - GET
router.get("/moon-phase/:userId", authenticateToken, authorizeUser, async (req, res) => {
    const { userId } = req.params;
    const { phase } = req.query;
    const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
    const userIdHash = hashUserId(userId);
    
    try {
        // Fetch moon phase data for requested phase
        const query = `SELECT 
                pgp_sym_decrypt(content_full_encrypted, $2)::text as content_full,
                pgp_sym_decrypt(content_brief_encrypted, $2)::text as content_brief
            FROM messages 
            WHERE user_id_hash = $1 AND role = 'moon_phase' AND moon_phase = $3
            ORDER BY created_at DESC LIMIT 1`;
        const { rows } = await db.query(query, [userIdHash, ENCRYPTION_KEY, phase]);
        
        if (rows.length === 0) {
            return processingResponse(res, 'Generating moon phase commentary...', 'generating');
        }
        
        const row = rows[0];
        const fullContent = row.content_full;
        const briefContent = row.content_brief;
        
        const moonPhaseData = typeof fullContent === 'string' ? JSON.parse(fullContent) : fullContent;
        const briefData = briefContent ? (typeof briefContent === 'string' ? JSON.parse(briefContent) : briefContent) : null;
        
        successResponse(res, {
            commentary: moonPhaseData.text,
            brief: briefData?.text || null,
            generated_at: moonPhaseData.generated_at,
            phase: phase
        });
    } catch (err) {
        return serverError(res, 'Failed to fetch moon phase');
    }
});

// Moon Phase Endpoint - POST
router.post("/moon-phase/:userId", authenticateToken, authorizeUser, async (req, res) => {
    const { userId } = req.params;
    const { phase } = req.body;
    try {
        // Import synchronous processor
        const { processMoonPhaseSync } = await import('../services/chat/processor.js');
        
        // Generate moon phase commentary synchronously
        const result = await processMoonPhaseSync(userId, phase);
        
        successResponse(res, { 
            commentary: result.commentary,
            brief: result.brief,
            generated_at: result.generated_at,
            phase: result.phase
        });
    } catch (err) {
        return serverError(res, 'Failed to generate moon phase commentary');
    }
});

export default router;
