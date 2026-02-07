import pkg from "pg";
const { Pool } = pkg;
import { logCritical } from './errorLogger.js';

// Construct DATABASE_URL from individual env vars if not already set (for ECS deployment)
// This must happen at module load time, before any other code runs
if (!process.env.DATABASE_URL && process.env.DB_HOST) {
    const dbUser = process.env.DB_USER || 'postgres';
    const dbPassword = process.env.DB_PASSWORD;
    const dbHost = process.env.DB_HOST;
    const dbPort = process.env.DB_PORT || '5432';
    const dbName = process.env.DB_NAME || 'postgres';
    
    if (!dbPassword) {
        console.error('❌ FATAL ERROR: DB_PASSWORD environment variable is not set!');
        throw new Error('DB_PASSWORD environment variable is required');
    }
    
    process.env.DATABASE_URL = `postgres://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbName}`;
}

// Validate that DATABASE_URL is set
if (!process.env.DATABASE_URL) {
    console.error('❌ FATAL ERROR: DATABASE_URL environment variable is not set!');
    console.error('Please check your .env file and ensure DATABASE_URL is defined.');
    console.error('Alternatively, set DB_HOST, DB_USER, DB_PASSWORD, DB_PORT, and DB_NAME.');
    throw new Error('DATABASE_URL environment variable is required');
}

// Validate that DATABASE_URL contains a password
const url = process.env.DATABASE_URL;
if (!url.includes(':') || !url.includes('@')) {
    console.error('❌ FATAL ERROR: DATABASE_URL is malformed. It should include username and password.');
    console.error('Expected format: postgres://username:password@host:port/database');
    throw new Error('DATABASE_URL is malformed');
}

let pool = null;
let connectionTested = false;

function getPool() {
    if (!pool) {
        pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: {
                rejectUnauthorized: false  // AWS RDS requires SSL but uses self-signed certificates
            }
        });

        // Test the connection on first use
        if (!connectionTested) {
            connectionTested = true;
            pool.query('SELECT NOW()', async (err, res) => {
                if (err) {
                    console.error('❌ Database connection test failed:', err.message);
                    console.error('Please verify your DATABASE_URL is correct');
                    // Log to database for production monitoring
                    await logCritical({
                        service: 'database',
                        errorMessage: `Database connection test failed: ${err.message}`,
                        context: 'Initial connection test on pool creation',
                        errorStack: err.stack
                    }).catch(() => {
                        // If logging fails (likely due to db being down), silently continue
                    });
                } 
            });
        }
    }
    return pool;
}

// Export a proxy object that lazily initializes the pool
export const db = {
    query: (...args) => getPool().query(...args),
    connect: (...args) => getPool().connect(...args),
    end: (...args) => getPool().end(...args),
    on: (...args) => getPool().on(...args),
};
