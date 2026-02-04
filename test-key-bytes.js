/**
 * Test for hidden characters in ENCRYPTION_KEY
 */

import './api/env-loader.js';

const key = process.env.ENCRYPTION_KEY;

console.log('\n=== DETAILED KEY ANALYSIS ===\n');
console.log('Length:', key.length);
console.log('Key:', JSON.stringify(key)); // JSON.stringify will show \n, \r, etc.
console.log('\nByte-by-byte:');

for (let i = 0; i < key.length; i++) {
  const char = key[i];
  const code = key.charCodeAt(i);
  if (code < 32 || code > 126) {
    console.log(`  Position ${i}: SPECIAL CHARACTER - code ${code} (${code === 10 ? 'LINE FEED' : code === 13 ? 'CARRIAGE RETURN' : 'other'})`);
  }
}

console.log('\nContains newline:', key.includes('\n'));
console.log('Contains carriage return:', key.includes('\r'));
console.log('Contains tab:', key.includes('\t'));

console.log('\nKey with escapes visible:', key.replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t'));
