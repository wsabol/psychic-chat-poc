/**
 * Account deletion utilities
 * Handles Firebase deletion, Stripe cleanup, database deletion, and notifications
 */

import { db, ENCRYPTION_KEY, DELETION_TABLES, deleteFromTable, logDeletionAudit } from './queries.js';
import { logAudit } from '../../../shared/auditLog.js';
import { getAuth } from 'firebase-admin/auth';

/**
 * Send account deletion verification email
 * TODO: Implement with your email service (AWS SES, SendGrid, etc.)
 */
export async function sendDeleteVerificationEmail(email, code) {
  console.log(`[EMAIL] Delete verification code sent to ${email}: ${code}`);
  // Example with SendGrid:
  // await sgMail.send({
  //   to: email,
  //   from: process.env.SENDGRID_FROM_EMAIL,
  //   subject: 'Confirm Account Deletion',
  //   html: `Your verification code is: <strong>${code}</strong><br>Code expires in 10 minutes.`
  // });
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
    console.error('[DELETE-ACCOUNT] Firebase deletion failed:', error.message);
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
    console.error('[DELETE-ACCOUNT] Stripe deletion failed:', error.message);
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
    console.error('[DECRYPT] Failed to decrypt Stripe customer ID:', error.message);
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
      console.error(`[DELETE-DATA] Failed to delete from ${table}:`, error.message);
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
    console.error('[AUDIT]', error.message);
    results.audit = { success: false, error: error.message };
  }

  return results;
}
