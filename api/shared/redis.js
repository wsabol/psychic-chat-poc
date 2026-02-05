import dotenv from 'dotenv';
dotenv.config();

import { createClient } from "redis";
import { logErrorFromCatch } from './errorLogger.js';

// Parse Redis URL if provided, otherwise use default host/port
const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const redisConfig = {
  url: redisUrl,
  socket: {
    reconnectStrategy: (retries) => {
      // Exponential backoff: 50ms, 100ms, 200ms, ..., up to 3 seconds
      const delay = Math.min(retries * 50, 3000);
      logErrorFromCatch(`Redis reconnection attempt ${retries}, waiting ${delay}ms`, 'redis');
      return delay;
    },
    connectTimeout: 10000,  // 10 second timeout for initial connection
  }
};

const client = createClient(redisConfig);

// Track connection state
let isConnected = false;

client.on('connect', () => {
  console.log('✅ Redis connected');
  isConnected = true;
});

client.on('error', (err) => {
  logErrorFromCatch(err, 'redis', 'Redis error');
  isConnected = false;
});

client.on('reconnecting', () => {
  console.log('🔄 Redis reconnecting...');
  isConnected = false;
});

client.on('ready', () => {
  console.log('✅ Redis ready');
  isConnected = true;
});

// Attempt connection but don't crash app if it fails
// This allows the app to start even if Redis is temporarily unavailable
client.connect().catch(err => {
  logErrorFromCatch(err, 'redis', '⚠️  Redis initial connection failed - app will continue with degraded functionality');
  console.warn('⚠️  Redis is not available. SSE notifications will use polling fallback.');
  isConnected = false;
  // DO NOT exit - allow app to continue
});

// Helper function to check if Redis is available
export const isRedisConnected = () => isConnected;

export default client;
