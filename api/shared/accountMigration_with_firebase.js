import { db } from './db.js';
import { auth } from './firebase-admin.js';

/**
 * PHASE 3: Account Migration Service
 * 
 * Handles the migration of onboarding data from temporary user account
 * to new permanent user account
 */

/**
 * Migrate onboarding data from temp account to new permanent account
 * 
 * Steps:
 * 1. Fetch temp user's personal info
 * 2. Create user_personal_info row for new user with migrated data
 * 3. Insert onboarding oracle message into messages table
 * 4. Insert horoscope data if available
 * 5. Migrate astrology data
 * 6. Delete temp user from Firebase
 * 7. Delete temp user from database (cascade deletes messages)
 * 
 * @param {Object} options
 * @param {string} options.newUserId - New permanent user's Firebase UID
 * @param {string} options.temp_user_id - Temporary user's Firebase UID
 * @param {string} options.firstName - User's first name
 * @param {string} options.lastName - User's last name
 * @param {string} options.email - User's email
 * @param {Object} options.onboarding_first_message - Oracle's first response
 * @param {Object} options.onboarding_horoscope - Horoscope data from onboarding
 * @returns {Promise<Object>} Migration results
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
    // Step 0: Fetch temp user's personal info (birth date, location, etc.)
    console.log(`[MIGRATION] Step 0: Fetching temp user personal info`);
    let tempUserInfo = {};
    try {
      const tempResult = await db.query(
        `SELECT birth_date, birth_time, birth_country, birth_province, birth_city, 
                birth_timezone, sex, address_preference
         FROM user_personal_info WHERE user_id = $1`,
        [temp_user_id]
      );
      if (tempResult.rows.length > 0) {
        tempUserInfo = tempResult.rows[0];
        console.log(`[MIGRATION] ✓ Found temp user personal info`);
      }
    } catch (err) {
      console.warn(`[MIGRATION] Could not fetch temp user info:`, err.message);
    }
    
    // Step 1: Create user_personal_info for permanent user with migrated data
    console.log(`[MIGRATION] Step 1: Creating user_personal_info for ${newUserId}`);
    await db.query(
      `INSERT INTO user_personal_info (user_id, email, first_name, last_name, birth_date, 
                                       birth_time, birth_country, birth_province, birth_city,
                                       birth_timezone, sex, address_preference, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
       ON CONFLICT (user_id) DO UPDATE SET
       email = EXCLUDED.email,
       first_name = EXCLUDED.first_name,
       last_name = EXCLUDED.last_name,
       birth_date = EXCLUDED.birth_date,
       birth_time = EXCLUDED.birth_time,
       birth_country = EXCLUDED.birth_country,
       birth_province = EXCLUDED.birth_province,
       birth_city = EXCLUDED.birth_city,
       birth_timezone = EXCLUDED.birth_timezone,
       sex = EXCLUDED.sex,
       address_preference = EXCLUDED.address_preference,
       updated_at = NOW()`,
      [newUserId, email, firstName, lastName, 
       tempUserInfo.birth_date || null,
       tempUserInfo.birth_time || null,
       tempUserInfo.birth_country || null,
       tempUserInfo.birth_province || null,
       tempUserInfo.birth_city || null,
       tempUserInfo.birth_timezone || null,
       tempUserInfo.sex || null,
       tempUserInfo.address_preference || null]
    );
    migrationLog.steps.push({ 
      step: 'create_user_profile', 
      status: 'success',
      personal_info_migrated: !!tempUserInfo.birth_date
    });

    // Step 2: Migrate oracle's first message
    if (onboarding_first_message && onboarding_first_message.content) {
      console.log(`[MIGRATION] Step 2: Migrating first oracle message`);
      await db.query(
        `INSERT INTO messages (user_id, role, content, created_at)
         VALUES ($1, $2, $3, $4)`,
        [newUserId, 'assistant', onboarding_first_message.content, new Date().toISOString()]
      );
      migrationLog.steps.push({ 
        step: 'migrate_first_message', 
        status: 'success',
        content_length: onboarding_first_message.content.length
      });
      console.log(`[MIGRATION] ✓ First message migrated (${onboarding_first_message.content.length} chars)`);
    } else {
      migrationLog.steps.push({ step: 'migrate_first_message', status: 'skipped', reason: 'no_message_provided' });
    }

    // Step 3: Migrate horoscope data
    if (onboarding_horoscope && onboarding_horoscope.data) {
      console.log(`[MIGRATION] Step 3: Migrating horoscope data`);
      
      const horoscopeData = onboarding_horoscope.data;
      const horoscopeContent = JSON.stringify(horoscopeData);
      
      await db.query(
        `INSERT INTO messages (user_id, role, content, created_at)
         VALUES ($1, $2, $3, $4)`,
        [newUserId, 'horoscope', horoscopeContent, new Date().toISOString()]
      );
      
      migrationLog.steps.push({ 
        step: 'migrate_horoscope', 
        status: 'success',
        data_size: horoscopeContent.length
      });
      console.log(`[MIGRATION] ✓ Horoscope data migrated (${horoscopeContent.length} chars)`);
    } else {
      migrationLog.steps.push({ step: 'migrate_horoscope', status: 'skipped', reason: 'no_horoscope_provided' });
    }

    // Step 4: Migrate astrology data if it exists
    console.log(`[MIGRATION] Step 4: Migrating astrology data`);
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
        console.log(`[MIGRATION] ✓ Astrology data migrated`);
      } else {
        migrationLog.steps.push({ 
          step: 'migrate_astrology', 
          status: 'skipped',
          reason: 'no_astrology_data'
        });
      }
    } catch (astroErr) {
      console.warn(`[MIGRATION] Could not migrate astrology data:`, astroErr.message);
      migrationLog.steps.push({ 
        step: 'migrate_astrology', 
        status: 'warning',
        reason: astroErr.message
      });
    }
    
    // Step 5: Delete temporary user from Firebase
    console.log(`[MIGRATION] Step 5: Deleting temp user from Firebase: ${temp_user_id}`);
    try {
      await auth.deleteUser(temp_user_id);
      console.log(`[MIGRATION] ✓ Firebase temp user deleted`);
      migrationLog.steps.push({ 
        step: 'delete_firebase_temp_user', 
        status: 'success'
      });
    } catch (firebaseErr) {
      console.warn(`[MIGRATION] Could not delete Firebase temp user:`, firebaseErr.message);
      migrationLog.steps.push({ 
        step: 'delete_firebase_temp_user', 
        status: 'warning',
        reason: firebaseErr.message
      });
    }
    
    // Step 6: Delete temporary user from database (cascade deletes messages)
    console.log(`[MIGRATION] Step 6: Deleting temporary user from database: ${temp_user_id}`);
    const deleteResult = await db.query(
      `DELETE FROM user_personal_info WHERE user_id = $1`,
      [temp_user_id]
    );
    migrationLog.steps.push({ 
      step: 'delete_temp_user_db', 
      status: 'success',
      rows_deleted: deleteResult.rowCount
    });
    console.log(`[MIGRATION] ✓ Temporary user database record deleted (${deleteResult.rowCount} rows affected)`);

    migrationLog.endTime = new Date().toISOString();
    migrationLog.status = 'success';
    migrationLog.message = 'All onboarding data migrated successfully';

    return migrationLog;

  } catch (err) {
    console.error('[MIGRATION] Error during migration:', err.message);
    migrationLog.status = 'error';
    migrationLog.error = err.message;
    migrationLog.endTime = new Date().toISOString();
    throw err;
  }
}

/**
 * Verify migration was successful by checking if data exists in new account
 */
