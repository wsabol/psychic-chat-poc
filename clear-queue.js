import { createClient } from 'redis';

async function clearQueue() {
    try {
        const client = createClient({ url: 'redis://localhost:6379' });
        await client.connect();
        
        const deleted = await client.del('chat-jobs');

        
        await client.quit();
        process.exit(0);
    } catch (err) {
        console.error('❌ Error clearing queue:', err.message);
        process.exit(1);
    }
}

clearQueue();
