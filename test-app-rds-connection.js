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

async function testConnection() {
  try {
    // Test 1: Basic connection
    const result = await db.query('SELECT NOW() as current_time, version() as pg_version');
    // Test 2: Database name verification
    const dbResult = await db.query('SELECT current_database() as db_name');

    // Test 3: Check if tables exist
    const tablesResult = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
      LIMIT 10
    `);
    tablesResult.rows.forEach(row => {
    });

    // Test 4: Check for users table
    const usersResult = await db.query('SELECT COUNT(*) as user_count FROM users');
    
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
