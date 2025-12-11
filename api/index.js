import express from "express";
import fs from "fs";
import https from "https";
import helmet from "helmet";
import chatRoutes from "./routes/chat.js";
import userProfileRoutes from "./routes/user-profile.js";
import astrologyRoutes from "./routes/astrology.js";
import horoscopeRoutes from "./routes/horoscope.js";
import moonPhaseRoutes from "./routes/moon-phase.js";
import astrologyInsightsRoutes from "./routes/astrology-insights.js";
import authRoutes from "./routes/auth-firebase.js";
import consentRoutes from "./routes/consent.js";
import userDataRoutes from "./routes/user-data.js";
import cleanupRoutes from "./routes/cleanup.js";
import migrationRoutes from "./routes/migration.js";
import securityRoutes from "./routes/security.js";
import billingRoutes from "./routes/billing.js";
import { authenticateToken } from "./middleware/auth.js";
import cors from "cors";
import cleanupStatusRoutes from "./routes/cleanup-status.js";
import { initializeScheduler } from "./jobs/scheduler.js";
import { validateRequestPayload, rateLimit } from "./middleware/inputValidation.js";
import { errorHandler } from "./middleware/errorHandler.js";

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const app = express();

// Security: Apply helmet middleware first (sets many secure headers automatically)
app.use(helmet({
    // Configure helmet options
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            fontSrc: ["'self'", "data:"],
            connectSrc: ["'self'", "https:"],
            frameSrc: ["'none'"],  // Prevent embedding in iframes
            objectSrc: ["'none'"],
            upgradeInsecureRequests: []
        }
    },
    frameguard: { action: 'DENY' },  // X-Frame-Options: DENY
    noSniff: true,                   // X-Content-Type-Options: nosniff
    xssFilter: true,                 // X-XSS-Protection: 1; mode=block
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    hsts: {
        maxAge: 31536000,            // 1 year
        includeSubDomains: true,
        preload: true
    }
}));

// Allow client at 3001. Adjust as needed or use an env var.
app.use(cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3001",
    credentials: true,
}));

app.use(express.json());

// Phase 5: Input validation & rate limiting (EARLY in middleware chain)
app.use(validateRequestPayload);
app.use(rateLimit({}, 1000, 60000));  // 1000 requests per minute

// Additional custom security headers (beyond helmet)
app.use((req, res, next) => {
    // Prevent clients from caching sensitive data
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    // Prevent DNS prefetching (privacy)
    res.setHeader('X-DNS-Prefetch-Control', 'off');
    
    // Remove X-Powered-By header (don't advertise framework)
    res.removeHeader('X-Powered-By');
    
    next();
});

// Welcome route
app.get('/', (req, res) => {
    res.json({ message: 'Welcome to the Psychic Chat API' });
});

// Public auth routes (no authentication required)
app.use("/auth", authRoutes);
app.use("/auth", consentRoutes);
app.use("/cleanup", cleanupRoutes);
app.use("/cleanup", cleanupStatusRoutes);
app.use("/migration", migrationRoutes);

// Protected routes (authentication required)
app.use("/chat", authenticateToken, chatRoutes);
app.use("/user-profile", authenticateToken, userProfileRoutes);
app.use("/user", authenticateToken, userDataRoutes);
app.use("/user-astrology", authenticateToken, astrologyRoutes);
app.use("/horoscope", authenticateToken, horoscopeRoutes);
app.use("/moon-phase", authenticateToken, moonPhaseRoutes);
app.use("/astrology-insights", authenticateToken, astrologyInsightsRoutes);

app.use("/security", authenticateToken, securityRoutes);
app.use("/billing", authenticateToken, billingRoutes);

// Initialize scheduled jobs
initializeScheduler();

// Phase 5: Safe error handling (LATE in middleware chain - after all routes)
app.use(errorHandler);

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
        console.log(`[API] Server listening on port ${PORT}`);
    });
}

// Daily cleanup of old temp accounts (disabled - can be called via HTTP endpoint instead)
// setInterval(async () => {
//     try {
//         const res = await fetch(`http://localhost:${PORT}/cleanup/cleanup-old-temp-accounts`, { method: 'DELETE' });
//     } catch (e) { console.error('[CLEANUP] Error:', e.message); }
// }, 24 * 60 * 60 * 1000);
