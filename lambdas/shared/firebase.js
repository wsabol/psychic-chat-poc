/**
 * Firebase Admin SDK for Lambda Functions
 * 
 * Supports two modes:
 * 1. Local Development: Uses FIREBASE_SERVICE_ACCOUNT_KEY environment variable
 * 2. AWS Deployment: Uses AWS Secrets Manager for service account key
 * 
 * Initializes Firebase Admin once and reuses across Lambda invocations
 */

import admin from 'firebase-admin';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { logError } from './errorLogger.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let firebaseApp = null;
let firebaseSecrets = null;

/**
 * Load Firebase service account key from AWS Secrets Manager
 * @returns {Promise<Object>} Firebase service account key
 */
async function loadFirebaseSecretsFromAWS() {
  if (firebaseSecrets) {
    return firebaseSecrets;
  }

  const secretName = process.env.FIREBASE_SECRET_NAME || 'psychic-chat/firebase';
  const region = process.env.AWS_REGION || 'us-east-1';

  const client = new SecretsManagerClient({ region });
  
  try {
    const response = await client.send(
      new GetSecretValueCommand({ SecretId: secretName })
    );
    
    const secretData = JSON.parse(response.SecretString);
    firebaseSecrets = secretData.serviceAccountKey;
    return firebaseSecrets;
  } catch (error) {
    // Log to CloudWatch and database
    console.error('[Firebase] Failed to load secrets from AWS:', error.message);
    await logError(error, 'lambda-firebase', 'Failed to load Firebase credentials from AWS Secrets Manager').catch(() => {});
    throw new Error(`Failed to load Firebase credentials: ${error.message}`);
  }
}

/**
 * Initialize Firebase Admin SDK
 * @returns {Promise<admin.app.App>} Firebase app instance
 */
export async function initializeFirebase() {
  if (firebaseApp) {
    return firebaseApp;
  }

  try {
    // Check if running in AWS Lambda environment
    const isLambda = !!process.env.AWS_LAMBDA_FUNCTION_NAME;
    
    let serviceAccount;
    
    if (isLambda && !process.env.USE_LOCAL_FIREBASE) {
      // AWS Mode: Load from Secrets Manager
      console.log('[Firebase] Loading credentials from AWS Secrets Manager...');
      serviceAccount = await loadFirebaseSecretsFromAWS();
    } else {
      // Local Mode: Try to load from JSON file first, then fall back to environment variable
      const serviceAccountPath = path.join(__dirname, '../firebase-adminsdk-key.json');
      
      if (fs.existsSync(serviceAccountPath)) {
        console.log('[Firebase] Loading credentials from firebase-adminsdk-key.json file...');
        try {
          const fileContent = fs.readFileSync(serviceAccountPath, 'utf8');
          serviceAccount = JSON.parse(fileContent);
          console.log('[Firebase] Successfully loaded service account from JSON file');
        } catch (fileError) {
          console.error('[Firebase] Failed to load/parse JSON file:', fileError.message);
          throw new Error(`Failed to load firebase-adminsdk-key.json: ${fileError.message}`);
        }
      } else if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
        console.log('[Firebase] Loading credentials from FIREBASE_SERVICE_ACCOUNT_KEY environment variable...');
        try {
          serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
          console.log('[Firebase] Successfully parsed service account JSON from env var');
        } catch (parseError) {
          console.error('[Firebase] Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:', parseError.message);
          throw new Error(`Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY: ${parseError.message}`);
        }
      } else {
        throw new Error('Firebase credentials not found. Expected either firebase-adminsdk-key.json file or FIREBASE_SERVICE_ACCOUNT_KEY environment variable.');
      }
    }

    // Initialize Firebase Admin
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    return firebaseApp;
    
  } catch (error) {
    // Log to CloudWatch and database
    console.error('[Firebase] Failed to initialize Firebase Admin:', error.message);
    await logError(error, 'lambda-firebase', 'Failed to initialize Firebase Admin SDK').catch(() => {});
    firebaseApp = null;
    throw error;
  }
}

/**
 * Get Firebase Auth instance
 * @returns {Promise<admin.auth.Auth>} Firebase Auth instance
 */
export async function getAuth() {
  const app = await initializeFirebase();
  return admin.auth(app);
}

/**
 * Delete a Firebase user
 * @param {string} uid - User ID to delete
 * @returns {Promise<boolean>} Success status
 */
export async function deleteFirebaseUser(uid) {
  try {
    const auth = await getAuth();
    await auth.deleteUser(uid);
    return true;
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      return true; // Consider this a success
    }
    // Log to CloudWatch and database for audit trail
    console.error(`[Firebase] Error deleting user ${uid}:`, error.message);
    await logError(error, 'lambda-firebase', `Failed to delete Firebase user: ${uid}`, uid).catch(() => {});
    throw error;
  }
}

/**
 * List all Firebase users (paginated)
 * @param {string|null} pageToken - Token for pagination
 * @param {number} maxResults - Maximum results per page (default 1000)
 * @returns {Promise<Object>} Users list result
 */
export async function listFirebaseUsers(pageToken = null, maxResults = 1000) {
  try {
    const auth = await getAuth();
    const result = await auth.listUsers(maxResults, pageToken);
    return {
      users: result.users,
      pageToken: result.pageToken
    };
  } catch (error) {
    // Log to CloudWatch and database
    console.error('[Firebase] Error listing users:', error.message);
    await logError(error, 'lambda-firebase', 'Failed to list Firebase users').catch(() => {});
    throw error;
  }
}

/**
 * Get Firebase user by UID
 * @param {string} uid - User ID
 * @returns {Promise<admin.auth.UserRecord|null>} User record or null if not found
 */
export async function getFirebaseUser(uid) {
  try {
    const auth = await getAuth();
    return await auth.getUser(uid);
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      return null;
    }
    throw error;
  }
}

/**
 * Cleanup - Delete Firebase app (for testing)
 */
export async function cleanupFirebase() {
  if (firebaseApp) {
    await firebaseApp.delete();
    firebaseApp = null;
    firebaseSecrets = null;
  }
}

// Export auth directly for convenience
export const auth = {
  deleteUser: deleteFirebaseUser,
  listUsers: listFirebaseUsers,
  getUser: getFirebaseUser
};

export default {
  initializeFirebase,
  getAuth,
  auth,
  cleanupFirebase
};
