/**
 * Test which ENCRYPTION_KEY the API is actually using
 * Run with: node test-api-encryption-key.js
 */

import './api/env-loader.js';

console.log('\n=== API ENCRYPTION KEY TEST ===\n');
console.log('ENCRYPTION_KEY present:', !!process.env.ENCRYPTION_KEY);

if (process.env.ENCRYPTION_KEY) {
  const key = process.env.ENCRYPTION_KEY;
  console.log('Key length:', key.length);
  console.log('Key preview:', `${key.substring(0, 10)}...${key.substring(key.length - 10)}`);
  console.log('Full key:', key);
  console.log('Key (hex):', Buffer.from(key).toString('hex'));
} else {
  console.log('❌ ENCRYPTION_KEY is undefined!');
}

console.log('\n=== COMPARE WITH WORKER KEY ===\n');

// Load worker env
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, 'worker', '.env') });

const workerKey = process.env.ENCRYPTION_KEY;
console.log('Worker key preview:', workerKey ? `${workerKey.substring(0, 10)}...${workerKey.substring(workerKey.length - 10)}` : 'undefined');
console.log('Worker key full:', workerKey);

console.log('\n=== COMPARISON ===\n');
console.log('Keys match:', process.env.ENCRYPTION_KEY === workerKey);
