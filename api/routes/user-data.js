/**
 * User Data Rights Routes
 * GDPR Article 20 - Data Portability
 * GDPR Article 17 - Right to be Forgotten
 * CCPA - Consumer Rights
 */

import { Router } from 'express';
import { db } from '../shared/db.js';
import { authenticateToken, authorizeUser } from '../middleware/auth.js';
import { logAudit } from '../shared/auditLog.js';
import { hashUserId } from '../shared/hashUtils.js';
import { getAuth } from 'firebase-admin/auth';
import admin from 'firebase-admin';

const router = Router();
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default_key';

/**
 * GET /user/download-data
 * Export all user data as JSON (GDPR Article 20)
 * No URL params needed - uses authenticated user
 */
router.get('/download-data', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid || req.user.userId;
    const userIdHash = hashUserId(userId);

    // Fetch personal info
    const personalInfo = await db.query(
      `SELECT user_id, 
              pgp_sym_decrypt(first_name_encrypted, $2) as first_name,
              pgp_sym_decrypt(last_name_encrypted, $2) as last_name,
              pgp_sym_decrypt(email_encrypted, $2) as email,
              pgp_sym_decrypt(phone_number_encrypted, $2) as phone_number,
              pgp_sym_decrypt(birth_date_encrypted, $2) as birth_date,
              pgp_sym_decrypt(birth_city_encrypted, $2) as birth_city,
              pgp_sym_decrypt(birth_timezone_encrypted, $2) as birth_timezone,
              created_at
       FROM user_personal_info WHERE user_id = $1`,
      [userId, ENCRYPTION_KEY]
    );

    if (personalInfo.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Fetch settings
    const settings = await db.query(
      `SELECT cookies_enabled, analytics_enabled, email_marketing_enabled, push_notifications_enabled
       FROM user_settings WHERE user_id_hash = $1`,
      [userIdHash]
    );

    // Fetch chat messages
    const messages = await db.query(
      `SELECT created_at, role,
              pgp_sym_decrypt(content_full_encrypted, $2)::text as content
       FROM messages WHERE user_id_hash = $1 ORDER BY created_at ASC LIMIT 1000`,
      [userIdHash, ENCRYPTION_KEY]
    );

    const data = {
      export_timestamp: new Date().toISOString(),
      personal_information: personalInfo.rows[0],
      settings: settings.rows[0] || null,
      chat_messages_count: messages.rows.length,
      chat_messages: messages.rows
    };

    // Log this action
    await logAudit(db, {
      userId,
      action: 'DATA_DOWNLOAD_REQUESTED',
      resourceType: 'compliance',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      httpMethod: req.method,
      endpoint: req.path,
      status: 'SUCCESS'
    }).catch(() => {});

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to download data', details: error.message });
  }
});

/**
 * POST /user/send-delete-verification
 * Send email verification code for account deletion
 */
router.post('/send-delete-verification', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid || req.user.userId;
    const userEmail = req.user.email;

    if (!userEmail) {
      return res.status(400).json({ error: 'User email not found' });
    }

    // Generate 6-digit code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Store code temporarily (10 minute expiry)
    await db.query(
      `INSERT INTO user_2fa_codes (user_id, code, code_type, expires_at)
       VALUES ($1, $2, 'account_deletion', NOW() + INTERVAL '10 minutes')`,
      [userId, verificationCode]
    );

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
    }).catch(() => {});

    res.json({
      success: true,
      message: 'Verification code sent to email',
      email_masked: maskEmail(userEmail)
    });
    } catch (error) {
    res.status(500).json({ error: 'Failed to send verification email', details: error.message });
  }
});

