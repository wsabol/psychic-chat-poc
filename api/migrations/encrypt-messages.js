/**
 * Migration Script: Encrypt Existing Messages
 * ✅ Migrates plain text content to content_encrypted using ENCRYPTION_KEY
 * 
 * Usage: node encrypt-messages.js
 * 
 * This script:
 * 1. Reads all messages with non-NULL content
 * 2. Encrypts the content using pgp_sym_encrypt
 * 3. Stores encrypted data in content_encrypted column
 * 4. Does NOT delete plain text (keeps for reference, can be cleared later if needed)
 */

import { db } from '../shared/db.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from root directory
dotenv.config({ path: path.join(__dirname, '../../.env') });

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

if (!ENCRYPTION_KEY) {
    console.error('❌ ERROR: ENCRYPTION_KEY not found in .env');
    process.exit(1);
}

async function encryptExistingMessages() {
    console.log('🔐 Starting message encryption migration...');
    console.log(`Using encryption key: ${ENCRYPTION_KEY.substring(0, 5)}...`);
    
    try {
        // Step 1: Get count of messages to encrypt
        const countResult = await db.query(
            `SELECT COUNT(*) as total FROM messages WHERE content IS NOT NULL AND content_encrypted IS NULL`
        );
        const totalMessages = parseInt(countResult.rows[0].total);
        
        if (totalMessages === 0) {
            console.log('✅ All messages are already encrypted or no plain text messages found.');
            process.exit(0);
        }
        
        console.log(`📝 Found ${totalMessages} messages to encrypt...`);
        
        // Step 2: Encrypt messages in batches
        const batchSize = 100;
        let processedCount = 0;
        
        for (let offset = 0; offset < totalMessages; offset += batchSize) {
            console.log(`Processing batch: ${offset + 1} to ${Math.min(offset + batchSize, totalMessages)}...`);
            
            const result = await db.query(
                `UPDATE messages 
                 SET content_encrypted = pgp_sym_encrypt(content, $1)
                 WHERE id IN (
                    SELECT id FROM messages 
                    WHERE content IS NOT NULL AND content_encrypted IS NULL 
                    ORDER BY created_at ASC 
                    LIMIT $2 OFFSET $3
                 )
                 RETURNING id`,
                [ENCRYPTION_KEY, batchSize, offset]
            );
            
            processedCount += result.rowCount;
            console.log(`✓ Encrypted ${processedCount} messages so far...`);
        }
        
        console.log(`\n✅ MIGRATION COMPLETE!`);
        console.log(`📊 Total messages encrypted: ${processedCount}`);
        console.log(`📍 Plain text 'content' column: Preserved (kept for reference)`);
        console.log(`🔒 Encrypted 'content_encrypted' column: Ready for use`);
        
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration failed:', err.message);
        console.error(err);
        process.exit(1);
    }
}

// Run migration
encryptExistingMessages();
