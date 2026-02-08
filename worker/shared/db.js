import dotenv from 'dotenv';
dotenv.config();

import pkg from "pg";
const { Pool } = pkg;

// Construct DATABASE_URL from individual env vars if not already set (for ECS deployment)
if (!process.env.DATABASE_URL && process.env.DB_HOST) {
    const dbUser = process.env.DB_USER || 'postgres';
    const dbPassword = process.env.DB_PASSWORD || '';
    const dbHost = process.env.DB_HOST;
    const dbPort = process.env.DB_PORT || '5432';
    const dbName = process.env.DB_NAME || 'postgres';
    
    process.env.DATABASE_URL = `postgres://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbName}`;
    console.log(`[WORKER DB] Constructed DATABASE_URL from components: postgres://${dbUser}:***@${dbHost}:${dbPort}/${dbName}`);
}

// Validate that DATABASE_URL is set
if (!process.env.DATABASE_URL) {
    console.error('❌ FATAL ERROR: DATABASE_URL environment variable is not set!');
    console.error('Please check your .env file or ensure DB_HOST, DB_USER, DB_PASSWORD, DB_PORT, and DB_NAME are set.');
    throw new Error('DATABASE_URL environment variable is required');
}

export const db = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false  // AWS RDS requires SSL but uses self-signed certificates
    }
});
