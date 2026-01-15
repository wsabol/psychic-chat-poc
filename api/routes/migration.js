import { Router } from "express";
import { authenticateToken } from "../middleware/auth.js";
import { db } from "../shared/db.js";
import { auth as firebaseAuth } from "../shared/firebase-admin.js";
import { getEncryptionKey } from "../shared/decryptionHelper.js";
import { hashTempUserId } from "../shared/hashUtils.js";
import { validationError, serverError } from "../utils/responses.js";
import { logErrorFromCatch } from "../shared/errorLogger.js";

const router = Router();

/**
 * Store pending migration (called when user clicks "Set Up Account")
 * POST /migration/register-migration
 * 
 * Body: { tempUserId: "temp_xxxxx", email: "user@gmail.com" }
 */
router.post("/register-migration", async (req, res) => {
    const { tempUserId, email } = req.body;

        if (!tempUserId || !email) {
        return validationError(res, 'Missing tempUserId or email');
    }

        if (!tempUserId.startsWith('temp_')) {
        return validationError(res, 'Invalid temp user ID format');
    }

    try {
        const ENCRYPTION_KEY = getEncryptionKey();
        const tempUserIdHash = hashTempUserId(tempUserId);
        
        // Encrypt email before storing
        const encResult = await db.query(
            'SELECT pgp_sym_encrypt($1::text, $2) as encrypted',
            [email, ENCRYPTION_KEY]
        );
        const encryptedEmail = encResult.rows[0]?.encrypted;

        await db.query(
            `INSERT INTO pending_migrations (temp_user_id, temp_user_id_hash, email_encrypted, migrated) 
             VALUES ($1, $2, $3, false)
             ON CONFLICT (temp_user_id) DO UPDATE SET email_encrypted = $3, migrated = false`,
            [tempUserId, tempUserIdHash, encryptedEmail]
        );

        res.json({ 
            success: true, 
            message: 'Migration registered' 
        });
        } catch (error) {
        return serverError(res, 'Failed to register migration');
    }
});

/**
 * Migrate chat history from temporary account to real account
 * POST /migration/migrate-chat-history
 */
router.post("/migrate-chat-history", authenticateToken, async (req, res) => {
    const newUserId = req.userId;
    const { email } = req.body;

        if (!email) {
        return validationError(res, 'Email is required');
    }

    const client = await db.connect();
    try {
        await client.query('BEGIN');
        const ENCRYPTION_KEY = getEncryptionKey();

        // Encrypt the email to compare with encrypted email in DB
        const encResult = await client.query(
            'SELECT pgp_sym_encrypt($1::text, $2) as encrypted',
            [email, ENCRYPTION_KEY]
        );
        const encryptedEmail = encResult.rows[0]?.encrypted;

        // Look up temp user ID using encrypted email
        const { rows: migrationRows } = await client.query(
            'SELECT temp_user_id FROM pending_migrations WHERE email_encrypted = $1 AND migrated = false',
            [encryptedEmail]
        );

        if (migrationRows.length === 0) {
            await client.query('ROLLBACK');
            return res.json({ 
                success: true, 
                message: 'No pending migration found',
                migratedCount: 0
            });
        }

        const tempUserId = migrationRows[0].temp_user_id;
        const tempUserIdHash = hashTempUserId(tempUserId);

        // Check if temp account has messages
        const { rows: tempMessages } = await client.query(
            'SELECT COUNT(*) as count FROM messages WHERE user_id = $1',
            [tempUserId]
        );
        const messageCount = parseInt(tempMessages[0].count);

                if (messageCount === 0) {
            try {
                await firebaseAuth.deleteUser(tempUserId);
            } catch (fbErr) {
                await logErrorFromCatch(fbErr, 'migration', 'Delete temp user after no messages');
            }
            
            await client.query(
                'UPDATE pending_migrations SET migrated = true, migrated_at = NOW() WHERE temp_user_id_hash = $1',
                [tempUserIdHash]
            );
            
            await client.query('COMMIT');
            return res.json({ 
                success: true, 
                message: 'No messages to migrate',
                migratedCount: 0,
                tempUserDeleted: true
            });
        }

        // Copy all messages - also update user_id_hash for new user
        const newUserIdHash = require('../shared/hashUtils.js').hashUserId(newUserId);
        const { rows: migratedRows } = await client.query(
            `INSERT INTO messages (role, content, content_encrypted, user_id, user_id_hash, created_at)
             SELECT role, content, content_encrypted, $1, $3, created_at
             FROM messages
             WHERE user_id = $2
             ORDER BY created_at ASC
             RETURNING id`,
            [newUserId, tempUserId, newUserIdHash]
        );

        const newMessageIds = migratedRows.map(row => row.id);
        
        await client.query(
            'DELETE FROM messages WHERE user_id = $1',
            [tempUserId]
        );

        await client.query(
            'DELETE FROM user_personal_info WHERE user_id = $1',
            [tempUserId]
        );

        await client.query(
            'UPDATE pending_migrations SET migrated = true, migrated_at = NOW() WHERE temp_user_id_hash = $1',
            [tempUserIdHash]
        );

        await client.query('COMMIT');

                let firebaseDeleted = false;
        try {
            await firebaseAuth.deleteUser(tempUserId);
            firebaseDeleted = true;
        } catch (fbErr) {
            await logErrorFromCatch(fbErr, 'migration', 'Delete temp user after migration');
        }

        res.json({ 
            success: true, 
            message: 'Chat history migrated successfully',
            migratedCount: newMessageIds.length,
            newMessageIds: newMessageIds,
            tempUserDeleted: firebaseDeleted
        });

        } catch (error) {
        await client.query('ROLLBACK');
        return serverError(res, 'Migration failed');
    } finally {
        client.release();
    }
});

export default router;
