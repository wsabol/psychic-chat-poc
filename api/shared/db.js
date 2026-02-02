import dotenv from "dotenv";
dotenv.config();

import pkg from "pg";
const { Pool } = pkg;
import { logCritical } from './errorLogger.js';

let pool = null;
let connectionTested = false;

function getPool() {
    if (!pool) {
        // Validate that DATABASE_URL is set
        if (!process.env.DATABASE_URL) {
            console.error('❌ FATAL ERROR: DATABASE_URL environment variable is not set!');
            console.error('Please check your .env file and ensure DATABASE_URL is defined.');
            throw new Error('DATABASE_URL environment variable is required');
        }

        // Validate that DATABASE_URL contains a password
        const url = process.env.DATABASE_URL;
        if (!url.includes(':') || !url.includes('@')) {
            console.error('❌ FATAL ERROR: DATABASE_URL is malformed. It should include username and password.');
            console.error('Expected format: postgres://username:password@host:port/database');
            throw new Error('DATABASE_URL is malformed');
        }

        pool = new Pool({
            connectionString: process.env.DATABASE_URL,
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
