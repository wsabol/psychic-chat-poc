/**
 * Session Check Hook
 * Replaces localStorage-based session management with database-driven checks
 * Checks IP address against free_trial_sessions and security_sessions tables
 */

import { useState, useEffect, useCallback } from 'react';
import { logErrorFromCatch } from '../shared/errorLogger.js';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

/**
 * Check if user is returning based on IP address in database
 * @returns {Object} Session check state and methods
 */
export function useSessionCheck() {
  const [sessionCheckData, setSessionCheckData] = useState(null);
  const [isChecking, setIsChecking] = useState(true);
  const [error, setError] = useState(null);

  const checkSession = useCallback(async () => {
    try {
      setIsChecking(true);
      setError(null);

      const response = await fetch(`${API_URL}/auth/check-returning-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error('Failed to check session');
      }

      const data = await response.json();
      setSessionCheckData(data);
      
      return data;
    } catch (err) {
      logErrorFromCatch(err, 'session-check', 'Error checking session');
      setError(err.message);
      // Return safe default - treat as new user on error
      const fallbackData = {
        isReturningUser: false,
        userType: 'new',
        hasCompletedTrial: false,
        sessionData: null
      };
      setSessionCheckData(fallbackData);
      return fallbackData;
    } finally {
      setIsChecking(false);
    }
  }, []);

  // Check session on mount
  useEffect(() => {
    checkSession();
  }, [checkSession]);

  return {
    sessionCheckData,
    isChecking,
    error,
    recheckSession: checkSession
  };
}
