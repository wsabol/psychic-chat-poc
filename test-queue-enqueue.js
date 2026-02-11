// Test script to manually enqueue a message to Redis
import dotenv from 'dotenv';
dotenv.config();

import { createClient } from "redis";

async function testEnqueue() {
    const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
    
    console.log(`\n🔍 Testing Redis Queue`);
    console.log(`📍 Connecting to: ${redisUrl}\n`);
    
    const client = createClient({
        url: redisUrl,
        socket: {
            connectTimeout: 10000,
            reconnectStrategy: (retries) => Math.min(retries * 100, 3000)
        }
    });
    
    client.on('error', (err) => console.error('❌ Redis Error:', err.message));
    client.on('connect', () => console.log('✅ Connected to Redis'));
    
    try {
        await client.connect();
        
        // Check current queue length
        const beforeLength = await client.lLen("chat-jobs");
        
        // Enqueue a test message
        const testJob = {
            userId: "test_user_12345",
            message: "Hello, this is a test message!"
        };
        
        console.log(`\n📤 Enqueueing test job:`, testJob);
        await client.rPush("chat-jobs", JSON.stringify(testJob));
        
        // Verify it was added
        const afterLength = await client.lLen("chat-jobs");
        console.log(`📊 Queue length after enqueue: ${afterLength}`);
        
        if (afterLength > beforeLength) {
            console.log(`\n✅ SUCCESS: Job was enqueued successfully!`);
            console.log(`   Jobs added: ${afterLength - beforeLength}`);
        } else {
            console.log(`\n⚠️  WARNING: Queue length didn't increase as expected`);
        }
        
        // Show what's in the queue (peek without removing)
        console.log(`\n👀 Peeking at queue contents (first 5 jobs):`);
        const jobs = await client.lRange("chat-jobs", 0, 4);
        jobs.forEach((job, index) => {
            try {
                const parsed = JSON.parse(job);
                console.log(`   [${index}] userId: ${parsed.userId}, message: ${parsed.message?.substring(0, 50)}...`);
            } catch {
                console.log(`   [${index}] ${job.substring(0, 100)}`);
            }
        });
        
        await client.quit();
        console.log(`\n✅ Test complete - connection closed`);
        
    } catch (err) {
        console.error(`\n❌ ERROR:`, err.message);
        if (client) {
            await client.disconnect();
        }
        process.exit(1);
    }
}

testEnqueue();
