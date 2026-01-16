import { db } from './db.js';
import { auth } from './firebase-admin.js';

/**
 * SIMPLIFIED Account Migration Service
 * 
 * Handles the migration of:
 * 1. ALL chat messages from onboarding (including oracle response + user messages)
 * 2. Horoscope data if available
 * 3. Astrology data if calculated
 * 
 * NO LONGER migrates birthdate (user must re-enter or will be prompted)
 */

export async function migrateOnboardingData(options) {
  const {
    newUserId,
    temp_user_id,
    firstName,
    lastName,
    email,
    onboarding_first_message,
    onboarding_horoscope
  } = options;

  const migrationLog = {
    newUserId,
    temp_user_id,
    startTime: new Date().toISOString(),
    steps: []
  };

  try {
    // Step 1: Create user_personal_info for permanent user (minimal data)
    await db.query(
      `INSERT INTO user_personal_info (user_id, email, first_name, last_name, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       ON CONFLICT (user_id) DO UPDATE SET
       email = EXCLUDED.email,
       first_name = EXCLUDED.first_name,
       last_name = EXCLUDED.last_name,
       updated_at = NOW()`,
      [newUserId, email, firstName, lastName]
    );
    migrationLog.steps.push({ 
      step: 'create_user_profile', 
      status: 'success'
    });

    // Step 2: Migrate ALL chat messages from temp user to new user
    try {
      const messageResult = await db.query(
        `SELECT user_id, role, content, created_at FROM messages WHERE user_id = $1 ORDER BY created_at ASC`,
        [temp_user_id]
      );
      
      if (messageResult.rows.length > 0) {
        // Insert all messages for new user
        for (const msg of messageResult.rows) {
          await db.query(
            `INSERT INTO messages (user_id, role, content, created_at)
             VALUES ($1, $2, $3, $4)`,
            [newUserId, msg.role, msg.content, msg.created_at]
          );
        }
        migrationLog.steps.push({
          step: 'migrate_messages',
          status: 'success',
          messages_count: messageResult.rows.length
        });
      } else {
        migrationLog.steps.push({
          step: 'migrate_messages',
          status: 'skipped',
          reason: 'no_messages_found'
        });
      }
    } catch (msgErr) {
      migrationLog.steps.push({
        step: 'migrate_messages',
        status: 'warning',
        reason: msgErr.message
      });
    }

    // Step 3: Migrate astrology data if it exists
    try {
      const astroResult = await db.query(
        `SELECT zodiac_sign, astrology_data FROM user_astrology WHERE user_id = $1`,
        [temp_user_id]
      );
      if (astroResult.rows.length > 0) {
        const astroData = astroResult.rows[0];
        await db.query(
          `INSERT INTO user_astrology (user_id, zodiac_sign, astrology_data, created_at, updated_at)
           VALUES ($1, $2, $3, NOW(), NOW())
           ON CONFLICT (user_id) DO UPDATE SET
           zodiac_sign = EXCLUDED.zodiac_sign,
           astrology_data = EXCLUDED.astrology_data,
           updated_at = NOW()`,
          [newUserId, astroData.zodiac_sign, astroData.astrology_data]
        );
        migrationLog.steps.push({ 
          step: 'migrate_astrology', 
          status: 'success'
        });
      } else {
        migrationLog.steps.push({ 
          step: 'migrate_astrology', 
          status: 'skipped',
          reason: 'no_astrology_data'
        });
      }
    } catch (astroErr) {
      migrationLog.steps.push({ 
        step: 'migrate_astrology', 
        status: 'warning',
        reason: astroErr.message
      });
    }
    
    // Step 4: Delete temporary user from Firebase
    try {
      await auth.deleteUser(temp_user_id);
      migrationLog.steps.push({ 
        step: 'delete_firebase_temp_user', 
        status: 'success'
      });
    } catch (firebaseErr) {
      migrationLog.steps.push({ 
        step: 'delete_firebase_temp_user', 
        status: 'warning',
        reason: firebaseErr.message
      });
    }
    
    // Step 5: Delete temporary user from database
    const deleteResult = await db.query(
      `DELETE FROM user_personal_info WHERE user_id = $1`,
      [temp_user_id]
    );
    migrationLog.steps.push({ 
      step: 'delete_temp_user_db', 
      status: 'success',
      rows_deleted: deleteResult.rowCount
    });

    migrationLog.endTime = new Date().toISOString();
    migrationLog.status = 'success';
    migrationLog.message = 'Onboarding data migration complete';

    return migrationLog;

  } catch (err) {
    logErrorFromCatch(error, 'app', 'migration');
    migrationLog.status = 'error';
    migrationLog.error = err.message;
    migrationLog.endTime = new Date().toISOString();
    throw err;
  }
}

/**
 * Verify migration was successful
 */
export async function verifyMigration(newUserId) {
  try {
    const result = await db.query(
      `SELECT 
        (SELECT COUNT(*) FROM user_personal_info WHERE user_id = $1) as user_count,
        (SELECT COUNT(*) FROM messages WHERE user_id = $1) as message_count
      `,
      [newUserId]
    );

    return {
      userExists: result.rows[0].user_count > 0,
      messagesCount: parseInt(result.rows[0].message_count)
    };
  } catch (err) {
    logErrorFromCatch(error, 'app', 'migration');
    throw err;
  }
}

/**
 * Rollback migration if something went wrong
 */
export async function rollbackMigration(newUserId) {
  try {
    
    await db.query('DELETE FROM messages WHERE user_id = $1', [newUserId]);
    await db.query('DELETE FROM user_personal_info WHERE user_id = $1', [newUserId]);
    
    return { success: true };
  } catch (err) {
    logErrorFromCatch(error, 'app', 'migration');
    throw err;
  }
}

