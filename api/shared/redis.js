import { createClient } from "redis";
import { logErrorFromCatch } from './errorLogger.js';

let client = null;
let isConnected = false;

// Lazy connection - only connect when needed
async function getClient() {
  if (!client) {
    const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
    
    // Use different config for production vs development
    const config = process.env.REDIS_URL 
      ? {
          // Production: Use REDIS_URL from environment (ElastiCache)
          url: redisUrl,
          socket: {
            connectTimeout: 10000,
            reconnectStrategy: (retries) => {
              const delay = Math.min(retries * 100, 3000);
              logErrorFromCatch(`Redis reconnection attempt ${retries}, waiting ${delay}ms`, 'redis');
              return delay;
            }
          }
        }
      : {
          // Development: Force IPv4 localhost
          url: redisUrl,
          socket: { 
            host: '127.0.0.1',
            port: 6379,
            family: 4,
            connectTimeout: 5000,
            reconnectStrategy: (retries) => Math.min(retries * 50, 500)
          }
        };
    
    client = createClient(config);
    
    client.on('error', (err) => {
      logErrorFromCatch('Redis Client Error', err);
      isConnected = false;
    });
    
    client.on('connect', () => {
      isConnected = true;
    });
    
    client.on('ready', () => {
      isConnected = true;
    });
    
    client.on('reconnecting', () => {
      isConnected = false;
    });
    
    try {
      await client.connect();
    } catch (err) {
      logErrorFromCatch('[REDIS-PUBSUB] Failed to connect to Redis:', err.message);
      console.warn('⚠️  Redis is not available. SSE notifications will use polling fallback.');
      client = null;
      isConnected = false;
      throw err;
    }
  }
  return client;
}

// Helper function to check if Redis is available
export const isRedisConnected = () => isConnected;

export { getClient };
export default { getClient, isRedisConnected };
