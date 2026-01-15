import dotenv from "dotenv";
dotenv.config();

import express from "express";
import fs from "fs";
import https from "https";
import helmet from "helmet";
import logger from "./shared/logger.js";
import chatRoutes from "./routes/chat.js";
import userProfileRoutes from "./routes/user-profile.js";
import astrologyRoutes from "./routes/astrology.js";
import horoscopeRoutes from "./routes/horoscope.js";
import moonPhaseRoutes from "./routes/moon-phase.js";
import astrologyInsightsRoutes from "./routes/astrology-insights.js";
import authRoutes from "./routes/auth-firebase.js";
import consentRoutes from "./routes/consent.js";
import userDataRoutes from "./routes/user-data/index.js";
import cleanupRoutes from "./routes/cleanup.js";
import securityRoutes from "./routes/security.js";
import billingRoutes from "./routes/billing/index.js";
import webhooksRouter from "./routes/billing/webhooks.js";
import migrationRoutes from "./routes/migration.js";
import helpRoutes from "./routes/help.js";
import analyticsRoutes from "./routes/analytics.js";
import violationReportsRoutes from "./routes/violationReports.js";
import userSettingsRoutes from "./routes/user-settings.js";
import complianceDashboardRoutes from "./routes/admin/compliance-dashboard.js";
import { authenticateToken } from "./middleware/auth.js";
import { validateUserHash } from "./middleware/userHashValidation.js";
import cors from "cors";
import cleanupStatusRoutes from "./routes/cleanup-status.js";
import responseStatusRoutes from "./routes/response-status.js";
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
            // ✅ FIXED: Allow localhost for development AND Stripe API for production
            connectSrc: [
                "'self'",
                "http://localhost:3000",       // API in development
                "http://localhost:3001",       // Client in development
                "https:",
                "https://m.stripe.network",    // Stripe fraud detection
                "https://m.stripe.com",         // Stripe API
                "https://stripe.com",           // Stripe API
                "https://api.stripe.com",       // Stripe API
                "https://q.stripe.com",         // Stripe analytics
            ],
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

// IMPORTANT: Parse webhooks as raw body BEFORE express.json()
// Stripe requires raw body for signature verification
app.use("/webhooks", webhooksRouter);

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

// Public analytics route (no authentication required - truly anonymous)
app.use("/analytics", analyticsRoutes);

// Violation reports (admin only)
app.use("/violations", authenticateToken, violationReportsRoutes);

// Compliance dashboard (admin only)
app.use("/admin", authenticateToken, complianceDashboardRoutes);

// New user data endpoints (authentication only - no validateUserHash)
// These don't have user IDs in the URL
app.use("/user/download-data", authenticateToken, userDataRoutes);
app.use("/user/send-delete-verification", authenticateToken, userDataRoutes);
app.use("/user/delete-account", authenticateToken, userDataRoutes);

// Protected routes (authentication + user hash validation required)
// validateUserHash ensures hashed user IDs in URLs match the authenticated user
app.use("/chat", authenticateToken, validateUserHash, chatRoutes);
app.use("/user-profile", authenticateToken, validateUserHash, userProfileRoutes);
app.use("/user", authenticateToken, validateUserHash, userDataRoutes);
app.use("/user-astrology", authenticateToken, validateUserHash, astrologyRoutes);
app.use("/horoscope", authenticateToken, validateUserHash, horoscopeRoutes);
app.use("/moon-phase", authenticateToken, validateUserHash, moonPhaseRoutes);
app.use("/astrology-insights", authenticateToken, validateUserHash, astrologyInsightsRoutes);

app.use("/security", authenticateToken, validateUserHash, securityRoutes);

// Response status routes (authentication + user hash validation required)
app.use("/response-status", authenticateToken, validateUserHash, responseStatusRoutes);

// User settings routes (authentication + user hash validation required)
app.use("/user-settings", authenticateToken, validateUserHash, userSettingsRoutes);

// Help routes (authentication required)
app.use("/help", authenticateToken, helpRoutes);

// Billing routes: authenticateToken only (no validateUserHash - no user ID in URL)
// Webhooks endpoint is /webhooks/stripe-webhook (public, no auth required)
app.use("/billing", authenticateToken, billingRoutes);



// Initialize scheduled jobs (DISABLED - causing startup hang)
// initializeScheduler();

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
        console.log(`🔐 Psychic Chat API listening on HTTPS port ${PORT}`);
    });
    server.on('error', (err) => {
        console.error(`❌ HTTPS Server Error: ${err.message}`);
        if (err.code === 'EADDRINUSE') {
            console.error(`❌ Port ${PORT} is already in use`);
        }
        process.exit(1);
    });
} else {
    server = app.listen(PORT, () => {
        console.log(`✅ Psychic Chat API listening on HTTP port ${PORT}`);
    });
    server.on('error', (err) => {
        console.error(`❌ Server Error: ${err.message}`);
        if (err.code === 'EADDRINUSE') {
            console.error(`❌ Port ${PORT} is already in use`);
        }
        process.exit(1);
    });
}

// Daily cleanup of old temp accounts (disabled - can be called via HTTP endpoint instead)
// setInterval(async () => {
//     try {
//         const res = await fetch(`http://localhost:${PORT}/cleanup/cleanup-old-temp-accounts`, { method: 'DELETE' });
// }, 24 * 60 * 60 * 1000);

export default app;
export { logger };

