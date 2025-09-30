import { createClient } from "redis";

const client = createClient({ url: process.env.REDIS_URL || '' });
client.connect();

export async function enqueueMessage(job: any) {
    await client.rPush("chat-jobs", JSON.stringify(job));
}
