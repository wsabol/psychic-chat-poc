/**
 * Free Trial Whitelist Routes
 * Admin endpoints for managing IP whitelist
 */

import { Router } from 'express';
import { authenticateToken } from '../../middleware/auth.js';
import { requireAdmin } from '../../middleware/adminAuth.js';
import { extractClientIp, isValidIpAddress, sanitizeDescription } from '../../shared/ipUtils.js';
import { 
  getAllWhitelistedIps, 
  addIpToWhitelist, 
  removeIpFromWhitelist,
  getWhitelistStatus 
} from '../../services/whitelistService.js';

const router = Router();

/**
 * GET /admin/whitelist
 * Get all whitelisted IP addresses
 */
router.get('/whitelist', authenticateToken, requireAdmin, async (req, res) => {
  const result = await getAllWhitelistedIps();
  
  if (!result.success) {
    return res.status(500).json({ 
      error: result.error,
      code: result.code 
    });
  }

  return res.json({ 
    success: true, 
    whitelist: result.whitelist,
    count: result.count
  });
});

/**
 * POST /admin/whitelist/add
 * Add IP address to whitelist
 * Body: { ipAddress, description }
 */
router.post('/whitelist/add', authenticateToken, requireAdmin, async (req, res) => {
  const { ipAddress, description } = req.body;
  
  // Validate IP address
  if (!ipAddress) {
    return res.status(400).json({ 
      error: 'IP address required',
      code: 'IP_REQUIRED'
    });
  }

  if (!isValidIpAddress(ipAddress)) {
    return res.status(400).json({ 
      error: 'Invalid IP address format',
      code: 'INVALID_IP'
    });
  }

  // Get device/browser info from request
  const userAgent = req.headers['user-agent'] || 'Unknown';
  const deviceName = sanitizeDescription(description) || 'Admin Device';
  const browserInfo = userAgent.substring(0, 255); // Truncate to fit column

  // Add to whitelist
  const result = await addIpToWhitelist({
    ipAddress,
    deviceName,
    browserInfo,
    userId: req.user.uid
  });

  if (!result.success) {
    const statusCode = result.code === 'ALREADY_WHITELISTED' ? 400 : 500;
    return res.status(statusCode).json({ 
      error: result.error,
      code: result.code
    });
  }

  return res.json({
    success: true,
    message: 'IP address whitelisted successfully',
    whitelist: result.whitelist
  });
});

/**
 * DELETE /admin/whitelist/:id
 * Remove IP address from whitelist (soft delete)
 */
router.delete('/whitelist/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ 
      error: 'Whitelist ID required',
      code: 'ID_REQUIRED'
    });
  }

  const result = await removeIpFromWhitelist(id);

  if (!result.success) {
    const statusCode = result.code === 'NOT_FOUND' ? 404 : 500;
    return res.status(statusCode).json({ 
      error: result.error,
      code: result.code
    });
  }

  return res.json({
    success: true,
    message: 'IP address removed from whitelist',
    removed: result.removed
  });
});

/**
 * GET /admin/whitelist/current-ip
 * Get current admin's IP address (for easy whitelisting)
 */
router.get('/whitelist/current-ip', authenticateToken, requireAdmin, async (req, res) => {
  const clientIp = extractClientIp(req);

  const result = await getWhitelistStatus(clientIp);

  if (!result.success) {
    return res.status(500).json({ 
      error: result.error,
      code: result.code
    });
  }

  return res.json({
    success: true,
    ipAddress: result.ipAddress,
    ipHash: result.ipHash,
    isWhitelisted: result.isWhitelisted
  });
});

export default router;
