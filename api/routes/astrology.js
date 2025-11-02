import express from 'express';
const router = express.Router();
import { db } from '../shared/db.js';

// Endpoint to get an astrology reading
router.post('/reading', async (req, res) => {
    try {
        const { userId, zodiacSign } = req.body;
        // Placeholder logic for astrology reading
        const reading = {
            sign: zodiacSign || 'Aries',
            horoscope: 'Today is a day for new opportunities and personal growth.'
        };
        // Store reading in database
        await db.query('INSERT INTO astrology_readings (user_id, sign, horoscope) VALUES ($1, $2, $3)', [userId, reading.sign, reading.horoscope]);
        res.json(reading);
    } catch (error) {
        console.error('Error in astrology reading:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;