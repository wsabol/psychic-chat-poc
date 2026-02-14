import './api/env-loader.js';  // Load environment variables
import { db } from './api/shared/db.js';

async function checkSessions() {
  try {
    const result = await db.query(`
      SELECT id, user_id_hash, ip_address_hash, current_step, is_completed, started_at 
      FROM free_trial_sessions 
      ORDER BY started_at DESC 
      LIMIT 5
    `);
    
    // Check if localhost IP has completed session
    const localhostCheck = await db.query(`
      SELECT COUNT(*) as count
      FROM free_trial_sessions 
      WHERE is_completed = true
    `);
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    process.exit();
  }
}

checkSessions();
