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

console.log('[WORKER] Loaded .env from:', join(__dirname, '.env'));
console.log('[WORKER] ENCRYPTION_KEY present:', !!process.env.ENCRYPTION_KEY);

import { workerLoop } from "./processor.js";

workerLoop();
