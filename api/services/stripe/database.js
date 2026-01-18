import { db } from '../../shared/db.js';

export async function storeSubscriptionData(userId, stripeSubscriptionId, subscriptionData) {
  try {
    if (!process.env.ENCRYPTION_KEY) {
      throw new Error('ENCRYPTION_KEY not configured!');
    }

    const query = `UPDATE user_personal_info SET 
      stripe_subscription_id_encrypted = pgp_sym_encrypt($1, $2),
      subscription_status = $3,
      current_period_start = $4,
      current_period_end = $5,
      plan_name = $6,
      price_amount = $7,
      price_interval = $8
      WHERE user_id = $9`;

    const result = await db.query(query, [
      stripeSubscriptionId,
      process.env.ENCRYPTION_KEY,
      'active',
      subscriptionData.current_period_start,
      subscriptionData.current_period_end,
      subscriptionData.plan_name || null,
      subscriptionData.price_amount || null,
      subscriptionData.price_interval || null,
      userId
    ]);
    return result;
  } catch (error) {
    logErrorFromCatch(error, 'app', 'stripe');
    throw error;
  }
}

export async function getStoredSubscriptionData(userId) {
  try {
    if (!process.env.ENCRYPTION_KEY) {
      throw new Error('ENCRYPTION_KEY not configured!');
    }

    const query = `SELECT 
      pgp_sym_decrypt(stripe_subscription_id_encrypted, $1) as stripe_subscription_id,
      subscription_status,
      current_period_start,
      current_period_end,
      plan_name,
      price_amount,
      price_interval
      FROM user_personal_info WHERE user_id = $2`;

    const result = await db.query(query, [process.env.ENCRYPTION_KEY, userId]);

    if (result.rows.length === 0 || !result.rows[0].stripe_subscription_id) {
      return null;
    }

    return result.rows[0];
  } catch (error) {
    logErrorFromCatch(error, 'app', 'stripe');
    return null;
  }
}

export async function updateSubscriptionStatus(userId, statusUpdate) {
  try {
    if (!process.env.ENCRYPTION_KEY) {
      throw new Error('ENCRYPTION_KEY not configured!');
    }

    const query = `UPDATE user_personal_info SET 
      subscription_status = $1,
      current_period_start = $2,
      current_period_end = $3
      WHERE user_id = $4`;

    const result = await db.query(query, [
      statusUpdate.status,
      statusUpdate.current_period_start,
      statusUpdate.current_period_end,
      userId
    ]);
    return result;
  } catch (error) {
    logErrorFromCatch(error, 'app', 'stripe');
    throw error;
  }
}