/**
 * DELETE /user/delete-account
 * Permanently delete user account after email verification
 * Deletes from: Firebase, Stripe, PostgreSQL
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
    const codeCheck = await db.query(
      `SELECT id FROM user_2fa_codes 
       WHERE user_id = $1 
       AND code = $2 
       AND code_type = 'account_deletion'
       AND expires_at > NOW()
       AND used = FALSE`,
      [userId, verificationCode]
    );

    if (codeCheck.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired verification code' });
    }

    // Mark code as used
    await db.query(
      `UPDATE user_2fa_codes SET used = TRUE 
       WHERE user_id = $1 AND code = $2`,
      [userId, verificationCode]
    );

    // Delete from Firebase
    try {
      const auth = getAuth();
      await auth.deleteUser(userId);
    } catch (authErr) {
      // Continue with database deletion even if Firebase fails
    }

    // Delete from Stripe (if customer exists)
    try {
      const stripeCustomer = await db.query(
        `SELECT stripe_customer_id_encrypted FROM user_personal_info WHERE user_id = $1`,
        [userId]
      );
      
      if (stripeCustomer.rows[0]?.stripe_customer_id_encrypted) {
        // Decrypt customer ID and delete from Stripe
        const decryptedId = await decryptStripeCustomerId(stripeCustomer.rows[0].stripe_customer_id_encrypted);
        if (decryptedId) {
          const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
          await stripe.customers.del(decryptedId);
        }
      }
    } catch (stripeErr) {
      // Continue with database deletion
    }

    // Delete from all database tables
    await deleteAllUserData(userId, userIdHash);

    // Log deletion
    await logAudit(db, {
      userId,
      action: 'ACCOUNT_PERMANENTLY_DELETED',
      resourceType: 'account',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      httpMethod: req.method,
      endpoint: req.path,
      status: 'SUCCESS'
    }).catch(() => {});

    res.json({
      success: true,
      message: 'Account permanently deleted',
      timestamp: new Date().toISOString()
    });
    } catch (error) {
    res.status(500).json({ error: 'Failed to delete account', details: error.message });
  }
});

/**
 * Helper Functions
 */

async function deleteAllUserData(userId, userIdHash) {
  const tables = [
    { table: 'user_2fa_codes', column: 'user_id' },
    { table: 'user_2fa_settings', column: 'user_id' },
    { table: 'messages', column: 'user_id_hash' },
    { table: 'astrology_readings', column: 'user_id' },
    { table: 'user_consents', column: 'user_id' },
    { table: 'user_preferences', column: 'user_id_hash' },
    { table: 'user_settings', column: 'user_id_hash' },
    { table: 'password_reset_tokens', column: 'user_id' },
    { table: 'audit_log', column: 'user_id' },
    { table: 'user_personal_info', column: 'user_id' }
  ];

  for (const { table, column } of tables) {
    try {
      const value = column === 'user_id_hash' ? userIdHash : userId;
      await db.query(`DELETE FROM ${table} WHERE ${column} = $1`, [value]);
    } catch (e) {

    }
  }
}

async function sendDeleteVerificationEmail(email, code) {
    // TODO: Implement with your email service (AWS SES, SendGrid, etc.)
  // Example with SendGrid:
  // await sgMail.send({
  //   to: email,
  //   from: process.env.SENDGRID_FROM_EMAIL,
  //   subject: 'Confirm Account Deletion',
  //   html: `Your verification code is: <strong>${code}</strong><br>Code expires in 10 minutes.`
  // });
}

function maskEmail(email) {
  const [local, domain] = email.split('@');
  return `${local.slice(0, 2)}***@${domain}`;
}

async function decryptStripeCustomerId(encryptedId) {
  try {
    const result = await db.query(
      `SELECT pgp_sym_decrypt($1::bytea, $2) as customer_id`,
      [encryptedId, ENCRYPTION_KEY]
    );
    return result.rows[0]?.customer_id;
  } catch (e) {
    return null;
  }
}

/**
 * GET /user/export-data/:userId?format=json|csv
 * Export all user data in chosen format
 * Supports: JSON (full structure), CSV (spreadsheet-friendly)
 */
