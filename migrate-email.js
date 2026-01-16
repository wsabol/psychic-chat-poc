// migrate-email.js
import dotenv from 'dotenv';
dotenv.config();

import pkg from 'pg';
const { Client } = pkg;
import { logErrorFromCatch } from './shared/errorLogger.js';

async function migrateEmails() {
  const client = new Client({
    host: process.env.DATABASE_HOST,
    port: process.env.DATABASE_PORT || 5432,
    database: process.env.DATABASE_NAME,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
  });

  try {
    await client.connect();
    ;
    await client.query(`ALTER TABLE user_personal_info ADD COLUMN email_encrypted BYTEA;`);
    
    const result = await client.query(`
      UPDATE user_personal_info 
      SET email_encrypted = pgp_sym_encrypt(email, $1)
      WHERE email_encrypted IS NULL AND email IS NOT NULL
    `, [process.env.ENCRYPTION_KEY]);
    
    const encrypted = await client.query(`SELECT COUNT(*) as count FROM user_personal_info WHERE email_encrypted IS NOT NULL`);

    await client.query(`ALTER TABLE user_personal_info DROP COLUMN email;`);

    await client.end();
    process.exit(0);
    } catch (error) {
    logErrorFromCatch(error, 'migrate-email', 'Migration failed');
    await client.end();
    process.exit(1);
  }
}

migrateEmails();