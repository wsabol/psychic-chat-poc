import { createClient } from "redis";
import { logErrorFromCatch } from './errorLogger.js';

let client = null;

async function getClient() {
    if (!client) {
        const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
        
        // Use different config for production vs development
        const config = process.env.REDIS_URL 
            ? {
                // Production: Use REDIS_URL from environment (ElastiCache)
                url: redisUrl,
                socket: {
                    connectTimeout: 10000,
                    reconnectStrategy: (retries) => Math.min(retries * 100, 3000)
                }
            }
            : {
                // Development: Force IPv4 localhost
                url: redisUrl,
                socket: { 
                    host: '127.0.0.1',
                    port: 6379,
                    family: 4,
                    connectTimeout: 5000,
                    reconnectStrategy: (retries) => Math.min(retries * 50, 500)
                }
            };
        
        client = createClient(config);
        
        client.on('error', (err) => {
            logErrorFromCatch('Redis Client Error', err);
        });
        
        client.on('connect', () => {
            console.log('[REDIS] API connected successfully');
        });
        
        try {
            await client.connect();
            console.log(`[REDIS] API connected to ${process.env.REDIS_URL ? 'ElastiCache' : 'localhost'}`);
        } catch (err) {
            logErrorFromCatch('[QUEUE] Failed to connect to Redis:', err.message);
            client = null;
            throw err;
        }
    }
    return client;
}

export async function enqueueMessage(job) {
    console.log('[QUEUE] Attempting to enqueue message for user:', job.userId?.substring(0, 8));
    
    try {
        // ✅ TIMEOUT: Increased to 15 seconds for production ElastiCache
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Redis timeout')), 15000)
        );
        
        const redisClient = await Promise.race([
            getClient(),
            timeoutPromise
        ]);
        console.log('[QUEUE] Redis client obtained, pushing to queue...');
        
        await Promise.race([
            redisClient.rPush("chat-jobs", JSON.stringify(job)),
            timeoutPromise
        ]);
        
        // Verify job was added (with timeout)
        const queueLength = await Promise.race([
            redisClient.lLen("chat-jobs"),
            timeoutPromise
        ]).catch(() => 0); // If verification fails, just log 0
        
        console.log(`[QUEUE] ✅ Message enqueued successfully! Queue length: ${queueLength}`);
    } catch (err) {
        console.error('[QUEUE] ❌ Failed to enqueue message:', err.message);
        // Don't throw - allow operation to complete even if queue fails
        // The message just won't be queued, but personal info is still saved
    }
}

export { getClient };
