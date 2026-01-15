import dotenv from 'dotenv';
dotenv.config();

import { createClient } from "redis";

const client = createClient({
  url: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
  socket: {
    host: '127.0.0.1',
    port: 6379,
    family: 4  // Force IPv4
  }
});

client.connect().catch(err => {
  console.error('[REDIS] Connection failed:', err.message);
  process.exit(1);
});

export default client;
