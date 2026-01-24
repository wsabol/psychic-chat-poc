import dotenv from 'dotenv';
dotenv.config();

import { createClient } from "redis";
import { logErrorFromCatch } from '../../shared/errorLogger.js';

let client = null;

async function getClient() {
    if (!client) {
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
        client.on('error', (err) => logErrorFromCatch('Redis Client Error', err));
        try {
            await client.connect();
        } catch (err) {
            logErrorFromCatch('[QUEUE] Failed to connect to Redis:', err.message);
            client = null;
            throw err;
        }
    }
    return client;
}

export async function enqueueMessage(job) {
    const redisClient = await getClient();
    await redisClient.rPush("chat-jobs", JSON.stringify(job));
}

export { getClient };
