import { Router } from "express";
import { authenticateToken } from "../middleware/auth.js";
import { db } from "../shared/db.js";
import { auth as firebaseAuth } from "../shared/firebase-admin.js";
import { getEncryptionKey } from "../shared/decryptionHelper.js";

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
        const ENCRYPTION_KEY = getEncryptionKey();
        
        // Encrypt email before storing
        const encResult = await db.query(
            'SELECT pgp_sym_encrypt($1::text, $2) as encrypted',
            [email, ENCRYPTION_KEY]
        );
        const encryptedEmail = encResult.rows[0]?.encrypted;

        await db.query(
            `INSERT INTO pending_migrations (temp_user_id, email_encrypted, migrated) 
             VALUES ($1, $2, false)
             ON CONFLICT (temp_user_id) DO UPDATE SET email_encrypted = $2, migrated = false`,
            [tempUserId, encryptedEmail]
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
        const ENCRYPTION_KEY = getEncryptionKey();

        // Step 1: Encrypt the email to compare with encrypted email in DB
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
 * POST /migration/encrypt-remaining-pii
 * Encrypt all remaining plaintext PII across all tables
 * 
 * PROTECTED ENDPOINT: Requires authentication
 * Should ideally be admin-only (add role check if needed)
 * 
 * This endpoint:
 * 1. Encrypts IP addresses in audit_logs
 * 2. Encrypts emails in pending_migrations
 * 3. Encrypts IPs and device names in security_sessions
 * 4. Encrypts IPs in user_sessions
 * 5. Encrypts IPs in user_account_lockouts
 * 6. Encrypts phone and email in verification_codes
 * 7. Encrypts email and IP in login_attempts
 */
router.post("/encrypt-remaining-pii", authenticateToken, async (req, res) => {
  try {
    console.log('[ENCRYPTION] 🔐 Starting PII encryption migration...');
    const ENCRYPTION_KEY = getEncryptionKey();
    
    const results = {
      auditLogsIp: 0,
      pendingMigrationsEmail: 0,
      securitySessionsIp: 0,
      securitySessionsDevice: 0,
      userSessionsIp: 0,
      accountLockoutsIp: 0,
      verificationCodesPhone: 0,
      verificationCodesEmail: 0,
      loginAttemptsEmail: 0,
      loginAttemptsIp: 0,
      timestamp: new Date().toISOString()
    };

    // 1. Encrypt audit_logs IPs
    console.log('[ENCRYPTION] Step 1: Encrypting audit_logs IP addresses...');
    const auditResult = await db.query(
      `UPDATE audit_logs 
       SET ip_address_encrypted = pgp_sym_encrypt(host(ip_address)::text, $1)
       WHERE ip_address IS NOT NULL AND ip_address_encrypted IS NULL`,
      [ENCRYPTION_KEY]
    );
    results.auditLogsIp = auditResult.rowCount;
    console.log(`[ENCRYPTION] ✅ Encrypted ${results.auditLogsIp} audit_logs IP addresses`);

    // 2. Encrypt pending_migrations emails
    console.log('[ENCRYPTION] Step 2: Encrypting pending_migrations emails...');
    const pendingResult = await db.query(
      `UPDATE pending_migrations
       SET email_encrypted = pgp_sym_encrypt(email::text, $1)
       WHERE email IS NOT NULL AND email_encrypted IS NULL`,
      [ENCRYPTION_KEY]
    );
    results.pendingMigrationsEmail = pendingResult.rowCount;
    console.log(`[ENCRYPTION] ✅ Encrypted ${results.pendingMigrationsEmail} pending_migrations emails`);

    // 3. Encrypt security_sessions IPs
    console.log('[ENCRYPTION] Step 3: Encrypting security_sessions IP addresses...');
    const secSessionIpResult = await db.query(
      `UPDATE security_sessions
       SET ip_address_encrypted = pgp_sym_encrypt(ip_address::text, $1)
       WHERE ip_address IS NOT NULL AND ip_address_encrypted IS NULL`,
      [ENCRYPTION_KEY]
    );
    results.securitySessionsIp = secSessionIpResult.rowCount;
    console.log(`[ENCRYPTION] ✅ Encrypted ${results.securitySessionsIp} security_sessions IP addresses`);

    // 3b. Encrypt security_sessions device names
    console.log('[ENCRYPTION] Step 3b: Encrypting security_sessions device names...');
    const secSessionDeviceResult = await db.query(
      `UPDATE security_sessions
       SET device_name_encrypted = pgp_sym_encrypt(device_name::text, $1)
       WHERE device_name IS NOT NULL AND device_name_encrypted IS NULL`,
      [ENCRYPTION_KEY]
    );
    results.securitySessionsDevice = secSessionDeviceResult.rowCount;
    console.log(`[ENCRYPTION] ✅ Encrypted ${results.securitySessionsDevice} security_sessions device names`);

    // 4. Encrypt user_sessions IPs
    console.log('[ENCRYPTION] Step 4: Encrypting user_sessions IP addresses...');
    const userSessionResult = await db.query(
      `UPDATE user_sessions
       SET ip_address_encrypted = pgp_sym_encrypt(host(ip_address)::text, $1)
       WHERE ip_address IS NOT NULL AND ip_address_encrypted IS NULL`,
      [ENCRYPTION_KEY]
    );
    results.userSessionsIp = userSessionResult.rowCount;
    console.log(`[ENCRYPTION] ✅ Encrypted ${results.userSessionsIp} user_sessions IP addresses`);

    // 5. Encrypt user_account_lockouts (extract IPs from JSON)
    console.log('[ENCRYPTION] Step 5: Encrypting user_account_lockouts IP addresses...');
    const lockoutsResult = await db.query(
      `UPDATE user_account_lockouts
       SET ip_addresses_encrypted = pgp_sym_encrypt(
         COALESCE(details->>'ip_addresses', '')::text, 
         $1
       )
       WHERE details->>'ip_addresses' IS NOT NULL 
         AND ip_addresses_encrypted IS NULL`,
      [ENCRYPTION_KEY]
    );
    results.accountLockoutsIp = lockoutsResult.rowCount;
    console.log(`[ENCRYPTION] ✅ Encrypted ${results.accountLockoutsIp} user_account_lockouts IP addresses`);

    // 6. Encrypt verification_codes phone numbers
    console.log('[ENCRYPTION] Step 6: Encrypting verification_codes phone numbers...');
    const verPhoneResult = await db.query(
      `UPDATE verification_codes
       SET phone_number_encrypted = pgp_sym_encrypt(phone_number::text, $1)
       WHERE phone_number IS NOT NULL AND phone_number_encrypted IS NULL`,
      [ENCRYPTION_KEY]
    );
    results.verificationCodesPhone = verPhoneResult.rowCount;
    console.log(`[ENCRYPTION] ✅ Encrypted ${results.verificationCodesPhone} verification_codes phone numbers`);

    // 7. Encrypt verification_codes emails
    console.log('[ENCRYPTION] Step 7: Encrypting verification_codes emails...');
    const verEmailResult = await db.query(
      `UPDATE verification_codes
       SET email_encrypted = pgp_sym_encrypt(email::text, $1)
       WHERE email IS NOT NULL AND email_encrypted IS NULL`,
      [ENCRYPTION_KEY]
    );
    results.verificationCodesEmail = verEmailResult.rowCount;
    console.log(`[ENCRYPTION] ✅ Encrypted ${results.verificationCodesEmail} verification_codes emails`);

    // 8. Encrypt login_attempts emails
    console.log('[ENCRYPTION] Step 8: Encrypting login_attempts emails...');
    const loginEmailResult = await db.query(
      `UPDATE login_attempts
       SET email_attempted_encrypted = pgp_sym_encrypt(email_attempted::text, $1)
       WHERE email_attempted IS NOT NULL AND email_attempted_encrypted IS NULL`,
      [ENCRYPTION_KEY]
    );
    results.loginAttemptsEmail = loginEmailResult.rowCount;
    console.log(`[ENCRYPTION] ✅ Encrypted ${results.loginAttemptsEmail} login_attempts emails`);

    // 9. Encrypt login_attempts IPs
    console.log('[ENCRYPTION] Step 9: Encrypting login_attempts IP addresses...');
    const loginIpResult = await db.query(
      `UPDATE login_attempts
       SET ip_address_encrypted = pgp_sym_encrypt(host(ip_address)::text, $1)
       WHERE ip_address IS NOT NULL AND ip_address_encrypted IS NULL`,
      [ENCRYPTION_KEY]
    );
    results.loginAttemptsIp = loginIpResult.rowCount;
    console.log(`[ENCRYPTION] ✅ Encrypted ${results.loginAttemptsIp} login_attempts IP addresses`);

    // Calculate total encrypted records
    const totalEncrypted = Object.values(results).filter(v => typeof v === 'number').reduce((a, b) => a + b, 0);

    console.log('[ENCRYPTION] 🎉 Migration complete!');
    console.log(`[ENCRYPTION] Total records encrypted: ${totalEncrypted}`);
    
    res.json({ 
      success: true, 
      message: 'PII encryption migration complete',
      results,
      totalEncrypted
    });
  } catch (error) {
    console.error('[ENCRYPTION] ❌ Error:', error.message);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      message: 'Encryption migration failed'
    });
  }
});

export default router;
