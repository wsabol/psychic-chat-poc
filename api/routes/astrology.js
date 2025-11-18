import express from 'express';
const router = express.Router();
import { db } from '../shared/db.js';
import { enqueueMessage } from '../shared/queue.js';

// Endpoint to trigger astrology calculation by enqueueing a worker job
// MUST come before /:userId routes to match first
router.post('/calculate/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        console.log(`[API] Enqueueing astrology calculation job for user ${userId}`);
        
        // Enqueue a special message that triggers calculation
        await enqueueMessage({ 
            userId, 
            message: '[SYSTEM] Calculate my rising sign and moon sign based on my birth information.'
        });
        
        res.json({ status: 'Astrology calculation job enqueued', userId });
    } catch (error) {
        console.error('Error enqueueing astrology calculation:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

// Get user astrology information
router.get("/:userId", async (req, res) => {
    const { userId } = req.params;
    try {
        const { rows } = await db.query(
            "SELECT zodiac_sign, astrology_data FROM user_astrology WHERE user_id = $1",
            [userId]
        );
        if (rows.length === 0) {
            return res.status(404).json({ error: 'No astrology data found for this user' });
        }
        
        const result = rows[0];
        // Parse astrology_data if it's a string (shouldn't be, but just in case)
        if (typeof result.astrology_data === 'string') {
            result.astrology_data = JSON.parse(result.astrology_data);
        }
        
        res.json(result);
    } catch (err) {
        console.error('Error fetching astrology info:', err);
        res.status(500).json({ error: 'Failed to fetch astrology information' });
    }
});

// Update astrology data with rising sign, moon sign, or other calculated values
router.post("/:userId", async (req, res) => {
    const { userId } = req.params;
    const { risingSign, moonSign, astrology_data } = req.body;
    
    try {
        // Get existing astrology data
        const { rows } = await db.query(
            "SELECT astrology_data FROM user_astrology WHERE user_id = $1",
            [userId]
        );
        
        if (rows.length === 0) {
            return res.status(404).json({ error: 'No astrology data found for this user' });
        }
        
        let existingData = rows[0].astrology_data;
        if (typeof existingData === 'string') {
            existingData = JSON.parse(existingData);
        }
        
        // Merge new data with existing data
        const updatedData = { ...existingData };
        if (risingSign) updatedData.risingSign = risingSign;
        if (moonSign) updatedData.moonSign = moonSign;
        if (astrology_data) {
            Object.assign(updatedData, astrology_data);
        }
        
        // Update the database
        await db.query(
            "UPDATE user_astrology SET astrology_data = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2",
            [JSON.stringify(updatedData), userId]
        );
        
        res.json({ success: true, message: "Astrology data updated successfully", data: updatedData });
    } catch (err) {
        console.error('Error updating astrology data:', err);
        res.status(500).json({ error: 'Failed to update astrology data' });
    }
});

// Endpoint to trigger astrology calculation by enqueueing a worker job
router.post('/calculate/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        console.log(`[API] Enqueueing astrology calculation job for user ${userId}`);
        
        // Enqueue a special message that triggers calculation
        await enqueueMessage({ 
            userId, 
            message: '[SYSTEM] Calculate my rising sign and moon sign based on my birth information.'
        });
        
        res.json({ status: 'Astrology calculation job enqueued', userId });
    } catch (error) {
        console.error('Error enqueueing astrology calculation:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

export default router;