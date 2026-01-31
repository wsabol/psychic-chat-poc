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
 * 
 * REFACTORED:
 *   - Now uses the refactored legal data service with validation
 *   - Better error messages and input validation
 *   - Improved logging and output formatting
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import the refactored legal data service
const serviceModulePath = path.join(__dirname, '../api/services/legal/legalDataService.js');
const { generateLegalDataPackage } = await import(serviceModulePath);

// Parse command line arguments
const args = process.argv.slice(2);

const [emailOrUserId, adminName, requestReason] = args;

// Display usage if arguments missing
if (!emailOrUserId || !adminName || !requestReason) {
  console.error('\n❌ ERROR: All parameters are required\n');
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
    // Generate the complete data package (includes validation)
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
    
    // More helpful error messages
    if (error.message.includes('Invalid')) {
      console.error('\n💡 TIP: Check that your email/UUID format is correct');
    } else if (error.message.includes('not found')) {
      console.error('\n💡 TIP: Verify the user exists in the database');
    }
    
    if (process.env.DEBUG) {
      console.error('\nStack trace:', error.stack);
    }
    
    process.exit(1);
  }
}

main();
