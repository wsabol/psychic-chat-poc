/**
 * Whitelist localhost for unlimited free trial testing
 * Run: node whitelist-localhost.js
 */

import './api/env-loader.js';  // Load environment variables
import { db } from './api/shared/db.js';
import crypto from 'crypto';

async function whitelistLocalhost() {
  try {
    const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
    
    if (!ENCRYPTION_KEY) {
      console.error('❌ ENCRYPTION_KEY not found in environment!');
      process.exit(1);
    }
    
    // Hash localhost IPs
    const ipv4Hash = crypto.createHash('sha256').update('127.0.0.1').digest('hex').substring(0, 64);
    const ipv6Hash = crypto.createHash('sha256').update('::1').digest('hex').substring(0, 64);
    const devUserHash = crypto.createHash('sha256').update('dev-localhost').digest('hex').substring(0, 64);
    
    // Insert/update whitelist entries
    const result1 = await db.query(`
      INSERT INTO free_trial_whitelist 
        (ip_address_hash, ip_address_encrypted, device_name, browser_info, user_id_hash, is_active)
      VALUES 
        ($1, pgp_sym_encrypt($2, $3), $4, $5, $6, true)
      ON CONFLICT (ip_address_hash) DO UPDATE 
        SET is_active = true, 
            last_used_at = NOW()
      RETURNING id, device_name
    `, [ipv4Hash, '127.0.0.1', ENCRYPTION_KEY, 'Localhost Development', 'Development Environment', devUserHash]);
    
    const result2 = await db.query(`
      INSERT INTO free_trial_whitelist 
        (ip_address_hash, ip_address_encrypted, device_name, browser_info, user_id_hash, is_active)
      VALUES 
        ($1, pgp_sym_encrypt($2, $3), $4, $5, $6, true)
      ON CONFLICT (ip_address_hash) DO UPDATE 
        SET is_active = true, 
            last_used_at = NOW()
      RETURNING id, device_name
    `, [ipv6Hash, '::1', ENCRYPTION_KEY, 'Localhost IPv6', 'Development Environment', devUserHash]);
    
    await db.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error whitelisting localhost:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

whitelistLocalhost();
