import { Router } from "express";
import { hashUserId } from "../shared/hashUtils.js";
import { enqueueMessage } from "../shared/queue.js";
import { authenticateToken, authorizeUser } from "../middleware/auth.js";
import { db } from "../shared/db.js";


const router = Router();

// Cosmic Weather Endpoint - GET
router.get("/cosmic-weather/:userId", authenticateToken, authorizeUser, async (req, res) => {
    const { userId } = req.params;
    const today = new Date().toISOString().split('T')[0];
    const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
    const userIdHash = hashUserId(userId);
    
    try {
        // Fetch user's language preference and response type preference
        const { rows: prefRows } = await db.query(
            `SELECT language, response_type FROM user_preferences WHERE user_id_hash = $1`,
            [userIdHash]
        );
        const userLanguage = prefRows.length > 0 ? prefRows[0].language : 'en-US';
        const responseType = prefRows.length > 0 ? prefRows[0].response_type : 'full';
        
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
        
        for (const row of rows) {
            const fullContent = row.content_full;
            const briefContent = row.content_brief;
            
            const data = typeof fullContent === 'string' ? JSON.parse(fullContent) : fullContent;
            const dataDate = data.generated_at?.split('T')[0];
            if (dataDate === today) {
                todaysWeather = data;
                briefWeather = briefContent ? (typeof briefContent === 'string' ? JSON.parse(briefContent) : briefContent) : null;
                break;
            }
        }
        
        if (!todaysWeather) {
            return res.status(404).json({ error: 'Generating today\'s cosmic weather...' });
        }
        
        res.json({
            weather: todaysWeather.text,
            brief: briefWeather?.text || null,
            birthChart: todaysWeather.birth_chart,
            currentPlanets: todaysWeather.planets
        });
    } catch (err) {
        console.error('[ASTROLOGY-INSIGHTS] Error fetching cosmic weather:', err);
        res.status(500).json({ error: 'Failed to fetch cosmic weather' });
    }
});

// Cosmic Weather Endpoint - POST (trigger generation)
router.post("/cosmic-weather/:userId", authenticateToken, authorizeUser, async (req, res) => {
    const { userId } = req.params;
    try {
        await enqueueMessage({ userId, message: '[SYSTEM] Generate cosmic weather' });
        res.json({ status: 'Generating today\'s cosmic weather...' });
    } catch (err) {
        console.error('[ASTROLOGY-INSIGHTS] Error queuing cosmic weather:', err);
        res.status(500).json({ error: 'Failed to queue cosmic weather' });
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
            return res.status(404).json({ error: 'Generating lunar nodes insight...' });
        }
        
        const data = typeof rows[0].content === 'string' ? JSON.parse(rows[0].content) : rows[0].content;
        res.json({ insight: data.text, nodes: { north: data.north_node_sign, south: data.south_node_sign } });
    } catch (err) {
        console.error('[ASTROLOGY-INSIGHTS] Error fetching lunar nodes:', err);
        res.status(500).json({ error: 'Failed to fetch lunar nodes' });
    }
});

router.post("/lunar-nodes/:userId", authenticateToken, authorizeUser, async (req, res) => {
    const { userId } = req.params;
    try {
        await enqueueMessage({ userId, message: '[SYSTEM] Generate lunar nodes insight' });
        res.json({ status: 'Generating lunar nodes insight...' });
    } catch (err) {
        console.error('[ASTROLOGY-INSIGHTS] Error queuing lunar nodes:', err);
        res.status(500).json({ error: 'Failed to queue lunar nodes' });
    }
});

// Void of Course Moon Endpoint
router.get("/void-of-course/:userId", authenticateToken, authorizeUser, async (req, res) => {
    const { userId } = req.params;
    const today = new Date().toISOString().split('T')[0];
    const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
    const userIdHash = hashUserId(userId);
    
    try {
        // Fetch user preferences
        const { rows: prefRows } = await db.query(
            `SELECT language, response_type FROM user_preferences WHERE user_id_hash = $1`,
            [userIdHash]
        );
        const userLanguage = prefRows.length > 0 ? prefRows[0].language : 'en-US';
        const responseType = prefRows.length > 0 ? prefRows[0].response_type : 'full';
        
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
            return res.status(404).json({ error: 'Calculating void of course moon...' });
        }
        
        res.json({ 
            is_void: todaysAlert.is_void,
            alert: todaysAlert.text || todaysAlert.message,
            phase: todaysAlert.phase
        });
    } catch (err) {
        console.error('[ASTROLOGY-INSIGHTS] Error fetching void of course:', err);
        res.status(500).json({ error: 'Failed to fetch void of course' });
    }
});

router.post("/void-of-course/:userId", authenticateToken, authorizeUser, async (req, res) => {
    const { userId } = req.params;
    try {
        await enqueueMessage({ userId, message: '[SYSTEM] Generate void of course alert' });
        res.json({ status: 'Checking void of course moon...' });
    } catch (err) {
        console.error('[ASTROLOGY-INSIGHTS] Error queuing void of course:', err);
        res.status(500).json({ error: 'Failed to queue void of course' });
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
            return res.status(404).json({ error: 'Generating moon phase commentary...' });
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
        console.error('[ASTROLOGY-INSIGHTS] Error fetching moon phase:', err);
        res.status(500).json({ error: 'Failed to fetch moon phase' });
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
        console.error('[ASTROLOGY-INSIGHTS] Error queuing moon phase:', err);
        res.status(500).json({ error: 'Failed to queue moon phase' });
    }
});

export default router;
