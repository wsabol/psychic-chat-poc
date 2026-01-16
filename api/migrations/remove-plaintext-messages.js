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
import { logErrorFromCatch } from '../shared/errorLogger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from root directory
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function removePlainTextMessages() {
    
    try {
        // Step 1: Verify encrypted data exists
        const encryptedCount = await db.query(
            `SELECT COUNT(*) as total FROM messages WHERE content_encrypted IS NOT NULL`
        );
        const totalEncrypted = parseInt(encryptedCount.rows[0].total);
        
                if (totalEncrypted === 0) {
            logErrorFromCatch(new Error('No encrypted messages found. Aborting to prevent data loss.'), 'migration', 'validation');
            process.exit(1);
        }
        
        // Step 2: Get count of plain text to remove
        const plainCount = await db.query(
            `SELECT COUNT(*) as total FROM messages WHERE content IS NOT NULL`
        );
        const totalPlain = parseInt(plainCount.rows[0].total);
        
        if (totalPlain === 0) {
            process.exit(0);
        }
        
        // Step 3: Clear plain text content
        const result = await db.query(
            `UPDATE messages 
             SET content = NULL 
             WHERE content IS NOT NULL AND content_encrypted IS NOT NULL`
        );
        
        process.exit(0);
        } catch (err) {
        logErrorFromCatch(err, 'migration', 'remove plaintext messages');
        process.exit(1);
    }
}

// Run migration
removePlainTextMessages();
