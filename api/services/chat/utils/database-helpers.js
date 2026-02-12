/**
 * Database Helper Utilities
 * Centralized database query and encryption handling for chat processors
 */

import { db } from '../../../shared/db.js';
import { hashUserId } from '../../../shared/hashUtils.js';

/**
 * Fetch the most recent encrypted message for a user with specific criteria
 * @param {string} userId - User ID
 * @param {string} role - Message role (e.g., 'horoscope', 'moon_phase', 'cosmic_weather')
 * @param {Object} additionalFilters - Additional WHERE clause filters
 * @param {Array<string>} selectFields - Fields to select (defaults to standard fields)
 * @returns {Promise<Object|null>} The fetched message or null if not found
 */
export async function fetchLatestMessage(userId, role, additionalFilters = {}, selectFields = null) {
    const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
    const userIdHash = hashUserId(userId);
    
    // Default select fields
    const fields = selectFields || [
        'id',
        'role',
        'pgp_sym_decrypt(content_full_encrypted, $2)::text as content_full',
        'pgp_sym_decrypt(content_brief_encrypted, $2)::text as content_brief',
        'response_type',
        'created_at'
    ];
    
    // Build WHERE clause
    const whereConditions = ['user_id_hash = $1'];
    const params = [userIdHash, ENCRYPTION_KEY];
    let paramIndex = 3;
    
    if (role) {
        if (role === 'assistant') {
            whereConditions.push("role != 'user'");
        } else {
            whereConditions.push(`role = $${paramIndex}`);
            params.push(role);
            paramIndex++;
        }
    }
    
    // Add additional filters
    for (const [key, value] of Object.entries(additionalFilters)) {
        whereConditions.push(`${key} = $${paramIndex}`);
        params.push(value);
        paramIndex++;
    }
    
    const query = `
        SELECT ${fields.join(', ')}
        FROM messages 
        WHERE ${whereConditions.join(' AND ')}
        ORDER BY created_at DESC 
        LIMIT 1
    `;
    
    const { rows } = await db.query(query, params);
    
    return rows.length > 0 ? rows[0] : null;
}

/**
 * Fetch encrypted message with simplified interface for most common use case
 * @param {string} userId - User ID
 * @param {string} role - Message role
 * @param {Object} filters - Additional filters (optional)
 * @returns {Promise<Object|null>}
 */
export async function fetchMessageByRole(userId, role, filters = {}) {
    return fetchLatestMessage(userId, role, filters);
}
