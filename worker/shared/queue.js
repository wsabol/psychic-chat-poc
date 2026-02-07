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
            // Force IPv4 to match API configuration (Windows localhost resolution issue)
            client = createClient({ 
                url: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
                socket: { 
                    host: '127.0.0.1',
                    port: 6379,
                    family: 4,  // Force IPv4
                    connectTimeout: 5000,
                    reconnectStrategy: (retries) => Math.min(retries * 50, 500)
                }
            });
            
            await client.connect();
            return client;
        })();
    }
    
    return connectPromise;
}

export async function getMessageFromQueue() {
    const redisClient = await getClient();
    const job = await redisClient.lPop("chat-jobs");
    
    if (job) {
        return JSON.parse(job);
    } else {
        return null;
    }
}

export async function redis() {
    return getClient();
}
