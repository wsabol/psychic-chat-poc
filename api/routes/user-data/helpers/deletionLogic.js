/**
 * Deletion Business Logic
 */

import { db } from '../../../shared/db.js';
import { logAudit } from '../../../shared/auditLog.js';
import { logErrorFromCatch } from '../../../shared/errorLogger.js';
import { getAuth } from 'firebase-admin/auth';
import { fetchStripeCustomerId, deleteFromTable, logDeletionAudit, DELETION_TABLES } from './queries.js';
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

export async function performCompleteAccountDeletion(userId, userIdHash, req) {
  const results = {
    firebase: { success: false },
    stripe: { success: false },
    database: { success: false },
    audit: { success: false }
  };

  results.firebase = await deleteFromFirebase(userId);
  results.stripe = await deleteFromStripe(userId);

  try {
    await deleteAllUserData(userId, userIdHash);
    results.database = { success: true };
  } catch (error) {
    results.database = { success: false, error: error.message };
  }

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
    logErrorFromCatch(error, 'user-data', 'log deletion audit');
    results.audit = { success: false, error: error.message };
  }

  return results;
}
