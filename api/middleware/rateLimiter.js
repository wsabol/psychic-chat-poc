import rateLimit from 'express-rate-limit';

// Login attempt limiter (5 attempts per 15 minutes)
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,      // 15 minutes
  max: 5,                         // 5 requests max
  message: 'Too many login attempts. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV === 'test',  // Skip in test mode
  keyGenerator: (req) => req.body.email || req.ip   // Rate limit by email address
});

// Chat message limiter (30 messages per minute)
export const chatLimiter = rateLimit({
  windowMs: 60 * 1000,            // 1 minute
  max: 30,                        // 30 messages max
  message: 'Too many messages. Please wait before sending another.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV === 'test',
  keyGenerator: (req) => req.userId  // Rate limit by authenticated user ID
});

// General API limiter (100 requests per minute per IP)
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,            // 1 minute
  max: 100,                       // 100 requests max
  message: 'Too many API requests. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV === 'test'
});

// Strict limiter for sensitive operations (10 per hour)
export const sensitiveLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,       // 1 hour
  max: 10,                        // 10 requests max
  message: 'Too many sensitive operations. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV === 'test',
  keyGenerator: (req) => req.userId
});
