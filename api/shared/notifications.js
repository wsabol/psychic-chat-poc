import { getClient } from './queue.js';

/**
 * Check if a response is ready for a user and clear the notification
 * @param {string} userId - The user ID
 * @returns {Promise<object|null>} Notification data if ready, null otherwise
 */
export async function checkResponseReady(userId) {
    try {
        const redisClient = await getClient();
        const statusKey = `pending-response:${userId}`;
        
        // Get the notification if it exists
        const notification = await redisClient.get(statusKey);
        
        if (notification) {
            // Clear the notification
            await redisClient.del(statusKey);
            
            // Parse and return
            return JSON.parse(notification);
        }
        
        return null;
    } catch (err) {
        // Non-critical - return null on error
        return null;
    }
}