export async function verifyMigration(newUserId) {
  try {
    const result = await db.query(
      `SELECT 
        (SELECT COUNT(*) FROM user_personal_info WHERE user_id = $1) as user_count,
        (SELECT COUNT(*) FROM messages WHERE user_id = $1) as message_count,
        (SELECT COUNT(*) FROM messages WHERE user_id = $1 AND role = 'horoscope') as horoscope_count
      `,
      [newUserId]
    );

    return {
      userExists: result.rows[0].user_count > 0,
      messagesCount: parseInt(result.rows[0].message_count),
      horoscopeCount: parseInt(result.rows[0].horoscope_count)
    };
  } catch (err) {
    console.error('[MIGRATION] Verification failed:', err);
    throw err;
  }
}

/**
 * Rollback migration if something went wrong
 * (Not currently used, but available for error handling)
 */
export async function rollbackMigration(newUserId) {
  try {
    console.log(`[MIGRATION] Rolling back migration for ${newUserId}`);
    
    // Delete all data associated with new user
    await db.query('DELETE FROM messages WHERE user_id = $1', [newUserId]);
    await db.query('DELETE FROM user_personal_info WHERE user_id = $1', [newUserId]);
    
    console.log(`[MIGRATION] ✓ Rollback complete`);
    return { success: true };
  } catch (err) {
    console.error('[MIGRATION] Rollback failed:', err);
    throw err;
  }
}
