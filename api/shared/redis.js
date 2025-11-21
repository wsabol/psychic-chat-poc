import { createClient } from "redis";

const client = createClient({ url: process.env.REDIS_URL || 'redis://redis:6379' });
client.connect();

export default client;
