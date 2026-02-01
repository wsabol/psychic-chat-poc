#!/usr/bin/env node

/**
 * Test RDS Connection from Application
 * 
 * This script tests the connection to AWS RDS using the app's database configuration.
 * It uses the same db.js module that the application uses.
 * 
 * Usage: node test-app-rds-connection.js
 */

import dotenv from 'dotenv';
import { db } from './api/shared/db.js';

// Load environment variables
dotenv.config();

console.log('\n🔍 Testing AWS RDS Connection...\n');
console.log('Configuration:');
console.log('- Database URL:', process.env.DATABASE_URL ? process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@') : 'NOT SET');
console.log('- DB Host:', process.env.DB_HOST || 'NOT SET');
console.log('- DB Name:', process.env.DB_NAME || 'NOT SET');
console.log('- SSL Mode:', process.env.DB_SSL || process.env.DATABASE_URL?.includes('sslmode') ? 'ENABLED' : 'DISABLED');
console.log('');

async function testConnection() {
  try {
    // Test 1: Basic connection
    console.log('Test 1: Basic Connection Test...');
    const result = await db.query('SELECT NOW() as current_time, version() as pg_version');
    console.log('✅ Connection successful!');
    console.log('   Current Time:', result.rows[0].current_time);
    console.log('   PostgreSQL Version:', result.rows[0].pg_version.split(',')[0]);
    console.log('');

    // Test 2: Database name verification
    console.log('Test 2: Database Name Verification...');
    const dbResult = await db.query('SELECT current_database() as db_name');
    console.log('✅ Connected to database:', dbResult.rows[0].db_name);
    console.log('');

    // Test 3: Check if tables exist
    console.log('Test 3: Checking Tables...');
    const tablesResult = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
      LIMIT 10
    `);
    console.log(`✅ Found ${tablesResult.rows.length} tables (showing first 10):`);
    tablesResult.rows.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });
    console.log('');

    // Test 4: Check for users table
    console.log('Test 4: Checking Users Table...');
    const usersResult = await db.query('SELECT COUNT(*) as user_count FROM users');
    console.log('✅ Users table exists with', usersResult.rows[0].user_count, 'users');
    console.log('');

    console.log('🎉 All tests passed! Your app is ready to use AWS RDS!\n');
    
  } catch (error) {
    console.error('❌ Connection test failed:');
    console.error('   Error:', error.message);
    if (error.code) {
      console.error('   Error Code:', error.code);
    }
    console.error('\n💡 Troubleshooting tips:');
    console.error('   1. Check if your SSH tunnel is still running (if using bastion)');
    console.error('   2. Verify your .env file has the correct DATABASE_URL');
    console.error('   3. Ensure RDS security group allows your IP');
    console.error('   4. Check that the database name is "psychic_chat"');
    console.error('\n');
    process.exit(1);
  } finally {
    await db.end();
  }
}

testConnection();
