import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Path to Firebase service account key
const serviceAccountPath = path.join(__dirname, '../firebase-adminsdk-key.json');

if (!fs.existsSync(serviceAccountPath)) {
  logErrorFromCatch(error, 'app', 'Error handling');
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: process.env.FIREBASE_PROJECT_ID || serviceAccount.project_id
});

export const auth = admin.auth();