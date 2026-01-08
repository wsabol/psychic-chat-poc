import { Router } from 'express';
import logger from '../../shared/logger.js';
import { db } from '../../shared/db.js';
import { logAudit } from '../../shared/auditLog.js';
import { 
  reactivateAccountFromReengagement, 
  unsubscribeFromReengagementEmails 
} from '../../jobs/accountCleanupJob.js';

const router = Router();

/**
 * POST /api/account/reactivate
 * Reactivate a deleted account from re-engagement email
 * 
 * This endpoint allows users who requested account deletion to reactivate
 * their account from a link in the re-engagement email.
 */
router.post('/reactivate', async (req, res) => {
  try {
    const { userId, token } = req.body;

    if (!userId || !token) {
      return res.status(400).json({ 
        error: 'userId and token required' 
      });
    }

    // Verify token format (basic check)
    if (!isValidReactivationToken(token)) {
      return res.status(401).json({ 
        error: 'Invalid or expired reactivation token' 
      });
    }

    // Check if account exists and is in pending_deletion status
    const accountCheck = await db.query(
      `SELECT user_id, deletion_status FROM user_personal_info 
       WHERE user_id = $1`,
      [userId]
    );

    if (accountCheck.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Account not found' 
      });
    }

    const account = accountCheck.rows[0];

    if (account.deletion_status !== 'pending_deletion') {
      return res.status(400).json({ 
        error: 'Account is not eligible for reactivation' 
      });
    }

    // Reactivate the account
    const result = await reactivateAccountFromReengagement(userId);

    if (result.success) {
      // Log the reactivation event
      await logAudit(db, {
        userId: userId,
        action: 'ACCOUNT_REACTIVATED',
        resourceType: 'authentication',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        httpMethod: req.method,
        endpoint: req.path,
        status: 'SUCCESS',
        details: { via_reengagement: true }
      });

      return res.json({
        success: true,
        message: 'Your account has been successfully reactivated. You can now log in with your credentials.',
        userId: userId
      });
    } else {
      throw new Error(result.message || 'Failed to reactivate account');
    }

  } catch (error) {
    logger.error('Account reactivation error:', error.message);
    
    // Log failed attempt
    try {
      await logAudit(db, {
        userId: req.body.userId || 'unknown',
        action: 'ACCOUNT_REACTIVATION_FAILED',
        resourceType: 'authentication',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        httpMethod: req.method,
        endpoint: req.path,
        status: 'FAILED',
        details: { error: error.message }
      });
    } catch (auditErr) {
      logger.error('Failed to log reactivation error:', auditErr.message);\n    }\n\n    return res.status(500).json({ \n      error: 'Failed to reactivate account', \n      details: error.message \n    });\n  }\n});\n\n/**\n * POST /api/account/unsubscribe-reengagement\n * Unsubscribe from re-engagement emails\n * \n * This endpoint allows users to opt-out of future re-engagement emails\n * without needing to reactivate their account\n */\nrouter.post('/unsubscribe-reengagement', async (req, res) => {\n  try {\n    const { userId, token } = req.body;\n\n    if (!userId || !token) {\n      return res.status(400).json({ \n        error: 'userId and token required' \n      });\n    }\n\n    // Verify token format (basic check)\n    if (!isValidReactivationToken(token)) {\n      return res.status(401).json({ \n        error: 'Invalid or expired token' \n      });\n    }\n\n    // Unsubscribe from re-engagement emails\n    const result = await unsubscribeFromReengagementEmails(userId);\n\n    if (result.success) {\n      // Log the unsubscribe event\n      await logAudit(db, {\n        userId: userId,\n        action: 'UNSUBSCRIBED_REENGAGEMENT',\n        resourceType: 'preferences',\n        ipAddress: req.ip,\n        userAgent: req.get('user-agent'),\n        httpMethod: req.method,\n        endpoint: req.path,\n        status: 'SUCCESS',\n        details: { unsubscribed_from_reengagement_emails: true }\n      });\n\n      return res.json({\n        success: true,\n        message: 'You have been unsubscribed from re-engagement emails. You will not receive further account reactivation offers.'\n      });\n    } else {\n      throw new Error(result.message || 'Failed to unsubscribe');\n    }\n\n  } catch (error) {\n    logger.error('Unsubscribe reengagement error:', error.message);\n    \n    try {\n      await logAudit(db, {\n        userId: req.body.userId || 'unknown',\n        action: 'UNSUBSCRIBE_REENGAGEMENT_FAILED',\n        resourceType: 'preferences',\n        ipAddress: req.ip,\n        userAgent: req.get('user-agent'),\n        httpMethod: req.method,\n        endpoint: req.path,\n        status: 'FAILED',\n        details: { error: error.message }\n      });\n    } catch (auditErr) {\n      logger.error('Failed to log unsubscribe error:', auditErr.message);\n    }\n\n    return res.status(500).json({ \n      error: 'Failed to unsubscribe', \n      details: error.message \n    });\n  }\n});\n\n/**\n * GET /api/account/deletion-status/:userId\n * Get the deletion status of an account\n * Used for debugging and admin purposes\n */\nrouter.get('/deletion-status/:userId', async (req, res) => {\n  try {\n    const { userId } = req.params;\n\n    const result = await db.query(\n      `SELECT \n        user_id,\n        deletion_status,\n        deletion_requested_at,\n        reengagement_email_6m_sent_at,\n        reengagement_email_1y_sent_at,\n        reengagement_email_unsub,\n        final_deletion_date,\n        (CURRENT_DATE - deletion_requested_at::DATE) as days_since_deletion\n       FROM user_personal_info \n       WHERE user_id = $1`,\n      [userId]\n    );\n\n    if (result.rows.length === 0) {\n      return res.status(404).json({ error: 'Account not found' });\n    }\n\n    const account = result.rows[0];\n\n    return res.json({\n      success: true,\n      account: {\n        user_id: account.user_id,\n        deletion_status: account.deletion_status,\n        deletion_requested_at: account.deletion_requested_at,\n        days_since_deletion: account.days_since_deletion,\n        reengagement_email_6m_sent_at: account.reengagement_email_6m_sent_at,\n        reengagement_email_1y_sent_at: account.reengagement_email_1y_sent_at,\n        reengagement_email_unsub: account.reengagement_email_unsub,\n        final_deletion_date: account.final_deletion_date,\n        note: 'Data is retained for 7 years (2555 days) from deletion request for legal compliance'\n      }\n    });\n\n  } catch (error) {\n    logger.error('Deletion status check error:', error.message);\n    return res.status(500).json({ \n      error: 'Failed to check deletion status', \n      details: error.message \n    });\n  }\n});\n\n/**\n * Validate reactivation token format\n * This is a basic validation - in production use JWT verification\n */\nfunction isValidReactivationToken(token) {\n  // Basic validation - token should be a non-empty string\n  // In production, verify JWT signature or use a secure token system\n  return token && typeof token === 'string' && token.length > 10;\n}\n\nexport default router;\n