#!/usr/bin/env node

/**
 * Legal Data Request CLI Tool
 * 
 * USAGE:
 *   node scripts/legal-data-request.js <email_or_userId> <admin_name> <reason>
 * 
 * EXAMPLES:
 *   node scripts/legal-data-request.js user@example.com "Admin Name" "Subpoena #12345"
 *   node scripts/legal-data-request.js abc123-uuid-456 "Legal Team" "Court Order #67890"
 * 
 * OUTPUT:
 *   - Generates a JSON file with complete user data
 *   - Logs the request to audit_log for chain of custody
 *   - File saved to: ./legal-requests/YYYY-MM-DD_userId_request.json
 * 
 * SECURITY:
 *   - Requires DATABASE_URL and ENCRYPTION_KEY environment variables
 *   - Only use on secure, authorized systems
 *   - Treat output files as highly confidential
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import the legal data service
const serviceModulePath = path.join(__dirname, '../api/services/legalDataRequestService.js');
const { generateLegalDataPackage } = await import(serviceModulePath);

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length < 3) {
  console.error('❌ ERROR: Missing required arguments\n');
  console.log('USAGE:');
  console.log('  node scripts/legal-data-request.js <email_or_userId> <admin_name> <reason>\n');
  console.log('EXAMPLES:');
  console.log('  node scripts/legal-data-request.js user@example.com "Admin Name" "Subpoena #12345"');
  console.log('  node scripts/legal-data-request.js abc123-uuid "Legal Team" "Court Order #67890"\n');
  process.exit(1);
}

const [emailOrUserId, adminName, requestReason] = args;

// Validate inputs
if (!emailOrUserId || !adminName || !requestReason) {
  console.error('❌ ERROR: All parameters are required');
  process.exit(1);
}

// Check environment variables
if (!process.env.DATABASE_URL) {
  console.error('❌ ERROR: DATABASE_URL environment variable not set');
  process.exit(1);
}

if (!process.env.ENCRYPTION_KEY) {
  console.error('❌ ERROR: ENCRYPTION_KEY environment variable not set');
  process.exit(1);
}

async function main() {
  console.log('\n🔍 Legal Data Request Tool');
  console.log('═══════════════════════════════════════════\n');
  console.log(`User/Email:  ${emailOrUserId}`);
  console.log(`Requested by: ${adminName}`);
  console.log(`Reason:       ${requestReason}`);
  console.log('\n⏳ Retrieving data...\n');

  try {
    // Generate the complete data package
    const dataPackage = await generateLegalDataPackage(
      emailOrUserId,
      adminName,
      requestReason,
      'CLI-REQUEST' // IP address for CLI requests
    );

    // Create output directory if it doesn't exist
    const outputDir = path.join(__dirname, '../legal-requests');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
      console.log(`✅ Created directory: ${outputDir}\n`);
    }

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const sanitizedUserId = dataPackage.request_metadata.user_id.substring(0, 8);
    const filename = `${timestamp}_${sanitizedUserId}_legal-request.json`;
    const filepath = path.join(outputDir, filename);

    // Write data to file
    fs.writeFileSync(filepath, JSON.stringify(dataPackage, null, 2));

    console.log('✅ SUCCESS - Data Retrieved\n');
    console.log('═══════════════════════════════════════════');
    console.log(`📁 File saved to: ${filepath}`);
    console.log('\nDATA SUMMARY:');
    console.log(`  • User ID:        ${dataPackage.request_metadata.user_id}`);
    console.log(`  • Email:          ${dataPackage.request_metadata.user_email}`);
    console.log(`  • Messages:       ${dataPackage.statistics.total_messages}`);
    console.log(`  • Audit Events:   ${dataPackage.statistics.total_audit_events}`);
    console.log(`  • Violations:     ${dataPackage.statistics.total_violations}`);
    console.log(`  • Account Status: ${dataPackage.statistics.account_status}`);
    console.log(`  • Created:        ${new Date(dataPackage.statistics.account_created).toLocaleDateString()}`);
    console.log('\n⚠️  IMPORTANT SECURITY NOTES:');
    console.log('  • This file contains sensitive personal data');
    console.log('  • Store securely and limit access');
    console.log('  • This request has been logged to audit_log');
    console.log('  • Maintain chain of custody documentation');
    console.log('═══════════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('\nStack trace:', error.stack);
    process.exit(1);
  }
}

main();
