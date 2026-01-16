/**
 * Account deletion utilities
 * Handles Firebase deletion, Stripe cleanup, database deletion, and notifications
 */

import { db, ENCRYPTION_KEY, DELETION_TABLES, deleteFromTable, logDeletionAudit } from './queries.js';
import { logAudit } from '../../../shared/auditLog.js';
import { getAuth } from 'firebase-admin/auth';

/**
 * Send account deletion verification email with 6-digit code
 * Falls back to logging in development if SendGrid not configured
 */
export async function sendDeleteVerificationEmail(email, code) {
  try {
    // Check if SendGrid API key is configured
    if (!process.env.SENDGRID_API_KEY) {
      return { success: true, email, note: 'Code logged to console (development mode - SendGrid not configured)' };
    }

    // Import SendGrid dynamically
    const sgMail = (await import('@sendgrid/mail')).default;
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
            .header { text-align: center; color: #333; margin-bottom: 30px; }
            .code-box { background: #f9f9f9; border: 2px solid #7c63d8; padding: 20px; text-align: center; border-radius: 6px; margin: 30px 0; }
            .code { font-size: 48px; letter-spacing: 10px; font-weight: bold; color: #d32f2f; font-family: monospace; }
            .warning { background: #ffebee; border-left: 4px solid #d32f2f; padding: 15px; margin: 20px 0; color: #c62828; }
            .footer { color: #999; font-size: 12px; text-align: center; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Confirm Account Deletion</h1>
              <p>We've received a request to delete your account</p>
            </div>
            <p>Enter this verification code to confirm the deletion of your account:</p>
            <div class="code-box">
              <div class="code">${code}</div>
              <p style="color: #666; margin-top: 10px;">This code expires in 10 minutes</p>
            </div>
            <div class="warning">
              <strong>⚠️ Important:</strong> This will permanently delete your account and all associated data including:
              <ul style="margin: 10px 0; padding-left: 20px;">
                <li>Your profile and personal information</li>
                <li>Payment methods and billing history</li>
                <li>All reading and chat history</li>
              </ul>
              This action cannot be undone.
            </div>
            <p style="color: #666;">
              If you did not request this, please ignore this email. Your account will not be deleted without your verification code.
            </p>
            <div class="footer">
              <p>Do not share this code with anyone. Psychic never asks for this code via email.</p>
              <p>&copy; 2025 Psychic. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await sgMail.send({
      to: email,
      from: process.env.SENDGRID_FROM_EMAIL || 'noreply@psychic-chat.com',
      subject: 'Confirm Your Account Deletion Request',
      html: emailHtml,
      text: `Your account deletion verification code is: ${code}\n\nThis code expires in 10 minutes. Do not share this code with anyone.`
    });

    return { success: true, email };
  } catch (error) {
    logErrorFromCatch(error, 'app', 'email');
    throw new Error(`Failed to send verification email: ${error.message}`);
  }
}

/**
 * Mask email for display (privacy)
 */
export function maskEmail(email) {
  const [local, domain] = email.split('@');
  return `${local.slice(0, 2)}***@${domain}`;
}

/**
 * Generate 6-digit verification code
 */
export function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Delete user from Firebase Authentication
 */
export async function deleteFromFirebase(userId) {
  try {
    const auth = getAuth();
    await auth.deleteUser(userId);
    return { success: true };
  } catch (error) {
    logErrorFromCatch(error, 'app', 'delete account');
    return { success: false, error: error.message };
  }
}

/**
 * Delete user from Stripe (if customer exists)
 */
export async function deleteFromStripe(userId) {
  try {
    const result = await db.query(
      `SELECT stripe_customer_id_encrypted FROM user_personal_info WHERE user_id = $1`,
      [userId]
    );

    if (result.rows[0]?.stripe_customer_id_encrypted) {
      const decryptedId = await decryptStripeCustomerId(result.rows[0].stripe_customer_id_encrypted);
      if (decryptedId) {
        const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
        await stripe.customers.del(decryptedId);
      }
    }
    return { success: true };
  } catch (error) {
    logErrorFromCatch(error, 'app', 'delete account');
    return { success: false, error: error.message };
  }
}

/**
 * Decrypt Stripe customer ID
 */
export async function decryptStripeCustomerId(encryptedId) {
  try {
    const result = await db.query(
      `SELECT pgp_sym_decrypt($1::bytea, $2) as customer_id`,
      [encryptedId, ENCRYPTION_KEY]
    );
    return result.rows[0]?.customer_id;
  } catch (error) {
    logErrorFromCatch(error, 'app', 'decrypt');
    return null;
  }
}

/**
 * Delete all user data from all database tables
 */
export async function deleteAllUserData(userId, userIdHash) {
  for (const { table, column } of DELETION_TABLES) {
    try {
      const value = column === 'user_id_hash' ? userIdHash : userId;
      await deleteFromTable(table, column, value);
    } catch (error) {
      logErrorFromCatch(error, 'app', 'delete data');
    }
  }
}

/**
 * Perform complete account deletion (Firebase + Stripe + Database)
 */
export async function performCompleteAccountDeletion(userId, userIdHash, req) {
  const results = {
    firebase: { success: false },
    stripe: { success: false },
    database: { success: false },
    audit: { success: false }
  };

  // Delete from Firebase
  results.firebase = await deleteFromFirebase(userId);

  // Delete from Stripe
  results.stripe = await deleteFromStripe(userId);

  // Delete from database
  try {
    await deleteAllUserData(userId, userIdHash);
    results.database = { success: true };
  } catch (error) {
    results.database = { success: false, error: error.message };
  }

  // Log deletion
  try {
    await logAudit(db, {
      userId,
      action: 'ACCOUNT_PERMANENTLY_DELETED',
      resourceType: 'account',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      httpMethod: req.method,
      endpoint: req.path,
      status: 'SUCCESS',
      details: results
    });
    results.audit = { success: true };
  } catch (error) {
    logErrorFromCatch(error, 'app', 'audit');
    results.audit = { success: false, error: error.message };
  }

  return results;
}

