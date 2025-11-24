import express from "express";
import fs from "fs";
import https from "https";
import chatRoutes from "./routes/chat.js";
import userProfileRoutes from "./routes/user-profile.js";
import astrologyRoutes from "./routes/astrology.js";
import horoscopeRoutes from "./routes/horoscope.js";
import moonPhaseRoutes from "./routes/moon-phase.js";
import astrologyInsightsRoutes from "./routes/astrology-insights.js";
import authRoutes from "./routes/auth.js";
import { authenticateToken } from "./middleware/auth.js";
import cors from "cors";

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;  // Added definition
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

// Protected routes (authentication required)
app.use("/chat", authenticateToken, chatRoutes);
app.use("/user-profile", authenticateToken, userProfileRoutes);
app.use("/user-astrology", authenticateToken, astrologyRoutes);
app.use("/horoscope", authenticateToken, horoscopeRoutes);
app.use("/moon-phase", authenticateToken, moonPhaseRoutes);
app.use("/astrology-insights", authenticateToken, astrologyInsightsRoutes);

let server;
if (fs.existsSync('./certificates/key.pem') && fs.existsSync('./certificates/cert.pem')) {
    const options = {
        key: fs.readFileSync('./certificates/key.pem'),
        cert: fs.readFileSync('./certificates/cert.pem')
    };
    server = https.createServer(options, app);
    server.listen(PORT, () => {
        console.log(`API listening securely on port ${PORT}`);
    });
} else {
    console.warn('Certificates not found; starting HTTP server for development. This is not secure for production!');
    server = app.listen(PORT, () => {
        console.log(`API listening on HTTP port ${PORT}`);
    });
}
