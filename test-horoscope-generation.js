/**
 * Diagnostic script to test horoscope generation end-to-end
 * This will help identify where the failure occurs
 */

import dotenv from 'dotenv';
dotenv.config();

import { generateHoroscope } from './api/services/chat/modules/handlers/horoscope-handler.js';
import { db } from './api/shared/db.js';
import { hashUserId } from './api/shared/hashUtils.js';

const TEST_USER_ID = process.env.TEST_USER_ID;

if (!TEST_USER_ID) {
    console.error('❌ Missing TEST_USER_ID environment variable');
    console.log('Usage: TEST_USER_ID=your_user_id node test-horoscope-generation.js');
    process.exit(1);
}

async function checkUserData() {
    console.log('\n📊 Checking user data...');
    const userIdHash = hashUserId(TEST_USER_ID);
    
    // Check personal info
    const { rows: personalInfo } = await db.query(
        `SELECT 
            pgp_sym_decrypt(first_name_encrypted, $1)::text as first_name,
            pgp_sym_decrypt(birth_city_encrypted, $1)::text as birth_city,
            pgp_sym_decrypt(birth_country_encrypted, $1)::text as birth_country
        FROM user_personal_info 
        WHERE user_id = $2`,
        [process.env.ENCRYPTION_KEY, TEST_USER_ID]
    );
    
    if (personalInfo.length === 0) {
        console.log('❌ No personal info found');
        return false;
    }
    console.log(`✅ Personal info: ${personalInfo[0].first_name}, ${personalInfo[0].birth_city}, ${personalInfo[0].birth_country}`);
    
    // Check astrology data
    const { rows: astroData } = await db.query(
        `SELECT astrology_data FROM user_astrology WHERE user_id_hash = $1`,
        [userIdHash]
    );
    
    if (astroData.length === 0) {
        console.log('❌ No astrology data found');
        return false;
    }
    
    const astro = typeof astroData[0].astrology_data === 'string' 
        ? JSON.parse(astroData[0].astrology_data)
        : astroData[0].astrology_data;
    
    console.log(`✅ Astrology data: ${astro.sun_sign || 'unknown'}, Moon: ${astro.moon_sign || 'unknown'}, Rising: ${astro.rising_sign || 'unknown'}`);
    
    return true;
}

async function checkExistingHoroscopes() {
    console.log('\n📋 Checking existing horoscopes...');
    const userIdHash = hashUserId(TEST_USER_ID);
    
    const { rows } = await db.query(
        `SELECT 
            id,
            role,
            horoscope_range,
            created_at_local_date,
            created_at
        FROM messages 
        WHERE user_id_hash = $1 
        AND role = 'horoscope'
        ORDER BY created_at DESC
        LIMIT 5`,
        [userIdHash]
    );
    
    if (rows.length === 0) {
        console.log('❌ No existing horoscopes found in database');
    } else {
        console.log(`✅ Found ${rows.length} existing horoscopes:`);
        rows.forEach((row, idx) => {
            console.log(`   ${idx + 1}. ID: ${row.id}, Range: ${row.horoscope_range}, Date: ${row.created_at_local_date}, Created: ${row.created_at}`);
        });
    }
    
    return rows.length;
}

async function testHoroscopeGeneration() {
    console.log('\n🔮 Testing horoscope generation...');
    
    try {
        console.log('Calling generateHoroscope()...');
        await generateHoroscope(TEST_USER_ID, 'daily');
        console.log('✅ generateHoroscope() completed without error');
        
        // Check if data was stored
        const count = await checkExistingHoroscopes();
        if (count > 0) {
            console.log('✅ Horoscope successfully stored in database');
        } else {
            console.log('❌ generateHoroscope() completed but NO data was stored');
        }
        
    } catch (err) {
        console.log('❌ generateHoroscope() threw an error:');
        console.log('Error message:', err.message);
        console.log('Error stack:', err.stack);
    }
}

async function runDiagnostics() {
    console.log('🧪 Horoscope Generation Diagnostics');
    console.log(`Testing for user: ${TEST_USER_ID}`);
    console.log(`Database: ${process.env.DB_HOST}`);
    
    try {
        // Step 1: Check user data
        const hasUserData = await checkUserData();
        if (!hasUserData) {
            console.log('\n❌ DIAGNOSIS: User data is incomplete. Cannot generate horoscope.');
            process.exit(1);
        }
        
        // Step 2: Check existing horoscopes
        const beforeCount = await checkExistingHoroscopes();
        
        // Step 3: Test generation
        await testHoroscopeGeneration();
        
        // Step 4: Verify storage
        console.log('\n📊 Final verification...');
        const afterCount = await checkExistingHoroscopes();
        
        if (afterCount > beforeCount) {
            console.log(`\n✅ SUCCESS: New horoscope was stored (${beforeCount} → ${afterCount})`);
        } else {
            console.log(`\n❌ FAILURE: No new horoscope was stored (${beforeCount} → ${afterCount})`);
        }
        
    } catch (err) {
        console.error('\n❌ Diagnostic failed with error:');
        console.error(err);
    } finally {
        await db.end();
    }
}

runDiagnostics().catch(console.error);
