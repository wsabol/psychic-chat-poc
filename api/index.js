import express from "express";
import fs from "fs";
import https from "https";
import chatRoutes from "./routes/chat.js";
import userProfileRoutes from "./routes/user-profile.js";
import astrologyRoutes from "./routes/astrology.js";
import horoscopeRoutes from "./routes/horoscope.js";
import moonPhaseRoutes from "./routes/moon-phase.js";
import astrologyInsightsRoutes from "./routes/astrology-insights.js";
import authRoutes from "./routes/auth-firebase.js";
import cleanupRoutes from "./routes/cleanup.js";
import migrationRoutes from "./routes/migration.js";
import { authenticateToken } from "./middleware/auth.js";
import cors from "cors";

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const app = express();

// Allow client at 3001. Adjust as needed or use an env var.
app.use(cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3001",
    credentials: true,
}));

app.use(express.json());

// Welcome route
app.get('/', (req, res) => {
    res.json({ message: 'Welcome to the Psychic Chat API' });
});

// Public auth routes (no authentication required)
app.use("/auth", authRoutes);
app.use("/cleanup", cleanupRoutes);

// Protected routes (authentication required)
app.use("/chat", authenticateToken, chatRoutes);
app.use("/user-profile", authenticateToken, userProfileRoutes);
app.use("/user-astrology", authenticateToken, astrologyRoutes);
app.use("/horoscope", authenticateToken, horoscopeRoutes);
app.use("/moon-phase", authenticateToken, moonPhaseRoutes);
app.use("/astrology-insights", authenticateToken, astrologyInsightsRoutes);
app.use("/migration", authenticateToken, migrationRoutes);

let server;
if (fs.existsSync('./certificates/key.pem') && fs.existsSync('./certificates/cert.pem')) {
    const options = {
        key: fs.readFileSync('./certificates/key.pem'),
        cert: fs.readFileSync('./certificates/cert.pem')
    };
    server = https.createServer(options, app);
    server.listen(PORT, () => {
    });
} else {
    console.warn('Certificates not found; starting HTTP server for development. This is not secure for production!');
    server = app.listen(PORT, () => {
    });
}

// Daily cleanup of old temp accounts
setInterval(async () => {
    try {
        const res = await fetch(`http://localhost:${PORT}/cleanup/cleanup-old-temp-accounts`, { method: 'DELETE' });
    } catch (e) { console.error('[CLEANUP] Error:', e.message); }
}, 24 * 60 * 60 * 1000);
