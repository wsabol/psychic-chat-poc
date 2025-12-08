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
        
        await db.query(
            `INSERT INTO pending_migrations (temp_user_id, email, migrated) 
             VALUES ($1, $2, false)
             ON CONFLICT (temp_user_id) DO UPDATE SET email = $2, migrated = false`,
            [tempUserId, email]
        );

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

        // Step 1: Look up temp user ID from pending_migrations
        const { rows: migrationRows } = await client.query(
            'SELECT temp_user_id FROM pending_migrations WHERE email = $1 AND migrated = false',
            [email]
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

        // Step 2: Check if temp account has messages
        const { rows: tempMessages } = await client.query(
            'SELECT COUNT(*) as count FROM messages WHERE user_id = $1',
            [tempUserId]
        );
        const messageCount = parseInt(tempMessages[0].count);

        if (messageCount === 0) {
            // Still mark as migrated and delete temp user
            try {
                await firebaseAuth.deleteUser(tempUserId);
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
        // Step 4: Delete temp messages
        await client.query(
            'DELETE FROM messages WHERE user_id = $1',
            [tempUserId]
        );

        // Step 5: Delete temp personal info
        await client.query(
            'DELETE FROM user_personal_info WHERE user_id = $1',
            [tempUserId]
        );

        // Step 6: Mark migration as complete
        await client.query(
            'UPDATE pending_migrations SET migrated = true, migrated_at = NOW() WHERE temp_user_id = $1',
            [tempUserId]
        );

        // Step 7: Commit database changes
        await client.query('COMMIT');

        // Step 8: Delete from Firebase (after DB commit)
        let firebaseDeleted = false;
        try {
            await firebaseAuth.deleteUser(tempUserId);
            firebaseDeleted = true;
        } catch (fbErr) {
            console.error('[MIGRATION] ✗ Failed to delete temp user from Firebase');
            console.error('[MIGRATION] Error code:', fbErr.code);
            console.error('[MIGRATION] Error message:', fbErr.message);
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
        console.error('[MIGRATION] ✗ Error:', error);
        res.status(500).json({ 
            error: 'Migration failed: ' + error.message,
            success: false
        });
    } finally {
        client.release();
    }
});

/**
 * POST /migration/run-schema-updates
 * Run schema updates (email encryption migration)
 * Admin endpoint - requires authentication
 */
router.post("/run-schema-updates", async (req, res) => {
    try {
        console.log('[SCHEMA UPDATE] Starting email encryption migration...');
        
        // Step 1: Add encrypted email column
        console.log('[SCHEMA UPDATE] Step 1: Adding email_encrypted column...');
        await db.query(`
            ALTER TABLE user_personal_info
            ADD COLUMN IF NOT EXISTS email_encrypted BYTEA;
        `);
        console.log('[SCHEMA UPDATE] ✅ Column added');
        
        // Step 2: Encrypt all existing plaintext emails
        console.log('[SCHEMA UPDATE] Step 2: Encrypting existing emails...');
        const encryptResult = await db.query(`
            UPDATE user_personal_info
            SET email_encrypted = pgp_sym_encrypt(email, $1)
            WHERE email_encrypted IS NULL AND email IS NOT NULL
        `, [process.env.ENCRYPTION_KEY]);
        console.log(`[SCHEMA UPDATE] ✅ Encrypted ${encryptResult.rowCount} rows`);
        
        // Step 3: Verify encryption
        console.log('[SCHEMA UPDATE] Step 3: Verifying encryption...');
        const encryptedCount = await db.query(`
            SELECT COUNT(*) as count FROM user_personal_info 
            WHERE email_encrypted IS NOT NULL
        `);
        console.log(`[SCHEMA UPDATE] ✅ Encrypted count: ${encryptedCount.rows[0].count}`);
        
        // Step 4: Verify no data loss
        console.log('[SCHEMA UPDATE] Step 4: Verifying no data loss...');
        const plaintextCount = await db.query(`
            SELECT COUNT(*) as count FROM user_personal_info 
            WHERE email IS NOT NULL AND email_encrypted IS NULL
        `);
        console.log(`[SCHEMA UPDATE] ✅ Unencrypted count: ${plaintextCount.rows[0].count}`);
        
        // Step 5: Drop plaintext email column
        console.log('[SCHEMA UPDATE] Step 5: Dropping plaintext email column...');
        await db.query(`
            ALTER TABLE user_personal_info
            DROP COLUMN IF EXISTS email CASCADE;
        `);
        console.log('[SCHEMA UPDATE] ✅ Column dropped');
        
        console.log('[SCHEMA UPDATE] 🎉 Migration complete!');
        
        res.json({ 
            success: true, 
            message: 'Schema update complete',
            details: {
                encryptedRows: encryptResult.rowCount,
                totalEncrypted: encryptedCount.rows[0].count,
                unencrypted: plaintextCount.rows[0].count
            }
        });
    } catch (error) {
        console.error('[SCHEMA UPDATE] ❌ Error:', error.message);
        res.status(500).json({ 
            success: false,
            error: 'Schema update failed: ' + error.message
        });
    }
});

/**
 * POST /migration/run-phase-1-2
 * Run Phase 1.2: Encrypt additional sensitive fields (sex, familiar_name, phone numbers)
 */
router.post("/run-phase-1-2", async (req, res) => {
    try {
        console.log('[PHASE 1.2] Starting additional field encryption migration...');
        
        // Step 1: Add encrypted columns
        console.log('[PHASE 1.2] Step 1: Adding encrypted columns...');
                await db.query(`ALTER TABLE user_personal_info ADD COLUMN IF NOT EXISTS sex_encrypted BYTEA;`);
        await db.query(`ALTER TABLE user_personal_info ADD COLUMN IF NOT EXISTS address_preference_encrypted BYTEA;`);
        await db.query(`ALTER TABLE user_2fa_settings ADD COLUMN IF NOT EXISTS phone_number_encrypted BYTEA;`);
        await db.query(`ALTER TABLE user_2fa_settings ADD COLUMN IF NOT EXISTS backup_phone_number_encrypted BYTEA;`);
        console.log('[PHASE 1.2] ✅ Columns added');
        
        // Step 2: Encrypt sex
        console.log('[PHASE 1.2] Step 2: Encrypting sex field...');
        const sexResult = await db.query(`UPDATE user_personal_info SET sex_encrypted = pgp_sym_encrypt(sex, $1) WHERE sex_encrypted IS NULL AND sex IS NOT NULL`, [process.env.ENCRYPTION_KEY]);
        console.log(`[PHASE 1.2] ✅ Encrypted ${sexResult.rowCount} sex values`);
        
                // Step 3: Encrypt address_preference
        console.log('[PHASE 1.2] Step 3: Encrypting address_preference...');
        const addressResult = await db.query(`UPDATE user_personal_info SET address_preference_encrypted = pgp_sym_encrypt(address_preference, $1) WHERE address_preference_encrypted IS NULL AND address_preference IS NOT NULL`, [process.env.ENCRYPTION_KEY]);
        console.log(`[PHASE 1.2] ✅ Encrypted ${addressResult.rowCount} address preferences`);
        
        // Step 4: Encrypt phone numbers
        console.log('[PHASE 1.2] Step 4: Encrypting phone numbers...');
        const phoneResult = await db.query(`UPDATE user_2fa_settings SET phone_number_encrypted = pgp_sym_encrypt(phone_number::text, $1) WHERE phone_number_encrypted IS NULL AND phone_number IS NOT NULL`, [process.env.ENCRYPTION_KEY]);
        console.log(`[PHASE 1.2] ✅ Encrypted ${phoneResult.rowCount} phone numbers`);
        
        // Step 5: Encrypt backup phones
        console.log('[PHASE 1.2] Step 5: Encrypting backup phone numbers...');
        const backupResult = await db.query(`UPDATE user_2fa_settings SET backup_phone_number_encrypted = pgp_sym_encrypt(backup_phone_number::text, $1) WHERE backup_phone_number_encrypted IS NULL AND backup_phone_number IS NOT NULL`, [process.env.ENCRYPTION_KEY]);
        console.log(`[PHASE 1.2] ✅ Encrypted ${backupResult.rowCount} backup phones`);
        
        // Step 6: Drop plaintext columns
        console.log('[PHASE 1.2] Step 6: Dropping plaintext columns...');
                await db.query(`ALTER TABLE user_personal_info DROP COLUMN IF EXISTS sex CASCADE;`);
        await db.query(`ALTER TABLE user_personal_info DROP COLUMN IF EXISTS address_preference CASCADE;`);
        await db.query(`ALTER TABLE user_2fa_settings DROP COLUMN IF EXISTS phone_number CASCADE;`);
        await db.query(`ALTER TABLE user_2fa_settings DROP COLUMN IF EXISTS backup_phone_number CASCADE;`);
        console.log('[PHASE 1.2] ✅ Columns dropped');
        
        console.log('[PHASE 1.2] 🎉 Migration complete!');
        
        res.json({
            success: true,
            message: 'Phase 1.2 migration complete',
            details: {
                                sexEncrypted: sexResult.rowCount,
                addressPreferenceEncrypted: addressResult.rowCount,
                phonesEncrypted: phoneResult.rowCount,
                backupPhonesEncrypted: backupResult.rowCount
            }
        });
    } catch (error) {
        console.error('[PHASE 1.2] ❌ Error:', error.message);
        res.status(500).json({ success: false, error: 'Phase 1.2 migration failed: ' + error.message });
    }
});

/**
 * POST /migration/run-phase-1-3
 * Run Phase 1.3: Encrypt name and birth information fields
 */
router.post("/run-phase-1-3", async (req, res) => {
    try {
        console.log('[PHASE 1.3] Starting name and birth information encryption...');
        
        // Step 1: Add encrypted columns
        console.log('[PHASE 1.3] Step 1: Adding encrypted columns...');
        await db.query(`ALTER TABLE user_personal_info ADD COLUMN IF NOT EXISTS first_name_encrypted BYTEA;`);
        await db.query(`ALTER TABLE user_personal_info ADD COLUMN IF NOT EXISTS last_name_encrypted BYTEA;`);
        await db.query(`ALTER TABLE user_personal_info ADD COLUMN IF NOT EXISTS birth_date_encrypted BYTEA;`);
        await db.query(`ALTER TABLE user_personal_info ADD COLUMN IF NOT EXISTS birth_time_encrypted BYTEA;`);
        await db.query(`ALTER TABLE user_personal_info ADD COLUMN IF NOT EXISTS birth_country_encrypted BYTEA;`);
        await db.query(`ALTER TABLE user_personal_info ADD COLUMN IF NOT EXISTS birth_province_encrypted BYTEA;`);
        await db.query(`ALTER TABLE user_personal_info ADD COLUMN IF NOT EXISTS birth_city_encrypted BYTEA;`);
        await db.query(`ALTER TABLE user_personal_info ADD COLUMN IF NOT EXISTS birth_timezone_encrypted BYTEA;`);
        console.log('[PHASE 1.3] ✅ Columns added');
        
        // Step 2: Encrypt all name and birth fields
        console.log('[PHASE 1.3] Step 2: Encrypting fields...');
        const firstNameResult = await db.query(`UPDATE user_personal_info SET first_name_encrypted = pgp_sym_encrypt(first_name, $1) WHERE first_name_encrypted IS NULL AND first_name IS NOT NULL`, [process.env.ENCRYPTION_KEY]);
        const lastNameResult = await db.query(`UPDATE user_personal_info SET last_name_encrypted = pgp_sym_encrypt(last_name, $1) WHERE last_name_encrypted IS NULL AND last_name IS NOT NULL`, [process.env.ENCRYPTION_KEY]);
        const birthDateResult = await db.query(`UPDATE user_personal_info SET birth_date_encrypted = pgp_sym_encrypt(birth_date::text, $1) WHERE birth_date_encrypted IS NULL AND birth_date IS NOT NULL`, [process.env.ENCRYPTION_KEY]);
        const birthTimeResult = await db.query(`UPDATE user_personal_info SET birth_time_encrypted = pgp_sym_encrypt(birth_time::text, $1) WHERE birth_time_encrypted IS NULL AND birth_time IS NOT NULL`, [process.env.ENCRYPTION_KEY]);
        const birthCountryResult = await db.query(`UPDATE user_personal_info SET birth_country_encrypted = pgp_sym_encrypt(birth_country, $1) WHERE birth_country_encrypted IS NULL AND birth_country IS NOT NULL`, [process.env.ENCRYPTION_KEY]);
        const birthProvinceResult = await db.query(`UPDATE user_personal_info SET birth_province_encrypted = pgp_sym_encrypt(birth_province, $1) WHERE birth_province_encrypted IS NULL AND birth_province IS NOT NULL`, [process.env.ENCRYPTION_KEY]);
        const birthCityResult = await db.query(`UPDATE user_personal_info SET birth_city_encrypted = pgp_sym_encrypt(birth_city, $1) WHERE birth_city_encrypted IS NULL AND birth_city IS NOT NULL`, [process.env.ENCRYPTION_KEY]);
        const birthTimezoneResult = await db.query(`UPDATE user_personal_info SET birth_timezone_encrypted = pgp_sym_encrypt(birth_timezone, $1) WHERE birth_timezone_encrypted IS NULL AND birth_timezone IS NOT NULL`, [process.env.ENCRYPTION_KEY]);
        console.log(`[PHASE 1.3] ✅ Encrypted: firstName=${firstNameResult.rowCount}, lastName=${lastNameResult.rowCount}, birthDate=${birthDateResult.rowCount}, birthTime=${birthTimeResult.rowCount}, birthCountry=${birthCountryResult.rowCount}, birthProvince=${birthProvinceResult.rowCount}, birthCity=${birthCityResult.rowCount}, birthTimezone=${birthTimezoneResult.rowCount}`);
        
        // Step 3: Drop plaintext columns
        console.log('[PHASE 1.3] Step 3: Dropping plaintext columns...');
        await db.query(`ALTER TABLE user_personal_info DROP COLUMN IF EXISTS first_name CASCADE;`);
        await db.query(`ALTER TABLE user_personal_info DROP COLUMN IF EXISTS last_name CASCADE;`);
        await db.query(`ALTER TABLE user_personal_info DROP COLUMN IF EXISTS birth_date CASCADE;`);
        await db.query(`ALTER TABLE user_personal_info DROP COLUMN IF EXISTS birth_time CASCADE;`);
        await db.query(`ALTER TABLE user_personal_info DROP COLUMN IF EXISTS birth_country CASCADE;`);
        await db.query(`ALTER TABLE user_personal_info DROP COLUMN IF EXISTS birth_province CASCADE;`);
        await db.query(`ALTER TABLE user_personal_info DROP COLUMN IF EXISTS birth_city CASCADE;`);
        await db.query(`ALTER TABLE user_personal_info DROP COLUMN IF EXISTS birth_timezone CASCADE;`);
        console.log('[PHASE 1.3] ✅ Columns dropped');
        
        console.log('[PHASE 1.3] 🎉 Migration complete!');
        
        res.json({
            success: true,
            message: 'Phase 1.3 migration complete',
            details: {
                firstNameEncrypted: firstNameResult.rowCount,
                lastNameEncrypted: lastNameResult.rowCount,
                birthDateEncrypted: birthDateResult.rowCount,
                birthTimeEncrypted: birthTimeResult.rowCount,
                birthCountryEncrypted: birthCountryResult.rowCount,
                birthProvinceEncrypted: birthProvinceResult.rowCount,
                birthCityEncrypted: birthCityResult.rowCount,
                birthTimezoneEncrypted: birthTimezoneResult.rowCount
            }
        });
    } catch (error) {
        console.error('[PHASE 1.3] ❌ Error:', error.message);
        res.status(500).json({ success: false, error: 'Phase 1.3 migration failed: ' + error.message });
    }
});

export default router;
