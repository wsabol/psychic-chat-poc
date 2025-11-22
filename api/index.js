import express from "express";
import chatRoutes from "./routes/chat.js";
import userProfileRoutes from "./routes/user-profile.js";
import astrologyRoutes from "./routes/astrology.js";
import authRoutes from "./routes/auth.js";
import { authenticateToken } from "./middleware/auth.js";
import { apiLimiter, chatLimiter } from "./middleware/rateLimiter.js";
import cors from "cors";
import redis from "./shared/redis.js";

const app = express();

// Allow client at 3001. Adjust as needed or use an env var.
app.use(cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3001",
    credentials: true,
}));

app.use(express.json());

// Apply general API rate limiting
app.use(apiLimiter);

// Welcome route
app.get('/', (req, res) => {
    res.json({ message: 'Welcome to the Psychic Chat API' });
});

// Public auth routes (no authentication required)
app.use("/auth", authRoutes);

// Public astrology routes (no authentication required for public endpoints)
app.get("/user-astrology/moon-phase", async (req, res) => {
    try {
        const cachedMoonPhase = await redis.get('current:moon-phase');
        if (cachedMoonPhase) {
            res.json(JSON.parse(cachedMoonPhase));
        } else {
            res.status(503).json({ error: 'Moon phase data not yet available', details: 'Worker is calculating...' });
        }
    } catch (error) {
        console.error('Error getting moon phase:', error);
        res.status(500).json({ error: 'Failed to get moon phase', details: error.message });
    }
});

// Protected routes (authentication required)
app.use("/chat", authenticateToken, chatLimiter, chatRoutes);
app.use("/user-profile", authenticateToken, userProfileRoutes);
app.use("/user-astrology", authenticateToken, astrologyRoutes);

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
app.listen(PORT, () => {
    console.log(`API listening on port ${PORT}`);
});