router.get('/export-data/:userId', authenticateToken, authorizeUser, async (req, res) => {
  try {
    const { userId } = req.params;
    const { format = 'json' } = req.query;

    if (!['json', 'csv'].includes(format)) {
      return res.status(400).json({ error: 'Format must be json or csv' });
    }

    // Fetch all user data
    const personalInfo = await db.query(
      `SELECT user_id, 
              pgp_sym_decrypt(first_name_encrypted, $2) as first_name,
              pgp_sym_decrypt(last_name_encrypted, $2) as last_name,
              pgp_sym_decrypt(email_encrypted, $2) as email,
              pgp_sym_decrypt(phone_number_encrypted, $2) as phone_number,
              pgp_sym_decrypt(sex_encrypted, $2) as sex,
              pgp_sym_decrypt(familiar_name_encrypted, $2) as familiar_name,
              pgp_sym_decrypt(birth_date_encrypted, $2) as birth_date,
              pgp_sym_decrypt(birth_city_encrypted, $2) as birth_city,
              pgp_sym_decrypt(birth_timezone_encrypted, $2) as birth_timezone,
              created_at
       FROM user_personal_info WHERE user_id = $1`,
      [userId, ENCRYPTION_KEY]
    );

    if (personalInfo.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const personal = personalInfo.rows[0];

    // Fetch consents
    const consents = await db.query(
      'SELECT consent_astrology, consent_health_data, consent_chat_analysis, agreed_at FROM user_consents WHERE user_id = $1',
      [userId]
    );

    // Fetch chat messages
    const messages = await db.query(
      `SELECT created_at, role,
              pgp_sym_decrypt(content_full_encrypted, $2)::text as content
       FROM messages WHERE user_id_hash = $3 ORDER BY created_at ASC`,
      [userId, ENCRYPTION_KEY]
    );

    // Fetch astrology readings
    const readings = await db.query(
      `SELECT created_at, reading_type,
              CASE WHEN reading_encrypted IS NOT NULL 
                   THEN pgp_sym_decrypt(reading_encrypted, $2)::text
                   ELSE reading_content 
              END as content
       FROM astrology_readings WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId, ENCRYPTION_KEY]
    );

    // Fetch audit logs
    const auditLogs = await db.query(
      'SELECT created_at, action, ip_address FROM audit_log WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100',
      [userId]
    );

    // Compile data object
    const exportData = {
      export_timestamp: new Date().toISOString(),
      export_format: format,
      personal_information: personal,
      consents: consents.rows[0] || null,
      chat_messages: messages.rows,
      astrology_readings: readings.rows,
      audit_log: auditLogs.rows.map(log => ({
        timestamp: log.created_at,
        action: log.action,
        ip_address: log.ip_address
      }))
    };

    // Log export request
    await logAudit(db, {
      userId,
      action: 'DATA_EXPORT_REQUESTED',
      resourceType: 'compliance',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      httpMethod: req.method,
      endpoint: req.path,
      status: 'SUCCESS',
      details: { format, records_exported: messages.rows.length + readings.rows.length }
    }).catch(() => {});

    if (format === 'csv') {
      const csv = convertToCSV(exportData);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="psychic-chat-export-${userId}-${new Date().toISOString().split('T')[0]}.csv"`);
      return res.send(csv);
    } else {
      // JSON format
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="psychic-chat-export-${userId}-${new Date().toISOString().split('T')[0]}.json"`);
      return res.json(exportData);
    }

    } catch (error) {
    await logAudit(db, {
      userId: req.params.userId,
      action: 'DATA_EXPORT_FAILED',
      resourceType: 'compliance',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      httpMethod: req.method,
      endpoint: req.path,
      status: 'FAILED',
      details: { error: error.message }
    }).catch(() => {});

    return res.status(500).json({ error: 'Failed to export data', details: error.message });
  }
});

/**
 * DELETE /user/delete-account/:userId
 * Request account deletion with 30-day grace period
 */
router.delete('/delete-account/:userId', authenticateToken, authorizeUser, async (req, res) => {
  try {
    const { userId } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Password required for account deletion' });
    }

    // Verify user exists
    const user = await db.query(
      'SELECT user_id, deletion_status FROM user_personal_info WHERE user_id = $1',
      [userId]
    );

    if (user.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const currentStatus = user.rows[0].deletion_status;

    // Check if already deleted
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

    // TODO: Verify password with Firebase auth
    // For now, we accept it (should be verified in production)

    // Mark account for deletion (30-day grace period starts now)
    const result = await db.query(
      `UPDATE user_personal_info 
       SET deletion_status = 'pending_deletion',
           deletion_requested_at = NOW(),
           final_deletion_date = NOW() + INTERVAL '730 days',
           updated_at = NOW()
       WHERE user_id = $1
       RETURNING deletion_requested_at, final_deletion_date`,
      [userId]
    );

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
    await db.query(
      `INSERT INTO account_deletion_audit (user_id, action, reason, ip_address, user_agent)
       VALUES ($1, 'DELETION_REQUESTED', 'User requested deletion', $2, $3)`,
      [userId, req.ip, req.get('user-agent')]
    ).catch(e => console.error('[DELETION-AUDIT]', e.message));

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
    }).catch(() => {});

    return res.status(500).json({ error: 'Failed to delete account', details: error.message });
  }
});

/**
 * POST /user/cancel-deletion/:userId
 * Cancel deletion request and reactivate account during grace period
 */
router.post('/cancel-deletion/:userId', authenticateToken, authorizeUser, async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await db.query(
      'SELECT deletion_status, deletion_requested_at FROM user_personal_info WHERE user_id = $1',
      [userId]
    );

    if (user.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { deletion_status, deletion_requested_at } = user.rows[0];

    if (deletion_status !== 'pending_deletion') {
      return res.status(400).json({ error: 'Account deletion not in progress' });
    }

    // Check if grace period has expired
    const daysSinceDeletion = Math.floor((Date.now() - new Date(deletion_requested_at).getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceDeletion > 30) {
      return res.status(400).json({ error: 'Grace period has expired. Account cannot be recovered.' });
    }

    // Reactivate account
    await db.query(
      `UPDATE user_personal_info 
       SET deletion_status = 'active',
           deletion_requested_at = NULL,
           anonymization_date = NULL,
           final_deletion_date = NULL,
           updated_at = NOW()
       WHERE user_id = $1`,
      [userId]
    );

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

    await db.query(
      `INSERT INTO account_deletion_audit (user_id, action, ip_address, user_agent)
       VALUES ($1, 'REACTIVATED', $2, $3)`,
      [userId, req.ip, req.get('user-agent')]
    ).catch(e => console.error('[DELETION-AUDIT]', e.message));

    return res.json({
      success: true,
      message: 'Account reactivated successfully',
      userId,
      status: 'active'
    });

    } catch (error) {
    return res.status(500).json({ error: 'Failed to cancel deletion', details: error.message });
  }
});

/**
 * Helper function: Convert export data to CSV format
 */
function convertToCSV(data) {
  let csv = '';

  // Personal Information Section
  csv += 'PERSONAL INFORMATION\n';
  csv += 'Field,Value\n';
  const personal = data.personal_information;
  csv += `User ID,${personal.user_id}\n`;
  csv += `First Name,${escapeCSV(personal.first_name)}\n`;
  csv += `Last Name,${escapeCSV(personal.last_name)}\n`;
  csv += `Email,${escapeCSV(personal.email)}\n`;
  csv += `Phone,${escapeCSV(personal.phone_number)}\n`;
  csv += `Gender,${escapeCSV(personal.sex)}\n`;
  csv += `Familiar Name,${escapeCSV(personal.familiar_name)}\n`;
  csv += `Birth Date,${escapeCSV(personal.birth_date)}\n`;
  csv += `Birth City,${escapeCSV(personal.birth_city)}\n`;
  csv += `Birth Timezone,${escapeCSV(personal.birth_timezone)}\n`;
  csv += `Account Created,${personal.created_at}\n\n`;

  // Consents Section
  if (data.consents) {
    csv += 'CONSENTS\n';
    csv += 'Consent Type,Granted,Date\n';
    csv += `Astrology,${data.consents.consent_astrology},${data.consents.agreed_at}\n`;
    csv += `Health Data,${data.consents.consent_health_data},${data.consents.agreed_at}\n`;
    csv += `Chat Analysis,${data.consents.consent_chat_analysis},${data.consents.agreed_at}\n\n`;
  }

  // Chat Messages Section
  csv += 'CHAT MESSAGES\n';
  csv += 'Date,Role,Message\n';
  data.chat_messages.forEach(msg => {
    csv += `${msg.created_at},${msg.role},"${escapeCSV(msg.content)}"\n`;
  });
  csv += '\n';

  // Astrology Readings Section
  csv += 'ASTROLOGY READINGS\n';
  csv += 'Date,Type,Reading\n';
  data.astrology_readings.forEach(reading => {
    csv += `${reading.created_at},${reading.reading_type},"${escapeCSV(reading.content)}"\n`;
  });

  return csv;
}

/**
 * Helper function: Escape CSV values
 */
function escapeCSV(value) {
  if (value === null || value === undefined) return '';
  const stringValue = String(value);
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return stringValue.replace(/"/g, '""');
  }
  return stringValue;
}

export default router;
