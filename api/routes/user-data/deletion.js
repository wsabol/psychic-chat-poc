/**
 * Account Deletion Routes
 * GDPR Article 17 - Right to be Forgotten
 * CCPA - Consumer Rights
 * 
 * POST   /send-delete-verification  - Send verification code via email
 * DELETE /delete-account            - Permanent deletion with verification code
 * DELETE /delete-account/:userId    - Request deletion with 30-day grace period
 * POST   /cancel-deletion/:userId   - Cancel pending deletion during grace period
 */

import { Router } from 'express';
import { authenticateToken, authorizeUser } from '../../middleware/auth.js';
import { logAudit } from '../../shared/auditLog.js';
import { hashUserId } from '../../shared/hashUtils.js';
import { db } from '../../shared/db.js';
import {
  fetchDeletionCode,
  storeDeletionCode,
  markCodeAsUsed,
  fetchDeletionStatus,
  markAccountForDeletion,
  reactivateDeletionAccount,
  logDeletionAudit
} from './helpers/queries.js';
import {
  sendDeleteVerificationEmail,
  maskEmail,
  generateVerificationCode,
  performCompleteAccountDeletion
} from './helpers/deletionHelper.js';

const router = Router();

/**
 * POST /user/send-delete-verification
 * Send email verification code for permanent account deletion
 * Requires authentication (current user)
 */
router.post('/send-delete-verification', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid || req.user.userId;
    const userEmail = req.user.email;

    if (!userEmail) {
      return res.status(400).json({ error: 'User email not found' });
    }

    // Generate 6-digit code
    const verificationCode = generateVerificationCode();

    // Store code temporarily (10 minute expiry)
    await storeDeletionCode(userId, verificationCode);

    // Send verification email
    await sendDeleteVerificationEmail(userEmail, verificationCode);

    // Log action
    await logAudit(db, {
      userId,
      action: 'ACCOUNT_DELETION_VERIFICATION_SENT',
      resourceType: 'account',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      httpMethod: req.method,
      endpoint: req.path,
      status: 'SUCCESS'
    }).catch(e => console.error('[AUDIT]', e.message));

    res.json({
      success: true,
      message: 'Verification code sent to email',
      email_masked: maskEmail(userEmail)
    });
  } catch (error) {
    console.error('[SEND-DELETE-VERIFICATION]', error);
    res.status(500).json({ error: 'Failed to send verification email', details: error.message });
  }
});

/**
 * DELETE /user/delete-account
 * Permanently delete user account after email verification
 * Requires: verification code (sent to email)
 */
router.delete('/delete-account', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid || req.user.userId;
    const { verificationCode } = req.body;
    const userIdHash = hashUserId(userId);

    if (!verificationCode) {
      return res.status(400).json({ error: 'Verification code required' });
    }

    // Verify code
    const codeCheck = await fetchDeletionCode(userId, verificationCode);
    if (codeCheck.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired verification code' });
    }

    // Mark code as used
    await markCodeAsUsed(userId, verificationCode);

    // Perform complete deletion (Firebase + Stripe + Database)
    const results = await performCompleteAccountDeletion(userId, userIdHash, req);

    res.json({
      success: true,
      message: 'Account permanently deleted',
      timestamp: new Date().toISOString(),
      details: results
    });
  } catch (error) {
    console.error('[DELETE-ACCOUNT]', error);
    res.status(500).json({ error: 'Failed to delete account', details: error.message });
  }
});

/**
 * DELETE /user/delete-account/:userId
 * Request account deletion with 30-day grace period
 * Can be cancelled within 30 days
 */
router.delete('/delete-account/:userId', authorizeUser, async (req, res) => {
  try {
    const { userId } = req.params;

    // Verify user exists and get current status
    const user = await fetchDeletionStatus(userId);
    if (user.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const currentStatus = user.rows[0].deletion_status;

    // Check if already permanently deleted
    if (currentStatus === 'deleted') {
      return res.status(400).json({ error: 'Account already permanently deleted' });
    }

    // Check if already pending deletion
    if (currentStatus === 'pending_deletion') {
      return res.status(400).json({
        error: 'Account deletion already in progress',
        message: 'Your account is scheduled for deletion. Contact support to cancel.'
      });
    }

    // Mark account for deletion (30-day grace period)
    const result = await markAccountForDeletion(userId);
    const deletionRecord = result.rows[0];

    // Log deletion request
    await logAudit(db, {
      userId,
      action: 'ACCOUNT_DELETION_REQUESTED',
      resourceType: 'account',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      httpMethod: req.method,
      endpoint: req.path,
      status: 'SUCCESS',
      details: {
        grace_period_end: new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        final_deletion_date: deletionRecord.final_deletion_date
      }
    });

    // Log to deletion audit table
    await logDeletionAudit(userId, 'DELETION_REQUESTED', req.ip, req.get('user-agent'))
      .catch(e => console.error('[DELETION-AUDIT]', e.message));

    const graceEndDate = new Date();
    graceEndDate.setDate(graceEndDate.getDate() + 30);

    return res.json({
      success: true,
      message: 'Account deletion requested',
      userId,
      status: 'pending_deletion',
      grace_period_ends: graceEndDate.toISOString(),
      message_detail: `Your account will be permanently deleted on ${new Date(deletionRecord.final_deletion_date).toISOString().split('T')[0]} unless you log in to cancel the deletion within 30 days.`
    });
  } catch (error) {
    console.error('[DELETE] Error deleting account:', error);
    await logAudit(db, {
      userId: req.params.userId,
      action: 'ACCOUNT_DELETION_FAILED',
      resourceType: 'account',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      httpMethod: req.method,
      endpoint: req.path,
      status: 'FAILED',
      details: { error: error.message }
    }).catch(e => console.error('[AUDIT]', e.message));

    return res.status(500).json({ error: 'Failed to delete account', details: error.message });
  }
});

/**
 * POST /user/cancel-deletion/:userId
 * Cancel deletion request and reactivate account during grace period
 */
router.post('/cancel-deletion/:userId', authorizeUser, async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await fetchDeletionStatus(userId);
    if (user.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { deletion_status, deletion_requested_at } = user.rows[0];

    if (deletion_status !== 'pending_deletion') {
      return res.status(400).json({ error: 'Account deletion not in progress' });
    }

    // Check if grace period has expired
    const daysSinceDeletion = Math.floor(
      (Date.now() - new Date(deletion_requested_at).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSinceDeletion > 30) {
      return res.status(400).json({ error: 'Grace period has expired. Account cannot be recovered.' });
    }

    // Reactivate account
    await reactivateDeletionAccount(userId);

    // Log reactivation
    await logAudit(db, {
      userId,
      action: 'ACCOUNT_REACTIVATED',
      resourceType: 'account',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      httpMethod: req.method,
      endpoint: req.path,
      status: 'SUCCESS',
      details: { days_since_deletion: daysSinceDeletion }
    });

    await logDeletionAudit(userId, 'REACTIVATED', req.ip, req.get('user-agent'))
      .catch(e => console.error('[DELETION-AUDIT]', e.message));

    return res.json({
      success: true,
      message: 'Account reactivated successfully',
      userId,
      status: 'active'
    });
  } catch (error) {
    console.error('[CANCEL-DELETE] Error canceling deletion:', error);
    return res.status(500).json({ error: 'Failed to cancel deletion', details: error.message });
  }
});

export default router;
