import { Router } from 'express';
import { db } from '../../shared/db.js';
import { hashUserId, hashIpAddress } from '../../shared/hashUtils.js';
import { authenticateToken } from '../../middleware/auth.js';
import { logErrorFromCatch } from '../../shared/errorLogger.js';
import { ENCRYPTION_KEY } from '../../shared/encryptionUtils.js';

const router = Router();

// Admin-only emails
const ADMIN_EMAILS = ['starshiptechnology1@gmail.com', 'wsabol39@gmail.com'];

/**
 * Middleware to check if user is admin
 */
function requireAdmin(req, res, next) {
  const userEmail = req.user?.email;
  if (!ADMIN_EMAILS.includes(userEmail?.toLowerCase())) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

/**
 * GET /admin/whitelist
 * Get all whitelisted IP addresses
 */
router.get('/whitelist', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id, ip_address_hash, device_name, browser_info, user_id_hash, 
              is_active, added_at, last_used_at 
       FROM free_trial_whitelist 
       WHERE is_active = TRUE AND removed_at IS NULL
       ORDER BY added_at DESC`
    );

    return res.json({ 
      success: true, 
      whitelist: rows,
      count: rows.length
    });
  } catch (err) {
    logErrorFromCatch('[WHITELIST] Error fetching whitelist', err);
    return res.status(500).json({ error: 'Failed to fetch whitelist' });
  }
});

/**
 * POST /admin/whitelist/add
 * Add IP address to whitelist
 * Body: { ipAddress, description }
 */
router.post('/whitelist/add', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { ipAddress, description } = req.body;
    
    if (!ipAddress) {
      return res.status(400).json({ error: 'IP address required' });
    }

    const ipHash = hashIpAddress(ipAddress);
    const userIdHash = hashUserId(req.user.uid);
    
    // Get device/browser info from request
    const userAgent = req.headers['user-agent'] || 'Unknown';
    const deviceName = description || 'Admin Device';
    const browserInfo = userAgent.substring(0, 255); // Truncate to fit column

    // Check if already whitelisted (active entries only)
    const existing = await db.query(
      `SELECT id FROM free_trial_whitelist 
       WHERE ip_address_hash = $1 AND is_active = TRUE AND removed_at IS NULL`,
      [ipHash]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'IP address already whitelisted' });
    }

    // Add to whitelist with encryption
    const result = await db.query(
      `INSERT INTO free_trial_whitelist 
       (ip_address_hash, ip_address_encrypted, device_name, browser_info, 
        user_id_hash, is_active, added_at, last_used_at)
       VALUES ($1, pgp_sym_encrypt($2, $3), $4, $5, $6, TRUE, NOW(), NOW())
       RETURNING id, ip_address_hash, device_name, browser_info, user_id_hash, 
                 is_active, added_at, last_used_at`,
      [ipHash, ipAddress, ENCRYPTION_KEY, deviceName, browserInfo, userIdHash]
    );

    return res.json({
      success: true,
      message: 'IP address whitelisted successfully',
      whitelist: result.rows[0]
    });
  } catch (err) {
    logErrorFromCatch('[WHITELIST] Error adding to whitelist', err);
    return res.status(500).json({ error: 'Failed to add to whitelist' });
  }
});

/**
 * DELETE /admin/whitelist/:id
 * Remove IP address from whitelist (soft delete)
 */
router.delete('/whitelist/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Soft delete: set is_active = FALSE and removed_at = NOW()
    const result = await db.query(
      `UPDATE free_trial_whitelist 
       SET is_active = FALSE, removed_at = NOW() 
       WHERE id = $1 AND is_active = TRUE 
       RETURNING id, ip_address_hash`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Whitelist entry not found or already removed' });
    }

    return res.json({
      success: true,
      message: 'IP address removed from whitelist',
      removed: result.rows[0]
    });
  } catch (err) {
    logErrorFromCatch('[WHITELIST] Error removing from whitelist', err);
    return res.status(500).json({ error: 'Failed to remove from whitelist' });
  }
});

/**
 * GET /admin/whitelist/current-ip
 * Get current admin's IP address (for easy whitelisting)
 */
router.get('/whitelist/current-ip', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const clientIp = req.headers['x-client-ip'] || 
                     req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
                     req.connection.remoteAddress ||
                     req.socket.remoteAddress ||
                     'Unknown';

    const ipHash = hashIpAddress(clientIp);

    // Check if already whitelisted (active only)
    const existing = await db.query(
      `SELECT id FROM free_trial_whitelist 
       WHERE ip_address_hash = $1 AND is_active = TRUE AND removed_at IS NULL`,
      [ipHash]
    );

    return res.json({
      success: true,
      ipAddress: clientIp,
      ipHash: ipHash,
      isWhitelisted: existing.rows.length > 0
    });
  } catch (err) {
    logErrorFromCatch('[WHITELIST] Error getting current IP', err);
    return res.status(500).json({ error: 'Failed to get current IP' });
  }
});

export default router;
