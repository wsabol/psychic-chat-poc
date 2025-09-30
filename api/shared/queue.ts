import { createClient } from "redis";

const client = createClient({ url: process.env.REDIS_URL || 'redis://redis:6379' });
client.connect();

export async function enqueueMessage(job: any) {
    await client.rPush("chat-jobs", JSON.stringify(job));
}
