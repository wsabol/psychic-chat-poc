import { Router } from "express";

import { enqueueMessage } from "../shared/queue.js";
import { authorizeUser } from "../middleware/auth.js";
import { db } from "../shared/db.js";

const router = Router();

// Lunar Nodes Endpoint
router.get("/lunar-nodes/:userId", authorizeUser, async (req, res) => {
    const { userId } = req.params;
    try {
        const { rows } = await db.query(
            `SELECT content FROM messages WHERE user_id = $1 AND role = 'lunar_nodes' ORDER BY created_at DESC LIMIT 1`,
            [userId]
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

router.post("/lunar-nodes/:userId", authorizeUser, async (req, res) => {
    const { userId } = req.params;
    try {
        await enqueueMessage({ userId, message: '[SYSTEM] Generate lunar nodes insight' });
        res.json({ status: 'Generating lunar nodes insight...' });
    } catch (err) {
        console.error('[ASTROLOGY-INSIGHTS] Error queuing lunar nodes:', err);
        res.status(500).json({ error: 'Failed to queue lunar nodes' });
    }
});

// Cosmic Weather Endpoint
router.get("/cosmic-weather/:userId", authorizeUser, async (req, res) => {
    const { userId } = req.params;
    const today = new Date().toISOString().split('T')[0];
    try {
        const { rows } = await db.query(
            `SELECT content FROM messages WHERE user_id = $1 AND role = 'cosmic_weather' ORDER BY created_at DESC LIMIT 5`,
            [userId]
        );
        
        let todaysWeather = null;
        for (const row of rows) {
            const data = typeof row.content === 'string' ? JSON.parse(row.content) : row.content;
            if (data.date === today) {
                todaysWeather = data;
                break;
            }
        }
        
        if (!todaysWeather) {
            return res.status(404).json({ error: 'Generating today\'s cosmic weather...' });
        }
        
        res.json({ weather: todaysWeather.text, transits: todaysWeather.transits, prompt: todaysWeather.prompt, birthChart: todaysWeather.birthChart, currentPlanets: todaysWeather.currentPlanets, moonPhase: todaysWeather.moonPhase });
    } catch (err) {
        console.error('[ASTROLOGY-INSIGHTS] Error fetching cosmic weather:', err);
        res.status(500).json({ error: 'Failed to fetch cosmic weather' });
    }
});

router.post("/cosmic-weather/:userId", authorizeUser, async (req, res) => {
    const { userId } = req.params;
    try {
        await enqueueMessage({ userId, message: '[SYSTEM] Generate cosmic weather' });
        res.json({ status: 'Generating today\'s cosmic weather...' });
    } catch (err) {
        console.error('[ASTROLOGY-INSIGHTS] Error queuing cosmic weather:', err);
        res.status(500).json({ error: 'Failed to queue cosmic weather' });
    }
});

// Void of Course Moon Endpoint
router.get("/void-of-course/:userId", authorizeUser, async (req, res) => {
    const { userId } = req.params;
    const today = new Date().toISOString().split('T')[0];
    try {
        const { rows } = await db.query(
            `SELECT content FROM messages WHERE user_id = $1 AND role = 'void_of_course' ORDER BY created_at DESC LIMIT 5`,
            [userId]
        );
        
        let todaysAlert = null;
        for (const row of rows) {
            const data = typeof row.content === 'string' ? JSON.parse(row.content) : row.content;
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

router.post("/void-of-course/:userId", authorizeUser, async (req, res) => {
    const { userId } = req.params;
    try {
        await enqueueMessage({ userId, message: '[SYSTEM] Generate void of course alert' });
        res.json({ status: 'Checking void of course moon...' });
    } catch (err) {
        console.error('[ASTROLOGY-INSIGHTS] Error queuing void of course:', err);
        res.status(500).json({ error: 'Failed to queue void of course' });
    }
});

// Retrogrades Calendar (static data for now)
router.get("/retrogrades", (req, res) => {
    const retrogrades = [
        { planet: "Mercury", start: "2025-01-15", end: "2025-02-03", icon: "☿️" },
        { planet: "Mercury", start: "2025-05-14", end: "2025-06-08", icon: "☿️" },
        { planet: "Mercury", start: "2025-09-09", end: "2025-10-03", icon: "☿️" },
        { planet: "Venus", start: "2025-12-25", end: "2026-02-02", icon: "♀" },
        { planet: "Mars", start: "2025-06-16", end: "2025-08-23", icon: "♂" },
        { planet: "Jupiter", start: "2025-10-04", end: "2026-02-06", icon: "♃" },
    ];
    res.json({ retrogrades });
});

export default router;
