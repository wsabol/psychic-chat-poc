/**
 * Data Decryption Utilities
 */

import { db, ENCRYPTION_KEY } from './queries.js';

export async function decryptStripeCustomerId(encryptedId) {
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
