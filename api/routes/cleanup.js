import { Router } from "express";
import { db } from "../shared/db.js";
import admin from "firebase-admin";

const router = Router();

/**
 * DELETE /delete-temp-account/:tempUserId
 * Immediate cleanup when user exits
 * Deletes from database AND Firebase
 */
router.delete("/delete-temp-account/:tempUserId", async (req, res) => {
    try {
        const { tempUserId } = req.params;
        console.log(`[CLEANUP] === Starting temp account deletion for ${tempUserId} ===`);

        // Delete database records
        console.log(`[CLEANUP] Deleting from user_personal_info...`);
        const r1 = await db.query(`DELETE FROM user_personal_info WHERE user_id = $1`, [tempUserId]);
        console.log(`[CLEANUP] Deleted ${r1.rowCount} rows from user_personal_info`);

        console.log(`[CLEANUP] Deleting from user_astrology...`);
        const r2 = await db.query(`DELETE FROM user_astrology WHERE user_id = $1`, [tempUserId]);
        console.log(`[CLEANUP] Deleted ${r2.rowCount} rows from user_astrology`);

        console.log(`[CLEANUP] Deleting from messages...`);
        const r3 = await db.query(`DELETE FROM messages WHERE user_id = $1`, [tempUserId]);
        console.log(`[CLEANUP] Deleted ${r3.rowCount} rows from messages`);

        await db.query(`DELETE FROM user_2fa_settings WHERE user_id = $1`, [tempUserId]);
        await db.query(`DELETE FROM user_2fa_codes WHERE user_id = $1`, [tempUserId]);

        // Delete from Firebase - THIS IS CRITICAL
        let firebaseDeleted = false;
        console.log(`[CLEANUP] *** CRITICAL: Attempting Firebase deletion for ${tempUserId} ***`);
        try {
            console.log(`[CLEANUP] Calling admin.auth().deleteUser(${tempUserId})`);
            await admin.auth().deleteUser(tempUserId);
            firebaseDeleted = true;
            console.log(`[CLEANUP] ✓ SUCCESS: Firebase user ${tempUserId} DELETED`);
        } catch (fbErr) {
            console.error(`[CLEANUP] ✗ FAILED: Firebase deletion error:`, fbErr.code, fbErr.message);
        }

        console.log(`[CLEANUP] === Temp account deletion complete ===`);
        res.json({ 
            success: true, 
            message: "Temporary account deleted",
            databaseDeleted: true,
            firebaseDeleted: firebaseDeleted
        });
    } catch (err) {
        console.error('[CLEANUP] ERROR in delete-temp-account:', err);
        res.status(500).json({ 
            error: 'Failed to delete temporary account', 
            details: err.message 
        });
    }
});

/**
 * DELETE /cleanup-old-temp-accounts
 * Batch cleanup for accounts older than 7 days
 */
router.delete("/cleanup-old-temp-accounts", async (req, res) => {
    try {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const { rows: oldTempUsers } = await db.query(
            `SELECT user_id FROM user_personal_info WHERE email LIKE 'temp_%@psychic.local' AND created_at < $1 LIMIT 500`,
            [sevenDaysAgo]
        );
        let deletedCount = 0;
        const uids = oldTempUsers.map(u => u.user_id);
        
        if (uids.length > 0) {
            console.log(`[CLEANUP] Batch deleting ${uids.length} old temp accounts...`);
            await db.query(`DELETE FROM user_personal_info WHERE user_id = ANY($1)`, [uids]);
            await db.query(`DELETE FROM user_astrology WHERE user_id = ANY($1)`, [uids]);
            await db.query(`DELETE FROM messages WHERE user_id = ANY($1)`, [uids]);
            await db.query(`DELETE FROM user_2fa_settings WHERE user_id = ANY($1)`, [uids]);
            await db.query(`DELETE FROM user_2fa_codes WHERE user_id = ANY($1)`, [uids]);
            
            for (const uid of uids) {
                try { 
                    await admin.auth().deleteUser(uid); 
                    deletedCount++; 
                } catch (err) { 
                    console.warn(`[CLEANUP] Firebase batch delete warning for ${uid}:`, err.message); 
                }
            }
        }
        
        console.log(`[CLEANUP] Batch cleanup complete: ${deletedCount}/${uids.length} old temp accounts deleted`);
        res.json({ success: true, message: `Cleaned up ${deletedCount} old temp accounts`, deletedCount });
    } catch (err) {
        console.error('[CLEANUP] Batch cleanup error:', err);
        res.status(500).json({ error: 'Failed to cleanup old temp accounts', details: err.message });
    }
});

export default router;
