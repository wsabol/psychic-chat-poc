/**
 * set-version-config.js
 *
 * One-shot script: upserts the app_version_config row so that
 * latest_version and minimum_version reflect the values below.
 *
 * Run from the repo root:
 *   node api/scripts/set-version-config.js <latestVersion> [minimumVersion]
 *
 * Examples:
 *   node api/scripts/set-version-config.js 3.4.3
 *   node api/scripts/set-version-config.js 3.5.0 3.4.0
 *
 * Requires DATABASE_URL (or DB_HOST + DB_PASSWORD etc.) to be set in the
 * environment, exactly the same as the API server uses.
 */

import '../env-loader.js';
import { db } from '../shared/db.js';

// Accept version from CLI args so this script never needs to be edited.
const LATEST_VERSION  = process.argv[2] ?? '3.4.3';
const MINIMUM_VERSION = process.argv[3] ?? '3.0.0';

if (!LATEST_VERSION.match(/^\d+\.\d+\.\d+$/)) {
  console.error(`❌  Invalid version: "${LATEST_VERSION}". Expected semver like "3.4.3".`);
  process.exit(1);
}
const ANDROID_URL     = 'https://play.google.com/store/apps/details?id=com.starshippsychicsmobile';

async function run() {
  console.log(`\nUpserting app_version_config → latest=${LATEST_VERSION}  minimum=${MINIMUM_VERSION}\n`);

  try {
    const result = await db.query(
      `INSERT INTO app_version_config
         (id, latest_version, minimum_version, android_store_url, ios_store_url, updated_at)
       VALUES (1, $1, $2, $3, '', NOW())
       ON CONFLICT (id) DO UPDATE SET
         latest_version  = EXCLUDED.latest_version,
         minimum_version = EXCLUDED.minimum_version,
         updated_at      = EXCLUDED.updated_at
       RETURNING id, latest_version, minimum_version, android_store_url, ios_store_url, updated_at`,
      [LATEST_VERSION, MINIMUM_VERSION, ANDROID_URL],
    );

    const row = result.rows[0];
    console.log('✅  app_version_config updated successfully:');
    console.log(`    latest_version  : ${row.latest_version}`);
    console.log(`    minimum_version : ${row.minimum_version}`);
    console.log(`    android_url     : ${row.android_store_url}`);
    console.log(`    updated_at      : ${row.updated_at}\n`);
  } catch (err) {
    console.error('❌  Failed to update version config:', err.message);
    process.exit(1);
  } finally {
    await db.end();
  }
}

run();
