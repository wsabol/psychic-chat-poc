import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-change-in-production';

/**
 * Generate access token (expires in 15 minutes)
 */
export function generateToken(userId, isTempFor2FA = false) {
  const expiresIn = isTempFor2FA ? '10m' : '15m';
  return jwt.sign(
    { userId, isTempFor2FA },
    JWT_SECRET,
    { expiresIn }
  );
}

/**
 * Generate refresh token (expires in 7 days)
 */
export function generateRefreshToken(userId) {
  return jwt.sign(
    { userId },
    JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );
}

/**
 * Verify access token
 */
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

/**
 * Verify refresh token
 */
export function verifyRefreshToken(token) {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET);
  } catch (err) {
    return null;
  }
}
