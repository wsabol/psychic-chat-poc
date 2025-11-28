import { Router } from "express";
import { db } from "../shared/db.js";
import admin from "firebase-admin";

const router = Router();

/**
 * Clean up abandoned temporary accounts
 * Deletes temp users that haven't had activity in 1 hour
 */
router.post("/cleanup-temp-accounts", async (req, res) => {
    try {
        // Find temporary users who haven't had activity in the last hour
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        
        const { rows: abandonedUsers } = await db.query(
            `SELECT user_id FROM user_personal_info 
             WHERE email LIKE 'tempuser%' 
             AND (updated_at < $1 OR created_at < $1)
             LIMIT 100`,
            [oneHourAgo]
        );

        let deletedCount = 0;
        const firebaseUidsToDelete = [];

        // Collect Firebase UIDs and database user IDs
        for (const user of abandonedUsers) {
            firebaseUidsToDelete.push(user.user_id);
        }

        // Delete from database
        if (firebaseUidsToDelete.length > 0) {
            // Delete personal info
            await db.query(
                `DELETE FROM user_personal_info WHERE user_id = ANY($1)`,
                [firebaseUidsToDelete]
            );

            // Delete astrology data
            await db.query(
                `DELETE FROM user_astrology WHERE user_id = ANY($1)`,
                [firebaseUidsToDelete]
            );

            // Delete messages
            await db.query(
                `DELETE FROM messages WHERE user_id = ANY($1)`,
                [firebaseUidsToDelete]
            );

            // Delete 2FA settings
            await db.query(
                `DELETE FROM user_2fa_settings WHERE user_id = ANY($1)`,
                [firebaseUidsToDelete]
            );

            // Delete 2FA codes
            await db.query(
                `DELETE FROM user_2fa_codes WHERE user_id = ANY($1)`,
                [firebaseUidsToDelete]
            );

            // Delete from Firebase
            for (const uid of firebaseUidsToDelete) {
                try {
                    await admin.auth().deleteUser(uid);
                    deletedCount++;
                } catch (err) {
                    console.warn(`Failed to delete Firebase user ${uid}:`, err.message);
                }
            }
        }

        res.json({ 
            success: true, 
            message: `Cleaned up ${deletedCount} abandoned temporary accounts` 
        });
    } catch (err) {
        console.error('Error cleaning up temp accounts:', err);
        res.status(500).json({ 
            error: 'Failed to cleanup temporary accounts', 
            details: err.message 
        });
    }
});

/**
 * Delete temp account when user creates real account
 * Called during account creation flow
 */
router.post("/delete-temp-account/:tempUserId", async (req, res) => {
    try {
        const { tempUserId } = req.params;

        // Delete database records
        await db.query(
            `DELETE FROM user_personal_info WHERE user_id = $1`,
            [tempUserId]
        );

        await db.query(
            `DELETE FROM user_astrology WHERE user_id = $1`,
            [tempUserId]
        );

        await db.query(
            `DELETE FROM messages WHERE user_id = $1`,
            [tempUserId]
        );

        await db.query(
            `DELETE FROM user_2fa_settings WHERE user_id = $1`,
            [tempUserId]
        );

        await db.query(
            `DELETE FROM user_2fa_codes WHERE user_id = $1`,
            [tempUserId]
        );

        // Delete from Firebase
        try {
            await admin.auth().deleteUser(tempUserId);
        } catch (err) {
            console.warn(`Firebase deletion warning for ${tempUserId}:`, err.message);
        }

        res.json({ success: true, message: "Temporary account deleted" });
    } catch (err) {
        console.error('Error deleting temp account:', err);
        res.status(500).json({ 
            error: 'Failed to delete temporary account', 
            details: err.message 
        });
    }
});

export default router;
