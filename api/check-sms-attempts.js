/**
 * Utility Script: Check SMS Verification Attempts
 * 
 * This script queries the sms_verification_attempts table to show:
 * - How many SMS requests per phone number
 * - Success vs failure rates
 * - Recent activity patterns
 * 
 * Usage: node api/check-sms-attempts.js [phone_number]
 * 
 * Examples:
 *   node api/check-sms-attempts.js                    # Show all recent attempts
 *   node api/check-sms-attempts.js +15555555555       # Show attempts for specific phone
 */

import dotenv from 'dotenv';
dotenv.config();

import { db } from './shared/db.js';

const phoneNumberArg = process.argv[2];

async function checkSMSAttempts() {
  try {
    console.log('\n=================================================');
    console.log('📊 SMS VERIFICATION ATTEMPTS ANALYSIS');
    console.log('=================================================\n');

    if (phoneNumberArg) {
      // Show attempts for specific phone number
      console.log(`🔍 Filtering for phone: ${phoneNumberArg}\n`);
      
      const result = await db.query(
        `SELECT 
          phone_number,
          success,
          error_code,
          created_at
         FROM sms_verification_attempts 
         WHERE phone_number = $1
         ORDER BY created_at DESC
         LIMIT 50`,
        [phoneNumberArg]
      );

      if (result.rows.length === 0) {
        console.log(`❌ No attempts found for ${phoneNumberArg}`);
        return;
      }

      console.log(`Total Attempts: ${result.rows.length}\n`);
      console.log('Recent Attempts:');
      console.log('─'.repeat(80));
      
      result.rows.forEach((row, i) => {
        const status = row.success ? '✅ SUCCESS' : '❌ FAILED';
        const errorInfo = row.error_code ? ` (Error: ${row.error_code})` : '';
        const time = new Date(row.created_at).toLocaleString();
        console.log(`${i + 1}. ${status}${errorInfo} - ${time}`);
      });

      // Calculate stats
      const successCount = result.rows.filter(r => r.success).length;
      const failedCount = result.rows.length - successCount;
      const successRate = ((successCount / result.rows.length) * 100).toFixed(1);

      console.log('\n📈 Statistics:');
      console.log(`   Success: ${successCount} (${successRate}%)`);
      console.log(`   Failed:  ${failedCount}`);

    } else {
      // Show summary grouped by phone number (last 24 hours)
      console.log('📋 Summary of All Phone Numbers (Last 24 Hours)\n');

      const result = await db.query(
        `SELECT 
          phone_number,
          COUNT(*) as total_attempts,
          SUM(CASE WHEN success = true THEN 1 ELSE 0 END) as success_count,
          SUM(CASE WHEN success = false THEN 1 ELSE 0 END) as failed_count,
          MAX(created_at) as last_attempt,
          array_agg(DISTINCT error_code) FILTER (WHERE error_code IS NOT NULL) as error_codes
         FROM sms_verification_attempts 
         WHERE created_at > NOW() - INTERVAL '24 hours'
         GROUP BY phone_number
         ORDER BY total_attempts DESC, last_attempt DESC
         LIMIT 20`
      );

      if (result.rows.length === 0) {
        console.log('✅ No SMS attempts recorded in the last 24 hours.');
        return;
      }

      console.log('─'.repeat(100));
      console.log('Phone Number         | Attempts | Success | Failed | Last Attempt            | Error Codes');
      console.log('─'.repeat(100));

      result.rows.forEach(row => {
        const phone = row.phone_number.padEnd(20);
        const attempts = String(row.total_attempts).padEnd(8);
        const success = String(row.success_count).padEnd(7);
        const failed = String(row.failed_count).padEnd(6);
        const lastAttempt = new Date(row.last_attempt).toLocaleString().padEnd(23);
        const errors = row.error_codes ? row.error_codes.join(', ') : 'None';
        
        console.log(`${phone} | ${attempts} | ${success} | ${failed} | ${lastAttempt} | ${errors}`);
      });

      console.log('─'.repeat(100));

      // Overall stats
      const totalAttempts = result.rows.reduce((sum, row) => sum + parseInt(row.total_attempts), 0);
      const totalSuccess = result.rows.reduce((sum, row) => sum + parseInt(row.success_count), 0);
      const totalFailed = result.rows.reduce((sum, row) => sum + parseInt(row.failed_count), 0);
      const overallRate = ((totalSuccess / totalAttempts) * 100).toFixed(1);

      console.log(`\n📊 Overall Statistics (Last 24 Hours):`);
      console.log(`   Total Phones:   ${result.rows.length}`);
      console.log(`   Total Attempts: ${totalAttempts}`);
      console.log(`   Success:        ${totalSuccess} (${overallRate}%)`);
      console.log(`   Failed:         ${totalFailed}`);

      // Check for potential spam/abuse
      const highVolumePhones = result.rows.filter(r => parseInt(r.total_attempts) > 5);
      if (highVolumePhones.length > 0) {
        console.log(`\n⚠️  Warning: ${highVolumePhones.length} phone(s) with >5 attempts:`);
        highVolumePhones.forEach(row => {
          console.log(`   ${row.phone_number}: ${row.total_attempts} attempts`);
        });
      }
    }

    console.log('\n=================================================\n');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error checking SMS attempts:', error.message);
    console.error(error);
    process.exit(1);
  }
}

checkSMSAttempts();
