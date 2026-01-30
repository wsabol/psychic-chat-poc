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
    // Note: Lambda environment - console.error is appropriate for AWS CloudWatch logs
    console.error('[Firebase] Failed to load secrets from AWS:', error.message);
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
      serviceAccount = await loadFirebaseSecretsFromAWS();
    } else {
      // Local Mode: Use environment variable
      
      if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
        throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set');
      }
      
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    }

    // Initialize Firebase Admin
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    return firebaseApp;
    
  } catch (error) {
    // Note: Lambda environment - console.error is appropriate for AWS CloudWatch logs
    console.error('[Firebase] Failed to initialize Firebase Admin:', error.message);
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
    // Note: Lambda environment - console.error is appropriate for AWS CloudWatch logs
    console.error(`[Firebase] Error deleting user ${uid}:`, error.message);
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
    // Note: Lambda environment - console.error is appropriate for AWS CloudWatch logs
    console.error('[Firebase] Error listing users:', error.message);
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
