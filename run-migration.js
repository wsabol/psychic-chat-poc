/**
 * Secure migration runner — prompts for DB password interactively.
 * Password is never stored in shell history or passed as a CLI argument.
 *
 * Usage: node run-migration.js
 */
import readline from 'readline';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

// Load pg from api/node_modules (where it lives in this project)
const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(join(__dirname, 'api', 'package.json'));
const { Client } = require('pg');

// ─── Read the SQL file ────────────────────────────────────────────────────────
const sqlFile = join(__dirname, 'google-play-migration.sql');
const sql = readFileSync(sqlFile, 'utf-8')
  // Strip comment lines and the trailing SELECT (just run the DDL)
  .split('\n')
  .filter(line => !line.startsWith('--'))
  .join('\n');

// ─── Prompt helpers ───────────────────────────────────────────────────────────
function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(question, ans => { rl.close(); resolve(ans); }));
}

function promptPassword(question) {
  return new Promise(resolve => {
    // Raw mode hides typing (works on macOS/Linux; PowerShell doesn't support it)
    if (process.stdin.isTTY && typeof process.stdin.setRawMode === 'function') {
      process.stdout.write(question);
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.setEncoding('utf8');
      let password = '';
      const onData = char => {
        if (char === '\r' || char === '\n') {
          process.stdin.setRawMode(false);
          process.stdin.pause();
          process.stdin.removeListener('data', onData);
          process.stdout.write('\n');
          resolve(password);
        } else if (char === '\u0003') {
          process.exit();
        } else if (char === '\u007F') {
          password = password.slice(0, -1);
        } else {
          password += char;
        }
      };
      process.stdin.on('data', onData);
    } else {
      // Fallback (PowerShell / non-TTY): password will be visible while typing
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
      rl.question(question, ans => { rl.close(); resolve(ans); });
    }
  });
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🔐 Secure DB Migration Runner');
  console.log('─────────────────────────────');
  console.log('Migration: add-google-play-billing');
  console.log('Target:    localhost:5433 → psychic_chat (via SSH tunnel)\n');

  const host     = await prompt('Host     [localhost]: ') || 'localhost';
  const port     = await prompt('Port     [5433]:      ') || '5433';
  const database = await prompt('Database [psychic_chat]: ') || 'psychic_chat';
  const user     = await prompt('User     [masteradmin]: ') || 'masteradmin';
  const password = await promptPassword('Password: ');

  const client = new Client({
    host, port: parseInt(port), database, user, password,
    ssl: { rejectUnauthorized: false },
  });

  try {
    console.log('\nConnecting...');
    await client.connect();
    console.log('✅ Connected\n');

    // Split on semicolons and run each statement
    const statements = sql.split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('SELECT'));

    for (const stmt of statements) {
      console.log(`▶ ${stmt.split('\n')[0].trim()}...`);
      await client.query(stmt);
    }

    // Verify: show columns
    const result = await client.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'user_personal_info'
        AND column_name IN (
          'billing_platform', 'google_play_purchase_token',
          'google_play_product_id', 'google_play_order_id'
        )
      ORDER BY column_name
    `);

    console.log('\n✅ Migration complete! New columns:');
    console.table(result.rows);
  } catch (err) {
    console.error('\n❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main().catch(err => { console.error(err); process.exit(1); });
