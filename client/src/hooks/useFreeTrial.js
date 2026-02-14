import React, { useState, useCallback, useEffect } from 'react';
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
  // Use a ref to prevent duplicate calls in React StrictMode
  const sessionCreatedRef = React.useRef(false);
  const creationInProgressRef = React.useRef(false);
  
  useEffect(() => {
    // Prevent duplicate calls - check both refs before proceeding
    if (!isTemporaryAccount || !tempUserId || sessionCreatedRef.current || creationInProgressRef.current) return;

    const createSession = async () => {
      // Mark creation as in progress BEFORE the fetch
      creationInProgressRef.current = true;
      
      try {
        setLoading(true);
        
        // FIRST: Check if session already exists to avoid rate limiting
        const checkResponse = await fetch(`${API_URL}/free-trial/check-session/${tempUserId}`);
        if (checkResponse.ok) {
          const checkData = await checkResponse.json();
          if (checkData.exists) {
            sessionCreatedRef.current = true;
            setSessionId(checkData.sessionId);
            setCurrentStep(checkData.currentStep || 'chat');
            setIsCompleted(checkData.isCompleted || false);
            if (checkData.isCompleted) {
              setError('This session has already been completed');
            }
            setLoading(false);
            return;
          }
        }
        
        // Session doesn't exist, create it
        const response = await fetch(`${API_URL}/free-trial/create-session`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tempUserId })
        });

        let data;
        try {
          data = await response.json();
        } catch (jsonErr) {
          // Response wasn't JSON, use generic error
          throw new Error('Server error occurred');
        }

        if (!response.ok) {
          // Handle rate limiting or already completed
          if (response.status === 429) {
            // Rate limited - might mean session already exists
            sessionCreatedRef.current = true; // Prevent further attempts
            return;
          }
          
          if (data?.alreadyCompleted) {
            setError('This session has already been completed');
            setIsCompleted(true);
            // If session already exists, use the existing data
            if (data?.sessionId) {
              setSessionId(data.sessionId);
              setCurrentStep(data.currentStep || 'chat');
            }
            sessionCreatedRef.current = true;
            return;
          }
          
          throw new Error(data?.error || 'Failed to create trial session');
        }

        // Mark session as created to prevent duplicate attempts
        sessionCreatedRef.current = true;
        
        setSessionId(data.sessionId);
        setCurrentStep(data.currentStep || 'chat');
        setError(null);
      } catch (err) {
        const errorMessage = err?.message || 'Failed to create session';
        logErrorFromCatch(err, 'free-trial', 'Error creating session');
        setError(errorMessage);
        // Reset in-progress flag on error to allow retry
        creationInProgressRef.current = false;
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

      let data;
      try {
        data = await response.json();
      } catch (jsonErr) {
        throw new Error('Server error occurred');
      }

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to update step');
      }

      setCurrentStep(data.currentStep);
      if (data.isCompleted) {
        setIsCompleted(true);
      }
      setError(null);

      return { success: true, data };
    } catch (err) {
      logErrorFromCatch(err, 'free-trial', 'Error updating step');
      const errorMsg = err?.message || 'Failed to update step';
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

      let data;
      try {
        data = await response.json();
      } catch (jsonErr) {
        throw new Error('Server error occurred');
      }

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to complete trial');
      }

      setIsCompleted(true);
      setCurrentStep('completed');
      setError(null);

      return { success: true, data };
    } catch (err) {
      logErrorFromCatch(err, 'free-trial', 'Error completing trial');
      const errorMsg = err?.message || 'Failed to complete trial';
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
      
      let data;
      try {
        data = await response.json();
      } catch (jsonErr) {
        throw new Error('Server error occurred');
      }

      if (!response.ok) {
        if (response.status === 404) {
          return { success: false, error: 'Session not found', notFound: true };
        }
        throw new Error(data?.error || 'Failed to get session status');
      }

      setSessionId(data.sessionId);
      setCurrentStep(data.currentStep);
      setIsCompleted(data.isCompleted);
      setError(null);

      return { success: true, data };
    } catch (err) {
      logErrorFromCatch(err, 'free-trial', 'Error getting session status');
      return { success: false, error: err?.message || 'Failed to get session status' };
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
