import { createClient } from "redis";
import dotenv from 'dotenv';
dotenv.config();

async function diagnose() {
    console.log('=== REDIS QUEUE DIAGNOSTICS ===\n');
    
    const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
    console.log(`Connecting to Redis: ${redisUrl}`);
    
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
        console.log('✅ Connected to Redis\n');
        
        // Check queue length
        const queueLength = await client.lLen("chat-jobs");
        console.log(`📊 Current queue length: ${queueLength} jobs`);
        
        if (queueLength > 0) {
            console.log('\n📋 Peeking at jobs in queue:');
            const jobs = await client.lRange("chat-jobs", 0, Math.min(queueLength - 1, 9));
            jobs.forEach((job, index) => {
                try {
                    const parsed = JSON.parse(job);
                    console.log(`  [${index}] userId: ${parsed.userId?.substring(0, 12)}..., message: "${parsed.message?.substring(0, 50)}..."`);
                } catch (e) {
                    console.log(`  [${index}] Invalid JSON: ${job.substring(0, 50)}...`);
                }
            });
        } else {
            console.log('ℹ️  Queue is empty - this explains why worker has no jobs to process\n');
        }
        
        // Test enqueue
        console.log('\n🧪 Testing enqueue operation...');
        const testJob = {
            userId: 'test-user-' + Date.now(),
            message: 'test message for diagnostics'
        };
        await client.rPush("chat-jobs", JSON.stringify(testJob));
        console.log('✅ Test job enqueued successfully');
        
        const newLength = await client.lLen("chat-jobs");
        console.log(`📊 Queue length after enqueue: ${newLength}`);
        
        // Test dequeue
        console.log('\n🧪 Testing dequeue operation...');
        const dequeuedJob = await client.lPop("chat-jobs");
        if (dequeuedJob) {
            const parsed = JSON.parse(dequeuedJob);
            console.log('✅ Test job dequeued successfully');
            console.log(`   Retrieved: userId=${parsed.userId}, message="${parsed.message}"`);
        } else {
            console.log('❌ Failed to dequeue test job');
        }
        
        const finalLength = await client.lLen("chat-jobs");
        console.log(`📊 Queue length after dequeue: ${finalLength}`);
        
        // Check Redis info
        console.log('\n🔍 Redis Server Info:');
        const info = await client.info('server');
        const lines = info.split('\r\n').filter(line => 
            line.includes('redis_version') || 
            line.includes('uptime_in_seconds') ||
            line.includes('connected_clients')
        );
        lines.forEach(line => console.log(`   ${line}`));
        
        await client.quit();
        console.log('\n✅ Diagnostics complete');
        
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
