import { createClient } from 'redis';

async function checkQueue() {
    const redisUrl = 'redis://psychic-chat-redis-0rflqd.serverless.use1.cache.amazonaws.com:6379';
    
    const client = createClient({ url: redisUrl });
    
    await client.connect();
    
    const len = await client.lLen('chat-jobs');
    
    if (len > 0) {
        const jobs = await client.lRange('chat-jobs', 0, Math.min(len - 1, 4));
    }
    
    await client.disconnect();
}

checkQueue().catch(console.error);
