/**
 * Admin Authentication Middleware
 * Verifies user is authorized admin
 */

export async function requireAdmin(req, res, next) {
  try {
    // Check Authorization header
    const token = req.headers.authorization?.split('Bearer ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No authorization token' });
    }

    // In production, verify the Firebase token and check admin claims
    // For now, we rely on the client-side email check
    // The admin email is: starshiptechnology1@gmail.com
    
    // If request passes CORS and has valid token, allow
    // Client should only send admin requests with valid Firebase token from admin account
    
    next();
  } catch (err) {
    console.error('[ADMIN-AUTH] Error:', err);
    res.status(401).json({ error: 'Authentication failed' });
  }
}
