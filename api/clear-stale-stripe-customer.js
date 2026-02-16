/**
 * Clear Stale Stripe Customer ID
 * 
 * Run this script to clear stale Stripe customer IDs from your database
 * This fixes "No such customer" errors when Stripe customer IDs don't match
 * between test/production mode or have been deleted
 * 
 * Usage: node clear-stale-stripe-customer.js <user_email>
 */

import pg from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: './api/.env' });

const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

async function clearStaleCustomer(email) {
  const client = await pool.connect();
  
  try {
    console.log(`\n🔍 Looking for user with email: ${email}\n`);
    
    // Find user by email
    const userResult = await client.query(
      `SELECT 
        user_id,
        pgp_sym_decrypt(email_encrypted, $1) as email,
        pgp_sym_decrypt(stripe_customer_id_encrypted, $1) as customer_id
       FROM user_personal_info 
       WHERE pgp_sym_decrypt(email_encrypted, $1) = $2`,
      [process.env.ENCRYPTION_KEY, email]
    );
    
    if (userResult.rows.length === 0) {
      console.log('❌ User not found with that email');
      return;
    }
    
    const user = userResult.rows[0];
    console.log(`✅ Found user: ${user.user_id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Current Stripe Customer ID: ${user.customer_id || '(none)'}`);
    
    if (!user.customer_id) {
      console.log('\n✅ No customer ID to clear. User can create a new one on next payment attempt.\n');
      return;
    }
    
    // Clear the customer ID
    console.log(`\n🧹 Clearing stale customer ID: ${user.customer_id}`);
    
    await client.query(
      `UPDATE user_personal_info 
       SET stripe_customer_id_encrypted = NULL 
       WHERE user_id = $1`,
      [user.user_id]
    );
    
    console.log('✅ Cleared stale Stripe customer ID successfully!\n');
    console.log('Next steps:');
    console.log('1. Log in to your app');
    console.log('2. Try adding a payment method again');
    console.log('3. A new Stripe customer will be created automatically\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Get email from command line
const email = process.argv[2];

if (!email) {
  console.log('\n❌ Error: Email required\n');
  console.log('Usage: node clear-stale-stripe-customer.js <user_email>\n');
  console.log('Example: node clear-stale-stripe-customer.js user@example.com\n');
  process.exit(1);
}

clearStaleCustomer(email)
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
