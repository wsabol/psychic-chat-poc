import { Router } from "express";
import { authenticateToken } from "../middleware/auth.js";
import { db } from "../shared/db.js";
import { auth as firebaseAuth } from "../shared/firebase-admin.js";

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
        return res.status(400).json({ 
            error: 'Missing tempUserId or email' 
        });
    }

    if (!tempUserId.startsWith('temp_')) {
        return res.status(400).json({ 
            error: 'Invalid temp user ID format' 
        });
    }

    try {
        console.log(`[MIGRATION] Registering pending migration for ${tempUserId} -> ${email}`);
        
        await db.query(
            `INSERT INTO pending_migrations (temp_user_id, email, migrated) 
             VALUES ($1, $2, false)
             ON CONFLICT (temp_user_id) DO UPDATE SET email = $2, migrated = false`,
            [tempUserId, email]
        );

        console.log(`[MIGRATION] ✓ Registered pending migration`);
        res.json({ 
            success: true, 
            message: 'Migration registered' 
        });
    } catch (error) {
        console.error('[MIGRATION] Error registering migration:', error);
        res.status(500).json({ 
            error: 'Failed to register migration: ' + error.message 
        });
    }
});

/**
 * Migrate chat history from temporary account to real account
 * POST /migration/migrate-chat-history
 * 
 * Retrieves tempUserId from pending_migrations table using the authenticated user's email
 * 
 * This endpoint:
 * 1. Looks up temp user ID using email from pending_migrations table
 * 2. Copies all messages from temp account to real account
 * 3. Deletes temp account's messages and data
 * 4. Deletes temp account from Firebase
 * 5. Marks migration as complete
 */
router.post("/migrate-chat-history", authenticateToken, async (req, res) => {
    const newUserId = req.userId; // Authenticated user (real account)
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ 
            error: 'Email is required' 
        });
    }

    const client = await db.connect();
    try {
        await client.query('BEGIN');

        console.log(`[MIGRATION] ========== Starting migration ==========`);
        console.log(`[MIGRATION] New user ID: ${newUserId}`);
        console.log(`[MIGRATION] Email: ${email}`);

        // Step 1: Look up temp user ID from pending_migrations
        const { rows: migrationRows } = await client.query(
            'SELECT temp_user_id FROM pending_migrations WHERE email = $1 AND migrated = false',
            [email]
        );

        if (migrationRows.length === 0) {
            await client.query('ROLLBACK');
            console.log('[MIGRATION] No pending migration found for email:', email);
            return res.json({ 
                success: true, 
                message: 'No pending migration found',
                migratedCount: 0
            });
        }

        const tempUserId = migrationRows[0].temp_user_id;
        console.log(`[MIGRATION] Found temp user ID: ${tempUserId}`);

        // Step 2: Check if temp account has messages
        const { rows: tempMessages } = await client.query(
            'SELECT COUNT(*) as count FROM messages WHERE user_id = $1',
            [tempUserId]
        );
        const messageCount = parseInt(tempMessages[0].count);
        console.log(`[MIGRATION] Found ${messageCount} messages in temp account`);

        if (messageCount === 0) {
            console.log('[MIGRATION] No messages to migrate');
            // Still mark as migrated and delete temp user
            try {
                await firebaseAuth.deleteUser(tempUserId);
                console.log(`[MIGRATION] ✓ Deleted temp user from Firebase (no messages)`);
            } catch (fbErr) {
                console.error('[MIGRATION] ✗ Failed to delete temp user from Firebase:', fbErr.code, fbErr.message);
            }
            
            await client.query(
                'UPDATE pending_migrations SET migrated = true, migrated_at = NOW() WHERE temp_user_id = $1',
                [tempUserId]
            );
            
            await client.query('COMMIT');
            return res.json({ 
                success: true, 
                message: 'No messages to migrate',
                migratedCount: 0,
                tempUserDeleted: true
            });
        }

        // Step 3: Copy all messages
        console.log('[MIGRATION] Copying messages...');
        const { rows: migratedRows } = await client.query(
            `INSERT INTO messages (role, content, content_encrypted, user_id, created_at)
             SELECT role, content, content_encrypted, $1, created_at
             FROM messages
             WHERE user_id = $2
             ORDER BY created_at ASC
             RETURNING id`,
            [newUserId, tempUserId]
        );

        const newMessageIds = migratedRows.map(row => row.id);
        console.log(`[MIGRATION] ✓ Copied ${newMessageIds.length} messages`);

        // Step 4: Delete temp messages
        console.log('[MIGRATION] Deleting temp messages...');
        await client.query(
            'DELETE FROM messages WHERE user_id = $1',
            [tempUserId]
        );

        // Step 5: Delete temp personal info
        console.log('[MIGRATION] Deleting temp personal info...');
        await client.query(
            'DELETE FROM user_personal_info WHERE user_id = $1',
            [tempUserId]
        );

        // Step 6: Mark migration as complete
        console.log('[MIGRATION] Marking migration as complete...');
        await client.query(
            'UPDATE pending_migrations SET migrated = true, migrated_at = NOW() WHERE temp_user_id = $1',
            [tempUserId]
        );

        // Step 7: Commit database changes
        await client.query('COMMIT');
        console.log('[MIGRATION] ✓ Database transaction committed');

        // Step 8: Delete from Firebase (after DB commit)
        let firebaseDeleted = false;
        try {
            console.log(`[MIGRATION] Deleting temp user ${tempUserId} from Firebase...`);
            await firebaseAuth.deleteUser(tempUserId);
            firebaseDeleted = true;
            console.log(`[MIGRATION] ✓ Successfully deleted temp user from Firebase`);
        } catch (fbErr) {
            console.error('[MIGRATION] ✗ Failed to delete temp user from Firebase');
            console.error('[MIGRATION] Error code:', fbErr.code);
            console.error('[MIGRATION] Error message:', fbErr.message);
        }

        console.log(`[MIGRATION] ========== Migration completed successfully ==========`);

        res.json({ 
            success: true, 
            message: 'Chat history migrated successfully',
            migratedCount: newMessageIds.length,
            newMessageIds: newMessageIds,
            tempUserDeleted: firebaseDeleted
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('[MIGRATION] ✗ Error:', error);
        res.status(500).json({ 
            error: 'Migration failed: ' + error.message,
            success: false
        });
    } finally {
        client.release();
    }
});

export default router;
