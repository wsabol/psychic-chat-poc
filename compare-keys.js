/**
 * Compare encryption keys byte-by-byte
 * Run with: node compare-keys.js
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load API key
dotenv.config({ path: join(__dirname, 'api', '.env') });
const API_KEY = process.env.ENCRYPTION_KEY;

// Clear and load worker key
delete process.env.ENCRYPTION_KEY;
dotenv.config({ path: join(__dirname, 'worker', '.env'), override: true });
const WORKER_KEY = process.env.ENCRYPTION_KEY;

console.log('=== KEY COMPARISON ===\n');
console.log('API key length:', API_KEY?.length || 'UNDEFINED');
console.log('Worker key length:', WORKER_KEY?.length || 'UNDEFINED');
console.log('\nAPI preview:', API_KEY ? `${API_KEY.substring(0, 10)}...${API_KEY.substring(API_KEY.length - 10)}` : 'UNDEFINED');
console.log('Worker preview:', WORKER_KEY ? `${WORKER_KEY.substring(0, 10)}...${WORKER_KEY.substring(WORKER_KEY.length - 10)}` : 'UNDEFINED');

console.log('\nKeys match:', API_KEY === WORKER_KEY);

if (API_KEY !== WORKER_KEY && API_KEY && WORKER_KEY) {
  console.log('\n❌ KEYS ARE DIFFERENT!');
  console.log('\nFinding first difference:');
  
  const minLen = Math.min(API_KEY.length, WORKER_KEY.length);
  for (let i = 0; i < minLen; i++) {
    if (API_KEY[i] !== WORKER_KEY[i]) {
      console.log(`Position ${i}:`);
      console.log(`  API char: '${API_KEY[i]}' (code: ${API_KEY.charCodeAt(i)})`);
      console.log(`  Worker char: '${WORKER_KEY[i]}' (code: ${WORKER_KEY.charCodeAt(i)})`);
      console.log(`  Context: ...${API_KEY.substring(Math.max(0, i-5), i+6)}...`);
      break;
    }
  }
  
  if (API_KEY.length !== WORKER_KEY.length) {
    console.log(`\nLength mismatch: API has ${API_KEY.length}, Worker has ${WORKER_KEY.length}`);
  }
} else if (API_KEY === WORKER_KEY) {
  console.log('\n✅ KEYS MATCH PERFECTLY!');
  console.log('The decryption issue must be elsewhere.');
}

process.exit(0);
