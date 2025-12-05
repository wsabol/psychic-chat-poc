import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Try multiple possible paths for the firebase key
const possiblePaths = [
  // In worker app directory
  path.join(__dirname, '../../firebase-adminsdk-key.json'),
  // Direct in /app
  '/app/firebase-adminsdk-key.json',
  // From api
  path.join(__dirname, '../../api/firebase-adminsdk-key.json'),
];

let serviceAccountPath = null;
for (const p of possiblePaths) {
  if (fs.existsSync(p)) {
    serviceAccountPath = p;
    console.log('[FIREBASE] Found firebase-adminsdk-key.json at:', p);
    break;
  }
}

if (!serviceAccountPath) {
  console.error('ERROR: firebase-adminsdk-key.json not found');
  console.error('Checked paths:', possiblePaths);
  console.error('Current directory:', process.cwd());
  console.error('__dirname:', __dirname);
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: process.env.FIREBASE_PROJECT_ID || serviceAccount.project_id
});

export const auth = admin.auth();
