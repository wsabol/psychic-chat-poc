import { createClient } from 'redis';

async function checkQueue() {
    const redisUrl = 'redis://psychic-chat-redis-0rflqd.serverless.use1.cache.amazonaws.com:6379';
    
    console.log('Connecting to Redis...');
    const client = createClient({ url: redisUrl });
    
    await client.connect();
    console.log('Connected!');
    
    const len = await client.lLen('chat-jobs');
    console.log(`Queue length: ${len}`);
    
    if (len > 0) {
        const jobs = await client.lRange('chat-jobs', 0, Math.min(len - 1, 4));
        console.log('First few jobs:', jobs);
    }
    
    await client.disconnect();
    console.log('Done!');
}

checkQueue().catch(console.error);
