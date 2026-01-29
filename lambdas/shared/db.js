/**
 * Database Connection Manager for Lambda Functions
 * 
 * Supports two modes:
 * 1. Local Development: Uses DATABASE_URL environment variable
 * 2. AWS Deployment: Uses AWS Secrets Manager for credentials
 * 
 * Connection pooling optimized for Lambda:
 * - Small pool size (1-2 connections per Lambda)
 * - Reuses connections across invocations
 * - Automatic cleanup on errors
 */

import { Pool } from 'pg';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

let dbPool = null;
let secrets = null;

/**
 * Load database credentials from AWS Secrets Manager
 * @returns {Promise<Object>} Database credentials
 */
async function loadSecretsFromAWS() {
  if (secrets) {
    return secrets;
  }

  const secretName = process.env.DB_SECRET_NAME || 'psychic-chat/database';
  const region = process.env.AWS_REGION || 'us-east-1';

  const client = new SecretsManagerClient({ region });
  
  try {
    const response = await client.send(
      new GetSecretValueCommand({ SecretId: secretName })
    );
    
    secrets = JSON.parse(response.SecretString);
    console.log('[DB] Loaded credentials from AWS Secrets Manager');
    return secrets;
  } catch (error) {
    console.error('[DB] Failed to load secrets from AWS:', error.message);
    throw new Error(`Failed to load database credentials: ${error.message}`);
  }
}

/**
 * Get database pool instance
 * Creates a new pool if one doesn't exist, otherwise reuses existing
 * @returns {Promise<Pool>} PostgreSQL connection pool
 */
export async function getDbPool() {
  if (dbPool) {
    return dbPool;
  }

  try {
    // Check if running in AWS Lambda environment
    const isLambda = !!process.env.AWS_LAMBDA_FUNCTION_NAME;
    
    if (isLambda && !process.env.USE_LOCAL_DB) {
      // AWS Mode: Load credentials from Secrets Manager
      console.log('[DB] Running in AWS Lambda - loading credentials from Secrets Manager');
      const creds = await loadSecretsFromAWS();
      
      dbPool = new Pool({
        host: creds.host,
        port: creds.port || 5432,
        database: creds.database,
        user: creds.username,
        password: creds.password,
        max: 2, // Limit connections for Lambda
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
        ssl: {
          rejectUnauthorized: false // RDS requires SSL
        }
      });
    } else {
      // Local Mode: Use DATABASE_URL from environment
      console.log('[DB] Running locally - using DATABASE_URL');
      
      if (!process.env.DATABASE_URL) {
        throw new Error('DATABASE_URL environment variable is not set');
      }
      
      dbPool = new Pool({
        connectionString: process.env.DATABASE_URL,
        max: 2,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000
      });
    }

    // Test the connection
    const client = await dbPool.connect();
    await client.query('SELECT NOW()');
    client.release();
    
    console.log('[DB] Database connection pool created successfully');
    return dbPool;
    
  } catch (error) {
    console.error('[DB] Failed to create database pool:', error.message);
    dbPool = null; // Reset on failure
    throw error;
  }
}

/**
 * Execute a database query
 * Convenience wrapper around pool.query
 * @param {string} text - SQL query text
 * @param {Array} params - Query parameters
 * @returns {Promise<Object>} Query result
 */
export async function query(text, params) {
  const pool = await getDbPool();
  return pool.query(text, params);
}

/**
 * Close all database connections
 * Call this during Lambda shutdown or testing cleanup
 */
export async function closePool() {
  if (dbPool) {
    await dbPool.end();
    dbPool = null;
    secrets = null;
    console.log('[DB] Database pool closed');
  }
}

/**
 * Export pool getter as default db object (compatible with existing code)
 */
export const db = {
  query: async (text, params) => {
    const pool = await getDbPool();
    return pool.query(text, params);
  },
  getPool: getDbPool
};

export default db;
