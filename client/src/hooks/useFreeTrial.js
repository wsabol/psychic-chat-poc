import { useState, useCallback, useEffect } from 'react';
import { logErrorFromCatch } from '../shared/errorLogger.js';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

/**
 * Hook for managing free trial progress tracking
 * Handles session creation, step updates, and completion
 */
export function useFreeTrial(isTemporaryAccount, tempUserId) {
  const [sessionId, setSessionId] = useState(null);
  const [currentStep, setCurrentStep] = useState('chat');
  const [isCompleted, setIsCompleted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Create trial session on component mount (temp account only)
  useEffect(() => {
    if (!isTemporaryAccount || !tempUserId) return;

    const createSession = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_URL}/free-trial/create-session`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tempUserId })
        });

        const data = await response.json();

        if (!response.ok) {
          if (data.alreadyCompleted) {
            setError('This IP has already completed the free trial');
            setIsCompleted(true);
            return;
          }
          throw new Error(data.error || 'Failed to create trial session');
        }

        setSessionId(data.sessionId);
        setCurrentStep(data.currentStep || 'chat');
        setError(null);
      } catch (err) {
        logErrorFromCatch('[FREE-TRIAL] Error creating session', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    createSession();
  }, [isTemporaryAccount, tempUserId]);

  // Update trial progress step
  const updateStep = useCallback(async (newStep) => {
    if (!tempUserId) return { success: false, error: 'No temp user ID' };

    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/free-trial/update-step/${tempUserId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: newStep })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update step');
      }

      setCurrentStep(data.currentStep);
      if (data.isCompleted) {
        setIsCompleted(true);
      }
      setError(null);

      return { success: true, data };
    } catch (err) {
      logErrorFromCatch('[FREE-TRIAL] Error updating step', err);
      const errorMsg = err.message;
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, [tempUserId]);

  // Mark trial as completed
  const completeTrial = useCallback(async () => {
    if (!tempUserId) return { success: false, error: 'No temp user ID' };

    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/free-trial/complete/${tempUserId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to complete trial');
      }

      setIsCompleted(true);
      setCurrentStep('completed');
      setError(null);

      return { success: true, data };
    } catch (err) {
      logErrorFromCatch('[FREE-TRIAL] Error completing trial', err);
      const errorMsg = err.message;
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, [tempUserId]);

  // Get current session status
  const getSessionStatus = useCallback(async () => {
    if (!tempUserId) return { success: false, error: 'No temp user ID' };

    try {
      const response = await fetch(`${API_URL}/free-trial/session/${tempUserId}`);
      const data = await response.json();

      if (!response.ok) {
        if (response.status === 404) {
          return { success: false, error: 'Session not found', notFound: true };
        }
        throw new Error(data.error || 'Failed to get session status');
      }

      setSessionId(data.sessionId);
      setCurrentStep(data.currentStep);
      setIsCompleted(data.isCompleted);
      setError(null);

      return { success: true, data };
    } catch (err) {
      logErrorFromCatch('[FREE-TRIAL] Error getting session status', err);
      return { success: false, error: err.message };
    }
  }, [tempUserId]);

  return {
    sessionId,
    currentStep,
    isCompleted,
    loading,
    error,
    updateStep,
    completeTrial,
    getSessionStatus
  };
}
