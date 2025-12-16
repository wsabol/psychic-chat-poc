import { createClient } from "redis";

let client = null;

async function getClient() {
    if (!client) {
        client = createClient({ url: process.env.REDIS_URL || 'redis://redis:6379' });
        client.on('error', (err) => console.error('Redis Client Error', err));
        await client.connect();
    }
    return client;
}

export async function enqueueMessage(job) {
    const redisClient = await getClient();
    await redisClient.rPush("chat-jobs", JSON.stringify(job));
}

export { getClient };
