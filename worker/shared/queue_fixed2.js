import { createClient } from "redis";

let client = null;
let connectPromise = null;

async function getClient() {
    if (client) {
        return client;
    }
    
    if (!connectPromise) {
        connectPromise = (async () => {
            client = createClient({ url: process.env.REDIS_URL || 'redis://redis:6379' });
            await client.connect();
            console.log('[REDIS] Connected successfully');
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

// Export redis as a lazy getter
export const redis = {
    async setEx(key, ttl, value) {
        const redisClient = await getClient();
        return redisClient.setEx(key, ttl, value);
    }
};
