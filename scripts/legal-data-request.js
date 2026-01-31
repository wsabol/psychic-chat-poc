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
    }

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const sanitizedUserId = dataPackage.request_metadata.user_id.substring(0, 8);
    const filename = `${timestamp}_${sanitizedUserId}_legal-request.json`;
    const filepath = path.join(outputDir, filename);

    // Write data to file
    fs.writeFileSync(filepath, JSON.stringify(dataPackage, null, 2));

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('\nStack trace:', error.stack);
    process.exit(1);
  }
}

main();
