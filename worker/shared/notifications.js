import { redis } from './queue.js';

/**
 * Notify that a response is ready for a user
 * This signals the frontend that it should fetch the updated messages
 * @param {string} userId - The user ID
 * @param {string} messageType - Type of message (chat, horoscope, moon_phase, cosmic_weather, etc)
 * @param {string} timestamp - When the message was stored (ISO string)
 */
export async function notifyResponseReady(userId, messageType = 'assistant', timestamp = new Date().toISOString()) {
    try {
        const redisClient = await redis();
        const channel = `response-ready:${userId}`;
        const notification = JSON.stringify({
            messageType,
            timestamp,
            notifiedAt: new Date().toISOString()
        });
        
        // Publish to Redis pub/sub for real-time notification
        await redisClient.publish(channel, notification);
        
        // Also store in a set for status checking (expires in 60 seconds)
        const statusKey = `pending-response:${userId}`;
        await redisClient.setEx(statusKey, 60, notification);
    } catch (err) {
        // Non-critical - don't fail the main operation if notification fails
    }
}
