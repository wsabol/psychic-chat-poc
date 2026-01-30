/**
 * Encryption Service for Consent Data
 * Centralizes encryption logic for IP addresses and user agents
 */

import { db } from '../../shared/db.js';
import { getEncryptionKey } from '../../shared/decryptionHelper.js';
import { logErrorFromCatch } from '../../shared/errorLogger.js';

/**
 * Encrypt a single value using PostgreSQL pgp_sym_encrypt
 * @param {string} value - Value to encrypt
 * @returns {Promise<Buffer|null>} Encrypted value or null on error
 */
async function encryptValue(value) {
  if (!value || value.trim() === '') return null;
  
  try {
    const encryptionKey = getEncryptionKey();
    const result = await db.query(
      'SELECT pgp_sym_encrypt($1::text, $2) as encrypted',
      [value, encryptionKey]
    );
    return result.rows[0]?.encrypted || null;
  } catch (error) {
    logErrorFromCatch(error, 'ENCRYPTION_ERROR', 'encryptionService.encryptValue');
    return null;
  }
}

/**
 * Encrypt request metadata (IP address and user agent)
 * @param {Object} metadata - Metadata object with clientIp and userAgent
 * @returns {Promise<Object>} Encrypted metadata
 */
export async function encryptRequestMetadata(metadata) {
  const { clientIp, userAgent } = metadata;
  
  const [encryptedIp, encryptedAgent] = await Promise.all([
    encryptValue(clientIp),
    encryptValue(userAgent)
  ]);
  
  return {
    encryptedIp,
    encryptedAgent
  };
}

/**
 * Prepare metadata for database storage
 * @param {Object} metadata - Request metadata
 * @returns {Promise<Object>} Prepared metadata with encrypted values
 */
export async function prepareMetadataForStorage(metadata) {
  const encrypted = await encryptRequestMetadata(metadata);
  
  return {
    agreed_from_ip_encrypted: encrypted.encryptedIp,
    user_agent_encrypted: encrypted.encryptedAgent,
    timestamp: metadata.timestamp
  };
}

export default {
  encryptValue,
  encryptRequestMetadata,
  prepareMetadataForStorage
};
