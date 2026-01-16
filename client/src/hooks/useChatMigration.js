import { useState } from 'react';
import { logErrorFromCatch } from '../shared/errorLogger.js';

/**
 * useChatMigration - Migrate chat history from temp account to permanent account
 */
export function useChatMigration() {
  const [migrationLoading, setMigrationLoading] = useState(false);
  const [migrationError, setMigrationError] = useState(null);

  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3000";

  /**
   * Migrate chat from temporary user ID to permanent user ID
   * Call this BEFORE deleting the temp account
   */
  const migrateChatHistory = async (tempUserId, permanentUserId, token) => {
    if (!tempUserId || !permanentUserId || !token) {
      return false;
    }

    setMigrationLoading(true);
    setMigrationError(null);

    try {
      
      const response = await fetch(`${API_URL}/chat/migrate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          fromUserId: tempUserId,
          toUserId: permanentUserId
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to migrate chat');
      }

      const data = await response.json();
      return true;
    } catch (err) {
      logErrorFromCatch('[CHAT-MIGRATION] Error migrating chat:', err);
      setMigrationError(err.message);
      // Don't throw - migration failure shouldn't block account creation
      return false;
    } finally {
      setMigrationLoading(false);
    }
  };

  return {
    migrateChatHistory,
    migrationLoading,
    migrationError
  };
}

