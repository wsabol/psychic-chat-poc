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
    return;
  }
  
  isShuttingDown = true;
  
  try {
    await shutdownWorker();
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
workerLoop().catch(err => {
  console.error('[WORKER] Fatal error:', err);
  process.exit(1);
});
