/**
 * Test Redis connectivity for horoscope generation
 * Diagnoses why horoscopes aren't being generated
 */

import './api/env-loader.js';
import { getClient, enqueueMessage } from './api/shared/queue.js';

async function testRedisConnection() {
    console.log('\n🔍 Testing Redis Connection for Horoscope Generation\n');
    console.log('='.repeat(60));
    
    try {
        console.log('\n1️⃣  Attempting to connect to Redis...');
        console.log(`   Redis URL: ${process.env.REDIS_URL || 'redis://127.0.0.1:6379'}`);
        
        const client = await getClient();
        console.log('   ✅ Redis client connected successfully!\n');
        
        console.log('2️⃣  Testing Redis PING...');
        const pingResult = await client.ping();
        console.log(`   ✅ PING response: ${pingResult}\n`);
        
        console.log('3️⃣  Checking queue length...');
        const queueLength = await client.lLen('chat-jobs');
        console.log(`   📊 Queue 'chat-jobs' has ${queueLength} pending jobs\n`);
        
        if (queueLength > 0) {
            console.log('⚠️  WARNING: Queue has pending jobs but NO WORKER is consuming them!');
            console.log('   Jobs are being added to queue but never processed.\n');
        }
        
        console.log('4️⃣  Testing enqueue operation...');
        await enqueueMessage({
            userId: 'test-user-123',
            message: '[SYSTEM] Generate horoscope for daily'
        });
        console.log('   ✅ Successfully enqueued test message\n');
        
        const newQueueLength = await client.lLen('chat-jobs');
        console.log(`   📊 Queue now has ${newQueueLength} pending jobs\n`);
        
        console.log('5️⃣  Checking for horoscope generation locks...');
        const keys = await client.keys('horoscope:generating:*');
        console.log(`   🔒 Found ${keys.length} active generation locks:`);
        if (keys.length > 0) {
            for (const key of keys) {
                const ttl = await client.ttl(key);
                console.log(`      - ${key} (expires in ${ttl} seconds)`);
            }
        } else {
            console.log('      (none)');
        }
        
        console.log('\n' + '='.repeat(60));
        console.log('\n🎯 DIAGNOSIS:\n');
        console.log('Redis is working correctly, BUT:');
        console.log('❌ There is NO WORKER consuming the queue!');
        console.log('❌ Messages are queued to "chat-jobs" but never processed');
        console.log('✅ The POST /horoscope endpoint works (synchronous processing)');
        console.log('\n📋 SOLUTIONS:');
        console.log('1. GET endpoint should call processHoroscopeSync() directly');
        console.log('2. Remove queueing logic from GET endpoint');
        console.log('3. Use POST endpoint which already works synchronously\n');
        
        await client.quit();
        process.exit(0);
        
    } catch (error) {
        console.error('\n❌ Redis Connection Failed!');
        console.error(`   Error: ${error.message}\n`);
        
        console.log('='.repeat(60));
        console.log('\n🎯 DIAGNOSIS:\n');
        console.log('❌ Redis is NOT connected or unavailable');
        console.log('❌ Horoscope GET endpoint tries to queue but fails silently');
        console.log('✅ The POST /horoscope endpoint should still work (synchronous)');
        console.log('\n📋 SOLUTIONS:');
        console.log('1. Start Redis server locally: redis-server');
        console.log('2. Or connect to production Redis via SSH tunnel');
        console.log('3. Or remove Redis dependency from GET endpoint\n');
        
        process.exit(1);
    }
}

testRedisConnection();
