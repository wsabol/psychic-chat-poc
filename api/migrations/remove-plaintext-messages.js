/**
 * Migration Script: Remove Plain Text Messages
 * ✅ Clears content column after encryption is complete
 * 
 * Usage: node remove-plaintext-messages.js
 * 
 * This script:
 * 1. Verifies content_encrypted has data
 * 2. Sets content = NULL for all encrypted messages
 * 3. Keeps the column structure (doesn't delete)
 * 4. Prevents accidental data loss
 */

import { db } from '../shared/db.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from root directory
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function removePlainTextMessages() {
    console.log('🔄 Starting plain text removal...');
    
    try {
        // Step 1: Verify encrypted data exists
        const encryptedCount = await db.query(
            `SELECT COUNT(*) as total FROM messages WHERE content_encrypted IS NOT NULL`
        );
        const totalEncrypted = parseInt(encryptedCount.rows[0].total);
        
        if (totalEncrypted === 0) {
            console.error('❌ ERROR: No encrypted messages found. Aborting to prevent data loss.');
            process.exit(1);
        }
        
        console.log(`✅ Verified ${totalEncrypted} encrypted messages exist`);
        
        // Step 2: Get count of plain text to remove
        const plainCount = await db.query(
            `SELECT COUNT(*) as total FROM messages WHERE content IS NOT NULL`
        );
        const totalPlain = parseInt(plainCount.rows[0].total);
        
        if (totalPlain === 0) {
            console.log('ℹ️  No plain text messages found to remove.');
            process.exit(0);
        }
        
        console.log(`📝 Found ${totalPlain} plain text messages to remove...`);
        
        // Step 3: Clear plain text content
        const result = await db.query(
            `UPDATE messages 
             SET content = NULL 
             WHERE content IS NOT NULL AND content_encrypted IS NOT NULL`
        );
        
        console.log(`\n✅ REMOVAL COMPLETE!`);
        console.log(`📊 Plain text rows cleared: ${result.rowCount}`);
        console.log(`🔒 Encrypted content preserved in content_encrypted`);
        console.log(`📍 content column: Now NULL (structure preserved)`);
        
        process.exit(0);
    } catch (err) {
        console.error('❌ Removal failed:', err.message);
        console.error(err);
        process.exit(1);
    }
}

// Run migration
removePlainTextMessages();
