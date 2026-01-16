import admin from 'firebase-admin';
import fs from 'fs';
import { logErrorFromCatch } from '../../shared/errorLogger.js';

// Try multiple possible paths for the firebase key
const possiblePaths = [
  '/app/firebase-adminsdk-key.json',
  '/api/firebase-adminsdk-key.json',
  './firebase-adminsdk-key.json'
];

let serviceAccountPath = null;
for (const p of possiblePaths) {
  if (fs.existsSync(p)) {
    serviceAccountPath = p;
    break;
  }
}

if (!serviceAccountPath) {
  logErrorFromCatch('ERROR: firebase-adminsdk-key.json not found');
  logErrorFromCatch('Checked paths:', possiblePaths);
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: process.env.FIREBASE_PROJECT_ID || serviceAccount.project_id
});

export const auth = admin.auth();
