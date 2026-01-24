/**
 * Secure token generation utilities
 */
import crypto from 'crypto';

/**
 * Generate a secure reactivation token
 * Uses HMAC-SHA256 for better security than simple base64 encoding
 * @param {string} userId - User ID
 * @param {number} expiryHours - Token expiry in hours (default: 72)
 * @returns {string} Secure token
 */
export function generateReactivationToken(userId, expiryHours = 72) {
    const expiresAt = Date.now() + (expiryHours * 60 * 60 * 1000);
    const payload = `${userId}:${expiresAt}`;
    
    // Use a secret key for HMAC (should be in environment variable in production)
    const secret = process.env.TOKEN_SECRET || 'default-secret-change-in-production';
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload);
    const signature = hmac.digest('hex');
    
    // Combine payload and signature
    const token = Buffer.from(`${payload}:${signature}`).toString('base64url');
    return token;
}

/**
 * Verify and decode a reactivation token
 * @param {string} token - Token to verify
 * @returns {Object|null} Decoded token data or null if invalid
 */
export function verifyReactivationToken(token) {
    try {
        const decoded = Buffer.from(token, 'base64url').toString('utf-8');
        const parts = decoded.split(':');
        
        if (parts.length !== 3) {
            return null;
        }
        
        const [userId, expiresAt, receivedSignature] = parts;
        
        // Check expiry
        if (Date.now() > parseInt(expiresAt, 10)) {
            return null;
        }
        
        // Verify signature
        const payload = `${userId}:${expiresAt}`;
        const secret = process.env.TOKEN_SECRET || 'default-secret-change-in-production';
        const hmac = crypto.createHmac('sha256', secret);
        hmac.update(payload);
        const expectedSignature = hmac.digest('hex');
        
        if (receivedSignature !== expectedSignature) {
            return null;
        }
        
        return {
            userId,
            expiresAt: new Date(parseInt(expiresAt, 10))
        };
    } catch (error) {
        return null;
    }
}

/**
 * Generate a random verification code
 * @param {number} length - Code length (default: 6)
 * @returns {string} Numeric code
 */
export function generateVerificationCode(length = 6) {
    const min = Math.pow(10, length - 1);
    const max = Math.pow(10, length) - 1;
    return Math.floor(min + Math.random() * (max - min + 1)).toString();
}
