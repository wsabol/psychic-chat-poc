#!/usr/bin/env node

/**
 * Sync Script: Copy /shared/errorLogger.js to client/src/shared/errorLogger.js
 * Runs before client dev/build to keep them in sync
 * One source of truth at /shared/errorLogger.js
 */

const fs = require('fs');
const path = require('path');
const { logErrorFromCatch } = require('./shared/errorLogger.js');

const source = path.join(__dirname, 'shared', 'errorLogger.js');
const dest = path.join(__dirname, 'client', 'src', 'shared', 'errorLogger.js');
const destDir = path.dirname(dest);

try {
  // Create directory if it doesn't exist
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  // Read source
  const content = fs.readFileSync(source, 'utf8');

  // Write to destination
  fs.writeFileSync(dest, content, 'utf8');
} catch (error) {
  logErrorFromCatch(error, 'sync-errorLogger', 'Error syncing errorLogger.js');
  process.exit(1);
}
