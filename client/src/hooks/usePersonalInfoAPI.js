import { useCallback } from 'react';
import { fetchWithTokenRefresh } from '../utils/fetchWithTokenRefresh';
import { hashUserIdForUrl } from '../utils/userHashUtils';
import { formatDateForDisplay } from '../utils/dateFormatting';
import { logErrorFromCatch } from '../shared/errorLogger.js';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

/**
 * Custom hook for personal info API operations
 * Centralizes all API calls related to personal information
 * @param {string} userId - User ID
 * @param {string} token - Auth token
 * @param {boolean} isTemporaryAccount - Whether this is a temp/free trial account
 * @returns {Object} { fetchPersonalInfo, savePersonalInfo, triggerAstrologySync }
 */
export function usePersonalInfoAPI(userId, token, isTemporaryAccount = false) {
  /**
   * Fetch personal information from server
   */
  const fetchPersonalInfo = useCallback(async () => {
    try {
      const response = await fetchWithTokenRefresh(`${API_URL}/user-profile/${userId}`, {
        headers: { 'Authorization': token ? `Bearer ${token}` : '' }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch personal info');
      }

      const data = await response.json();
      return {
        success: true,
        data: {
          firstName: data.first_name || '',
          lastName: data.last_name || '',
          email: data.email || '',
          birthCountry: data.birth_country || '',
          birthProvince: data.birth_province || '',
          birthCity: data.birth_city || '',
          birthDate: formatDateForDisplay(data.birth_date) || '',
          birthTime: data.birth_time || '',
          sex: data.sex || '',
          addressPreference: data.address_preference || ''
        }
      };
    } catch (err) {
      logErrorFromCatch('[PERSONAL-INFO-API] Error fetching data:', err);
      return { success: false, error: err.message };
    }
  }, [userId, token]);

  /**
   * Save personal information to server
   * Routes to free trial endpoint for temp users (no auth required)
   * Routes to regular endpoint for authenticated users
   */
  const savePersonalInfo = useCallback(
    async (dataToSend) => {
      try {
        // Use free trial endpoint for temp users (no authentication required)
        if (isTemporaryAccount) {
          const response = await fetch(`${API_URL}/free-trial/save-personal-info/${userId}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(dataToSend)
          });

          if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || 'Failed to save personal information');
          }

          return { success: true };
        }

        // Use regular endpoint for authenticated users
        const response = await fetchWithTokenRefresh(`${API_URL}/user-profile/${userId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
          },
          body: JSON.stringify(dataToSend)
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || 'Failed to save personal information');
        }

        return { success: true };
      } catch (err) {
        logErrorFromCatch('[PERSONAL-INFO-API] Error saving data:', err);
        return { success: false, error: err.message };
      }
    },
    [userId, token, isTemporaryAccount]
  );

  /**
   * Trigger astrology calculation for temp users with location data
   */
  const triggerAstrologySync = useCallback(async () => {
    try {
      const hashedUserId = await hashUserIdForUrl(userId);
      const response = await fetchWithTokenRefresh(
        `${API_URL}/astrology/sync-calculate/${hashedUserId}`,
        {
          method: 'POST',
          headers: { 'Authorization': token ? `Bearer ${token}` : '' }
        }
      );

      if (response.ok) {
        return { success: true };
      } else {
        return { success: false, error: `HTTP ${response.status}` };
      }
    } catch (err) {
      logErrorFromCatch('[PERSONAL-INFO-API] Sync-calculate error:', err);
      return { success: false, error: err.message };
    }
  }, [userId, token]);

  return {
    fetchPersonalInfo,
    savePersonalInfo,
    triggerAstrologySync
  };
}
