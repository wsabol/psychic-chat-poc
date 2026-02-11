import { createClient } from "redis";
import { logErrorFromCatch } from './errorLogger.js';

let client = null;
let redisAvailable = true; // Track if Redis is available

async function getClient() {
    // If Redis previously failed, don't try again
    if (!redisAvailable) {
        throw new Error('Redis is unavailable');
    }
    
    if (!client) {
        const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
        
        // Use different config for production vs development
        const config = process.env.REDIS_URL 
            ? {
                // Production: Use REDIS_URL from environment (ElastiCache)
                url: redisUrl,
                socket: {
                    connectTimeout: 10000,  // 10 second timeout for ElastiCache
                    reconnectStrategy: (retries) => Math.min(retries * 100, 3000)  // Retry with backoff
                }
            }
            : {
                // Development: Force IPv4 localhost
                url: redisUrl,
                socket: { 
                    host: '127.0.0.1',
                    port: 6379,
                    family: 4,
                    connectTimeout: 2000,
                    reconnectStrategy: (retries) => Math.min(retries * 50, 500)
                }
            };
        
        client = createClient(config);
        
        client.on('error', (err) => {
            logErrorFromCatch('Redis Client Error', err);
            client = null;
            redisAvailable = false; // Mark as unavailable
        });
        
        client.on('connect', () => {
            redisAvailable = true;
        });
        
        try {
            await client.connect();
            redisAvailable = true;
        } catch (err) {
            logErrorFromCatch('[QUEUE] Failed to connect to Redis:', err.message);
            client = null;
            redisAvailable = false; // Mark as unavailable
            throw err;
        }
    }
    return client;
}

export async function enqueueMessage(job) {
    // If Redis is unavailable, throw error so fallback mechanisms work
    if (!redisAvailable) {
        throw new Error('Redis unavailable');
    }
    
    try {
        // Longer timeout for production ElastiCache - 5 seconds
        const timeoutMs = process.env.REDIS_URL ? 5000 : 2000;
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Redis timeout')), timeoutMs)
        );
        
        const redisClient = await Promise.race([
            getClient(),
            timeoutPromise
        ]);
        
        await Promise.race([
            redisClient.rPush("chat-jobs", JSON.stringify(job)),
            timeoutPromise
        ]);
    } catch (err) {
        console.error('[QUEUE] ❌ Redis unavailable, skipping queue');
        redisAvailable = false; // Mark as unavailable to skip future attempts
        // Throw so fallback mechanisms can handle it
        throw err;
    }
}

export { getClient };
