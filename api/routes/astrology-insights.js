import { Router } from "express";
import { hashUserId } from "../shared/hashUtils.js";
import { enqueueMessage } from "../shared/queue.js";
import { authenticateToken, authorizeUser } from "../middleware/auth.js";
import { db } from "../shared/db.js";
import { getLocalDateForTimezone, needsRegeneration } from "../shared/timezoneHelper.js";
import { processingResponse, serverError } from "../utils/responses.js";


const router = Router();

// Cosmic Weather Endpoint - GET
router.get("/cosmic-weather/:userId", authenticateToken, authorizeUser, async (req, res) => {
    const { userId } = req.params;
    const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
    const userIdHash = hashUserId(userId);
    
    // Get user's timezone for proper date comparison
    const { rows: tzRows } = await db.query(
        `SELECT pgp_sym_decrypt(birth_timezone_encrypted, $1)::text as timezone FROM user_personal_info WHERE user_id = $2`,
        [ENCRYPTION_KEY, userId]
    );
    const userTz = tzRows.length > 0 && tzRows[0].timezone ? tzRows[0].timezone : 'UTC';
    
    // Calculate today in user's timezone
    const formatter = new Intl.DateTimeFormat('en-CA', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit',
        timeZone: userTz
    });
    const today = formatter.format(new Date());
    
        try {
        // Fetch user's timezone and preferences
        const { rows: prefRows } = await db.query(
            `SELECT timezone, language, response_type FROM user_preferences WHERE user_id_hash = $1`,
            [userIdHash]
        );
        const userTz = prefRows.length > 0 && prefRows[0].timezone ? prefRows[0].timezone : 'UTC';
        const userLanguage = prefRows.length > 0 ? prefRows[0].language : 'en-US';
        const responseType = prefRows.length > 0 ? prefRows[0].response_type : 'full';
        
        // Calculate today in user's timezone (YYYY-MM-DD format)
        const today = new Date().toLocaleDateString('en-CA', {
            timeZone: userTz,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
        
        // Fetch cosmic weather
        // NOTE: Only content_full_encrypted and content_brief_encrypted exist in database
        const query = `SELECT 
                pgp_sym_decrypt(content_full_encrypted, $2)::text as content_full,
                pgp_sym_decrypt(content_brief_encrypted, $2)::text as content_brief,
                language_code
            FROM messages 
            WHERE user_id_hash = $1 AND role = 'cosmic_weather' 
            ORDER BY created_at DESC LIMIT 5`;
                const { rows } = await db.query(query, [userIdHash, ENCRYPTION_KEY]);
        
        let todaysWeather = null;
        let briefWeather = null;
        
        console.log(`[COSMIC-WEATHER] Found ${rows.length} records, looking for date: ${today}`);
        
        for (const row of rows) {
            const fullContent = row.content_full;
            const briefContent = row.content_brief;
            
            try {
                const data = typeof fullContent === 'string' ? JSON.parse(fullContent) : fullContent;
                const dataDate = data.generated_at?.split('T')[0];
                if (dataDate === today) {
                    todaysWeather = data;
                    briefWeather = briefContent ? (typeof briefContent === 'string' ? JSON.parse(briefContent) : briefContent) : null;
                    break;
                }
            } catch (parseErr) {
                // Skip malformed entries
                continue;
            }
        }
        
                if (!todaysWeather) {
            return processingResponse(res, 'Generating today\'s cosmic weather...', 'generating');
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
        
        res.json({
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
    try {
        await enqueueMessage({ userId, message: '[SYSTEM] Generate cosmic weather' });
        res.json({ status: 'Generating today\'s cosmic weather...' });
        } catch (err) {
        return serverError(res, 'Failed to queue cosmic weather');
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
        res.json({ insight: data.text, nodes: { north: data.north_node_sign, south: data.south_node_sign } });
        } catch (err) {
        return serverError(res, 'Failed to fetch lunar nodes');
    }
});

router.post("/lunar-nodes/:userId", authenticateToken, authorizeUser, async (req, res) => {
    const { userId } = req.params;
    try {
        await enqueueMessage({ userId, message: '[SYSTEM] Generate lunar nodes insight' });
        res.json({ status: 'Generating lunar nodes insight...' });
        } catch (err) {
        return serverError(res, 'Failed to queue lunar nodes');
    }
});

// Void of Course Moon Endpoint
router.get("/void-of-course/:userId", authenticateToken, authorizeUser, async (req, res) => {
    const { userId } = req.params;
    const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
    const userIdHash = hashUserId(userId);
    
    try {
                // Fetch user preferences including timezone
        const { rows: prefRows } = await db.query(
            `SELECT timezone, language, response_type FROM user_preferences WHERE user_id_hash = $1`,
            [userIdHash]
        );
                const userTz = prefRows.length > 0 && prefRows[0].timezone ? prefRows[0].timezone : 'UTC';
        const userLanguage = prefRows.length > 0 ? prefRows[0].language : 'en-US';
        const responseType = prefRows.length > 0 ? prefRows[0].response_type : 'full';
        
        // Calculate today in user's timezone (YYYY-MM-DD format)
        const today = new Date().toLocaleDateString('en-CA', {
            timeZone: userTz,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
        
        // Fetch void of course
        // NOTE: Only content_full_encrypted and content_brief_encrypted exist in database
        const query = `SELECT 
                pgp_sym_decrypt(content_full_encrypted, $2)::text as content_full,
                pgp_sym_decrypt(content_brief_encrypted, $2)::text as content_brief,
                language_code
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
        
        res.json({ 
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
        await enqueueMessage({ userId, message: '[SYSTEM] Generate void of course alert' });
        res.json({ status: 'Checking void of course moon...' });
        } catch (err) {
        return serverError(res, 'Failed to queue void of course');
    }
});

// Moon Phase Endpoint - GET
router.get("/moon-phase/:userId", authenticateToken, authorizeUser, async (req, res) => {
    const { userId } = req.params;
    const { phase } = req.query;
    const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
    const userIdHash = hashUserId(userId);
    
    try {
        const { rows: prefRows } = await db.query(
            `SELECT language, response_type FROM user_preferences WHERE user_id_hash = $1`,
            [userIdHash]
        );
        const userLanguage = prefRows.length > 0 ? prefRows[0].language : 'en-US';
        const responseType = prefRows.length > 0 ? prefRows[0].response_type : 'full';
        
        // NOTE: Only content_full_encrypted and content_brief_encrypted exist in database
        const query = `SELECT 
                pgp_sym_decrypt(content_full_encrypted, $2)::text as content_full,
                pgp_sym_decrypt(content_brief_encrypted, $2)::text as content_brief,
                language_code
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
        
        res.json({
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
        await enqueueMessage({ userId, message: `[SYSTEM] Generate moon phase commentary for ${phase}` });
        res.json({ status: `Generating ${phase} moon phase commentary...` });
        } catch (err) {
        return serverError(res, 'Failed to queue moon phase');
    }
});

export default router;
