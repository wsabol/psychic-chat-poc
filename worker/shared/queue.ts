import { createClient } from "redis";

const client = createClient({ url: process.env.REDIS_URL || '' });
client.connect();

export async function getMessageFromQueue() {
    const job = await client.lPop("chat-jobs");
    return job ? JSON.parse(job) : null;
}
