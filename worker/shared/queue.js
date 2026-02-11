import { createClient } from "redis";

let client = null;
let connectPromise = null;

async function getClient() {
    if (client) {
        return client;
    }
    
    if (!connectPromise) {
        connectPromise = (async () => {
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
                console.error('[REDIS] Connection error:', err.message);
            });
            
            client.on('connect', () => {
                console.log('[REDIS] Connected successfully');
            });
            
            await client.connect();
            console.log(`[REDIS] Worker connected to ${process.env.REDIS_URL ? 'ElastiCache' : 'localhost'}`);
            return client;
        })();
    }
    
    return connectPromise;
}

export async function getMessageFromQueue() {
    try {
        const redisClient = await getClient();
        
        // Check queue length before popping
        const queueLength = await redisClient.lLen("chat-jobs");
        if (queueLength > 0) {
            console.log(`[QUEUE] Queue has ${queueLength} job(s), attempting to dequeue...`);
        }
        
        // Add timeout to prevent indefinite hanging
        const timeout = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('lPop timeout')), 5000)
        );
        
        const jobPromise = redisClient.lPop("chat-jobs");
        const job = await Promise.race([jobPromise, timeout]);
        
        if (job) {
            console.log('[QUEUE] ✅ Successfully dequeued job');
            return JSON.parse(job);
        } else {
            return null;
        }
    } catch (err) {
        if (err.message === 'lPop timeout') {
            console.error('[QUEUE] Redis lPop operation timed out after 5s');
            return null;
        }
        console.error('[QUEUE] ❌ Error getting message from queue:', err.message);
        throw err;
    }
}

export async function redis() {
    return getClient();
}

export async function closeRedisConnection() {
    if (client) {
        try {
            console.log('[REDIS] Closing connection...');
            await client.quit();
            client = null;
            connectPromise = null;
            console.log('[REDIS] Connection closed successfully');
        } catch (err) {
            console.error('[REDIS] Error closing connection:', err.message);
            // Force disconnect if quit fails
            if (client) {
                await client.disconnect();
                client = null;
                connectPromise = null;
            }
        }
    }
}
