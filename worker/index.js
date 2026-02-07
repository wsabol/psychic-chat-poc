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

import { workerLoop } from "./processor.js";

workerLoop().catch(err => {
  console.error('[WORKER] Fatal error:', err);
  process.exit(1);
});
