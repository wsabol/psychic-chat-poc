// migrate-email.js
import dotenv from 'dotenv';
dotenv.config();

import pkg from 'pg';
const { Client } = pkg;

async function migrateEmails() {
  const client = new Client({
    host: process.env.DATABASE_HOST,
    port: process.env.DATABASE_PORT || 5432,
    database: process.env.DATABASE_NAME,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
  });

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('✅ Connected');
    
    console.log('\nStep 1: Adding email_encrypted column...');
    await client.query(`ALTER TABLE user_personal_info ADD COLUMN email_encrypted BYTEA;`);
    console.log('✅ Column added');
    
    console.log('\nStep 2: Encrypting existing emails...');
    const result = await client.query(`
      UPDATE user_personal_info 
      SET email_encrypted = pgp_sym_encrypt(email, $1)
      WHERE email_encrypted IS NULL AND email IS NOT NULL
    `, [process.env.ENCRYPTION_KEY]);
    console.log(`✅ Encrypted ${result.rowCount} rows`);
    
    console.log('\nStep 3: Verifying encryption...');
    const encrypted = await client.query(`SELECT COUNT(*) as count FROM user_personal_info WHERE email_encrypted IS NOT NULL`);
    console.log(`✅ Encrypted count: ${encrypted.rows[0].count}`);
    
    console.log('\nStep 4: Dropping plaintext column...');
    await client.query(`ALTER TABLE user_personal_info DROP COLUMN email;`);
    console.log('✅ Column dropped');
    
    console.log('\n🎉 Migration complete!');
    await client.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    await client.end();
    process.exit(1);
  }
}

migrateEmails();