import jwt from 'jsonwebtoken';
import { logAudit } from '../shared/authUtils.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-change-in-production';

// Generate JWT token for a user
// If requires2FA is true, token expires in 10 minutes (for 2FA verification)
// Otherwise, token expires in 24 hours (normal session)
export function generateToken(userId, requires2FA = false) {
  const expiresIn = requires2FA ? '10m' : '24h';
  return jwt.sign(
    { userId, requires2FA },
    JWT_SECRET,
    { expiresIn }
  );
}

// Generate refresh token for longer-lived sessions
export function generateRefreshToken(userId) {
  return jwt.sign(
    { userId },
    JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );
}

// Middleware to verify JWT token
export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.userId = decoded.userId;
    req.requires2FA = decoded.requires2FA || false;
    next();
  });
}

// Middleware to verify user owns the resource they're accessing
export function authorizeUser(req, res, next) {
  const requestedUserId = req.params.userId;
  
  if (req.userId !== requestedUserId) {
    return res.status(403).json({ error: 'Unauthorized: You can only access your own data' });
  }
  
  next();
}

// Middleware to verify user has completed 2FA (if required)
export function verify2FA(req, res, next) {
  if (req.requires2FA === true) {
    return res.status(403).json({ error: 'Two-factor authentication required' });
  }
  next();
}
