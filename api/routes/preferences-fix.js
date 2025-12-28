import { hashUserId } from '../shared/hashUtils.js';

// Save user preferences using user_id_hash (deterministic) - NO OVERWRITES
export async function savePreferences(userId, language, response_type, voice_enabled, db) {
  if (!['en-US', 'es-ES', 'fr-FR', 'de-DE', 'it-IT', 'pt-BR', 'ja-JP', 'zh-CN'].includes(language)) {
    throw new Error('Invalid language');
  }
  if (!['full', 'brief'].includes(response_type)) {
    throw new Error('Invalid response_type');
  }

  const userIdHash = hashUserId(userId);
  
  // UPSERT with user_id_hash - deterministic, no random IV, ON CONFLICT works
  const result = await db.query(
    `INSERT INTO user_preferences (user_id_hash, language, response_type, voice_enabled)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id_hash) DO UPDATE SET
     language = EXCLUDED.language,
     response_type = EXCLUDED.response_type,
     voice_enabled = EXCLUDED.voice_enabled,
     updated_at = CURRENT_TIMESTAMP
     RETURNING language, response_type, voice_enabled`,
    [userIdHash, language, response_type, voice_enabled !== false]
  );
  return result.rows[0];
}
