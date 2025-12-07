import { Router } from "express";
import { db } from "../shared/db.js";
import { auth as firebaseAuth } from "../shared/firebase-admin.js";

const router = Router();

/**
 * DELETE /delete-temp-account/:tempUserId
 * Immediate cleanup when user exits
 * Deletes from database AND Firebase
 */
router.delete("/delete-temp-account/:tempUserId", async (req, res) => {
    try {
        const { tempUserId } = req.params;
        
        // Delete database records
        const r1 = await db.query(`DELETE FROM user_personal_info WHERE user_id = $1`, [tempUserId]);
        const r2 = await db.query(`DELETE FROM user_astrology WHERE user_id = $1`, [tempUserId]);
        const r3 = await db.query(`DELETE FROM messages WHERE user_id = $1`, [tempUserId]);

        await db.query(`DELETE FROM user_2fa_settings WHERE user_id = $1`, [tempUserId]);
        await db.query(`DELETE FROM user_2fa_codes WHERE user_id = $1`, [tempUserId]);

        // Delete from Firebase - THIS IS CRITICAL
        let firebaseDeleted = false;
        try {
            await firebaseAuth.deleteUser(tempUserId);
            firebaseDeleted = true;
        } catch (fbErr) {
        }

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
 * Batch cleanup for accounts older than 24 hours
 * Runs daily to prevent Firebase cost buildup from accumulating temp accounts
 */
router.delete("/cleanup-old-temp-accounts", async (req, res) => {
    try {
        const oneDayAgo = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);
                const { rows: oldTempUsers } = await db.query(
            `SELECT user_id FROM user_personal_info WHERE email LIKE 'temp_%@psychic.local' AND created_at < $1 LIMIT 500`,
            [oneDayAgo]
        );
        let deletedCount = 0;
        const uids = oldTempUsers.map(u => u.user_id);
        
        if (uids.length > 0) {
            await db.query(`DELETE FROM user_personal_info WHERE user_id = ANY($1)`, [uids]);
            await db.query(`DELETE FROM user_astrology WHERE user_id = ANY($1)`, [uids]);
            await db.query(`DELETE FROM messages WHERE user_id = ANY($1)`, [uids]);
            await db.query(`DELETE FROM user_2fa_settings WHERE user_id = ANY($1)`, [uids]);
            await db.query(`DELETE FROM user_2fa_codes WHERE user_id = ANY($1)`, [uids]);
            
            for (const uid of uids) {
                try { 
                    await firebaseAuth.deleteUser(uid); 
                    deletedCount++; 
                } catch (err) { 
                    console.error(`[CLEANUP] ✗ Failed to delete Firebase user ${uid}:`, err.code, err.message); 
                }
            }
        }
        
        console.log(`[CLEANUP] ✓ Daily cleanup completed: ${deletedCount} temp accounts deleted (older than 24 hours)`);
        res.json({ success: true, message: `Cleaned up ${deletedCount} old temp accounts (24+ hours old)`, deletedCount });
    } catch (err) {
        console.error('[CLEANUP] Batch cleanup error:', err);
        res.status(500).json({ error: 'Failed to cleanup old temp accounts', details: err.message });
    }
});

export default router;
