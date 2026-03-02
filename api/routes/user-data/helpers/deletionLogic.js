/**
 * Deletion Business Logic
 */

import { db } from '../../../shared/db.js';
import { logAudit } from '../../../shared/auditLog.js';
import { logErrorFromCatch } from '../../../shared/errorLogger.js';
import { getAuth } from 'firebase-admin/auth';
import { fetchStripeCustomerId, deleteFromTable, logDeletionAudit, DELETION_TABLES, anonymizeUserPII } from './queries.js';
import { decryptStripeCustomerId } from './dataDecryption.js';

export async function deleteFromFirebase(userId) {
  try {
    const auth = getAuth();
    await auth.deleteUser(userId);
    return { success: true };
  } catch (error) {
    logErrorFromCatch(error, 'user-data', 'delete from firebase');
    return { success: false, error: error.message };
  }
}

export async function deleteFromStripe(userId) {
  try {
    const result = await fetchStripeCustomerId(userId);
    if (result.rows[0]?.stripe_customer_id_encrypted) {
      const decryptedId = await decryptStripeCustomerId(result.rows[0].stripe_customer_id_encrypted);
      if (decryptedId) {
        const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
        await stripe.customers.del(decryptedId);
      }
    }
    return { success: true };
  } catch (error) {
    logErrorFromCatch(error, 'user-data', 'delete from stripe');
    return { success: false, error: error.message };
  }
}

export async function deleteAllUserData(userId, userIdHash) {
  for (const { table, column } of DELETION_TABLES) {
    try {
      const value = column === 'user_id_hash' ? userIdHash : userId;
      await deleteFromTable(table, column, value);
    } catch (e) {
      // Silently continue
    }
  }
}

/**
 * Perform complete account deletion.
 *
 * Two-phase privacy model:
 *   Phase 1 (NOW)      – All PII is immediately anonymized:
 *                          • Firebase account deleted
 *                          • Stripe customer deleted
 *                          • Supporting tables cleared (2FA, sessions, consents, etc.)
 *                          • user_personal_info PII columns NULLed out (anonymizeUserPII)
 *                          • email_hash preserved for legal traceability
 *   Phase 2 (7 years)  – Chat messages are deleted by the account-cleanup Lambda
 *                        after the 7-year legal retention period expires.
 *
 * The chat messages are retained so that, should litigation arise, an admin can
 * hash the plaintiff's email → look up email_hash → find user_id → retrieve messages.
 */
export async function performCompleteAccountDeletion(userId, userIdHash, req) {
  const results = {
    firebase:       { success: false },
    stripe:         { success: false },
    database:       { success: false },
    anonymization:  { success: false },
    audit:          { success: false }
  };

  // Step 1: Delete Firebase account (user can no longer log in)
  results.firebase = await deleteFromFirebase(userId);

  // Step 2: Delete Stripe customer (billing data removed)
  results.stripe = await deleteFromStripe(userId);

  // Step 3: Delete all supporting tables (2FA, consents, preferences, etc.)
  //         NOTE: messages and user_personal_info are intentionally NOT deleted here.
  //         See DELETION_TABLES in queries.js for the full list.
  try {
    await deleteAllUserData(userId, userIdHash);
    results.database = { success: true };
  } catch (error) {
    results.database = { success: false, error: error.message };
  }

  // Step 4: Anonymize PII in user_personal_info (NULL out all encrypted columns).
  //         Preserves the row with user_id + email_hash for 7-year legal retention.
  try {
    await anonymizeUserPII(userId);
    results.anonymization = { success: true };
  } catch (error) {
    logErrorFromCatch(error, 'user-data', 'anonymize PII');
    results.anonymization = { success: false, error: error.message };
  }

  // Step 5: Audit trail
  try {
    await logAudit(db, {
      userId,
      action: 'ACCOUNT_ANONYMIZED',
      resourceType: 'account',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      httpMethod: req.method,
      endpoint: req.path,
      status: 'SUCCESS',
      details: {
        ...results,
        note: 'Chat messages retained for 7-year legal hold; PII anonymized immediately.'
      }
    });
    results.audit = { success: true };
  } catch (error) {
    logErrorFromCatch(error, 'user-data', 'log deletion audit');
    results.audit = { success: false, error: error.message };
  }

  return results;
}
