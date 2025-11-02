import express from 'express';
const router = express.Router();
import { db } from '../shared/db.js';

// Endpoint to get an astrology reading
router.post('/reading', async (req, res) => {
    try {
        const { userId, birthDate, birthTime, birthPlace } = req.body;  // Updated to include birth details
        // Enqueue the job for the worker
        await queue.enqueueJob({ userId, message: 'Astrology reading request', birthDate, birthTime, birthPlace });
        res.json({ status: 'Job enqueued for astrology reading' });
    } catch (error) {
        console.error('Error in astrology reading:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;