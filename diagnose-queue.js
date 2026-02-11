import { createClient } from "redis";
import dotenv from 'dotenv';
dotenv.config();

async function diagnose() {
    
    const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
    
    const client = createClient({
        url: redisUrl,
        socket: {
            connectTimeout: 10000,
            reconnectStrategy: (retries) => Math.min(retries * 100, 3000)
        }
    });
    
    client.on('error', (err) => {
        console.error('❌ Redis Error:', err.message);
    });
    
    try {
        await client.connect();
        
        // Check queue length
        const queueLength = await client.lLen("chat-jobs");
        
        if (queueLength > 0) {
            const jobs = await client.lRange("chat-jobs", 0, Math.min(queueLength - 1, 9));
            jobs.forEach((job, index) => {
                    const parsed = JSON.parse(job);
            });
        } 
        
        // Test enqueue
        const testJob = {
            userId: 'test-user-' + Date.now(),
            message: 'test message for diagnostics'
        };
        await client.rPush("chat-jobs", JSON.stringify(testJob));
        
        const newLength = await client.lLen("chat-jobs");
        
        // Test dequeue
        const dequeuedJob = await client.lPop("chat-jobs");
        if (dequeuedJob) {
            const parsed = JSON.parse(dequeuedJob);
        }
        
        const finalLength = await client.lLen("chat-jobs");
        
        // Check Redis info
        const info = await client.info('server');
        const lines = info.split('\r\n').filter(line => 
            line.includes('redis_version') || 
            line.includes('uptime_in_seconds') ||
            line.includes('connected_clients')
        );
        
        await client.quit();
        
    } catch (err) {
        console.error('\n❌ Error during diagnostics:', err.message);
        console.error(err.stack);
        
        if (client.isOpen) {
            await client.disconnect();
        }
        process.exit(1);
    }
}

diagnose();
