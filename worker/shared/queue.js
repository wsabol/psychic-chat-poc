import { createClient } from "redis";

let client = null;
let connectPromise = null;

async function getClient() {
    if (client) {
        return client;
    }
    
    if (!connectPromise) {
        connectPromise = (async () => {
            // Use localhost for development, redis service for Docker production
            const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
            console.log(`[REDIS] Connecting to: ${redisUrl}`);
            client = createClient({ url: redisUrl });
            
            client.on('error', (err) => console.error('[REDIS] Client error:', err));
            client.on('connect', () => console.log('[REDIS] Connected'));
            client.on('ready', () => console.log('[REDIS] Ready'));
            
            await client.connect();
            return client;
        })();
    }
    
    return connectPromise;
}

export async function getMessageFromQueue() {
    const redisClient = await getClient();
    const job = await redisClient.lPop("chat-jobs");
    return job ? JSON.parse(job) : null;
}

export async function redis() {
    return getClient();
}
