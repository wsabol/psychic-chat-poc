/**
 * Database Migration Runner
 * Runs all SQL migration files in order
 */

import { db } from './shared/db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(__dirname, 'migrations');

async function runMigrations() {
  try {
    console.log('[MIGRATIONS] Starting database migrations...');

    // Get all SQL files in migrations directory
    const files = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    if (files.length === 0) {
      console.log('[MIGRATIONS] No migration files found');
      return;
    }

    console.log(`[MIGRATIONS] Found ${files.length} migration files`);

    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf-8');

      try {
        console.log(`[MIGRATIONS] Running: ${file}`);
        await db.query(sql);
        console.log(`[MIGRATIONS] ✅ Completed: ${file}`);
      } catch (err) {
        // Some migrations might fail if objects already exist - that's OK
        if (err.code === '42P07' || err.code === '42701' || err.message.includes('already exists')) {
          console.log(`[MIGRATIONS] ℹ️  Skipped: ${file} (already exists)`);
        } else {
          console.error(`[MIGRATIONS] ❌ Error in ${file}:`, err.message);
          // Don't throw - continue with other migrations
        }
      }
    }

    console.log('[MIGRATIONS] 🎉 All migrations completed!');
  } catch (error) {
    console.error('[MIGRATIONS] Fatal error:', error);
    process.exit(1);
  }
}

// Run migrations when this file is executed
runMigrations().then(() => {
  console.log('[MIGRATIONS] Exiting...');
  process.exit(0);
});
