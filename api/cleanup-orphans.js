import { db } from "./shared/db.js";
import admin from "firebase-admin";
import serviceAccount from "./service-account-key.json" assert { type: "json" };

// Initialize Firebase Admin if not already done
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

async function cleanupOrphanedTempAccounts() {
    try {
        
        // Get all temp users from database
        const { rows: allTempUsers } = await db.query(
            `SELECT user_id, email FROM user_personal_info WHERE email LIKE 'temp_%@psychic.local' ORDER BY created_at DESC`
        );
        
        // For each temp user, check if they still exist in Firebase
        // If they don't, clean up database
        let orphanedCount = 0;
        
        for (const user of allTempUsers) {
            try {
                await admin.auth().getUser(user.user_id);
            } catch (err) {
                // User doesn't exist in Firebase
                
                // Delete from database
                await db.query(`DELETE FROM user_personal_info WHERE user_id = $1`, [user.user_id]);
                await db.query(`DELETE FROM user_astrology WHERE user_id = $1`, [user.user_id]);
                await db.query(`DELETE FROM messages WHERE user_id = $1`, [user.user_id]);
                await db.query(`DELETE FROM user_2fa_settings WHERE user_id = $1`, [user.user_id]);
                await db.query(`DELETE FROM user_2fa_codes WHERE user_id = $1`, [user.user_id]);
                
                orphanedCount++;
            }
        }
        
        process.exit(0);
    } catch (err) {
        console.error('[CLEANUP-ORPHANS] Error:', err);
        process.exit(1);
    }
}

cleanupOrphanedTempAccounts();
