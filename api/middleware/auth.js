import { auth } from '../shared/firebase-admin.js';
import logger from '../shared/logger.js';

// Middleware to verify Firebase ID token
export async function authenticateToken(req, res, next) {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }
    
    // Verify Firebase token
    const decodedToken = await auth.verifyIdToken(token);
    req.user = {
      uid: decodedToken.uid,
      userId: decodedToken.uid,
      email: decodedToken.email,
      emailVerified: decodedToken.email_verified
    };
    req.userId = decodedToken.uid;
    
    next();
    } catch (err) {
    // Distinguish between token expired vs other auth errors
    if (err.code === 'auth/id-token-expired') {
      // Token refresh is automatic and expected - no noise logging needed
      return res.status(401).json({ 
        error: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    }
    
    return res.status(403).json({ error: 'Invalid token' });
  }
}

// Middleware to verify user owns the resource they're accessing
export function authorizeUser(req, res, next) {
  const requestedUserId = req.params.userId;
  
  if (req.userId !== requestedUserId) {
    return res.status(403).json({ error: 'Unauthorized: You can only access your own data' });
  }
  
  next();
}
// Stub for compatibility (Firebase handles 2FA differently)
export function verify2FA(req, res, next) {
  // Firebase 2FA is handled by Firebase SDK, not by this middleware
  next();
}

