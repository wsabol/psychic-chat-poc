/**
 * Script to clear a stale Stripe customer ID for a specific user
 * Usage: node api/clear-stale-customer.js <userId>
 * 
 * This clears the stored customer ID so the system will create a fresh one
 */

import './env-loader.js'; // Load environment variables
import { db } from './shared/db.js';

async function clearStaleCustomer(userId) {
  try {
    if (!userId) {
      console.error('❌ Please provide a userId as argument');
      console.error('Usage: node api/clear-stale-customer.js <userId>');
      process.exit(1);
    }

    // Check if user exists and get current customer ID
    const checkResult = await db.query(
      `SELECT 
        user_id,
        pgp_sym_decrypt(stripe_customer_id_encrypted, $1) as customer_id
       FROM user_personal_info 
       WHERE user_id = $2`,
      [process.env.ENCRYPTION_KEY, userId]
    );

    if (checkResult.rows.length === 0) {
      console.error(`❌ User ${userId} not found in database`);
      process.exit(1);
    }

    const currentCustomerId = checkResult.rows[0].customer_id;
    console.log(`\n📋 Current customer ID for user ${userId}: ${currentCustomerId || '(none)'}`);

    if (!currentCustomerId) {
      console.log('✅ No customer ID to clear - user already has no customer ID set');
      process.exit(0);
    }

    // Clear the stale customer ID
    const updateResult = await db.query(
      `UPDATE user_personal_info 
       SET stripe_customer_id_encrypted = NULL 
       WHERE user_id = $1`,
      [userId]
    );

    if (updateResult.rowCount > 0) {
      console.log(`✅ Successfully cleared stale customer ID ${currentCustomerId}`);
      console.log('   Next time user accesses billing, a fresh customer will be created');
    } else {
      console.error('❌ Failed to update user record');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Error clearing stale customer:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await db.end();
  }
}

// Get userId from command line argument
const userId = process.argv[2];
clearStaleCustomer(userId);
