import dotenv from "dotenv";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Explicitly load worker/.env file
dotenv.config({
  path: join(__dirname, '.env'),
  silent: process.env.NODE_ENV === 'production'
});

import { workerLoop, shutdownWorker } from "./processor.js";

// Graceful shutdown handler
let isShuttingDown = false;

async function gracefulShutdown(signal) {
  if (isShuttingDown) {
    console.log(`[WORKER] Already shutting down, ignoring ${signal}`);
    return;
  }
  
  isShuttingDown = true;
  console.log(`[WORKER] Received ${signal}, starting graceful shutdown...`);
  
  try {
    await shutdownWorker();
    console.log('[WORKER] Graceful shutdown completed');
    process.exit(0);
  } catch (err) {
    console.error('[WORKER] Error during shutdown:', err);
    process.exit(1);
  }
}

// Register shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (err) => {
  console.error('[WORKER] Uncaught exception:', err);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[WORKER] Unhandled rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});

// Start the worker
console.log('[WORKER] Starting up...');
workerLoop().catch(err => {
  console.error('[WORKER] Fatal error:', err);
  process.exit(1);
});
