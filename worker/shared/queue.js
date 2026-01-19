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
            client = createClient({ url: redisUrl });
            
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
