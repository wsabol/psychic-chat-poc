/**
 * Legal Data Request Hook
 * Manages legal data request state and business logic
 */

import { useState, useCallback } from 'react';
import useLegalDataRequestApi from './useLegalDataRequestApi';
import { logErrorFromCatch } from '../../../shared/errorLogger.js';

/**
 * Custom hook for managing legal data request workflow
 * @param {string} token - Authentication token
 * @returns {Object} State and methods for legal data requests
 */
export function useLegalDataRequest(token) {
  // Form state
  const [email, setEmail] = useState('');
  const [requestedBy, setRequestedBy] = useState('');
  const [requestReason, setRequestReason] = useState('');

  // Data state
  const [userId, setUserId] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  const [dataPackage, setDataPackage] = useState(null);

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const api = useLegalDataRequestApi(token);

  /**
   * Find user by email address (Step 1)
   */
  const findUser = useCallback(async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    setUserInfo(null);
    setUserId(null);

    try {
      const data = await api.findUserByEmail(email);
      setUserInfo(data.user);
      setUserId(data.user.user_id);
      setSuccess(`✅ User found: ${data.user.email}`);
    } catch (err) {
      const errorMessage = err.message || 'An unknown error occurred';
      setError(errorMessage);
      logErrorFromCatch('Legal Data Request - Find User Error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [api, email]);

  /**
   * Generate complete legal data package (Step 2)
   */
  const generatePackage = useCallback(async (e) => {
    e.preventDefault();

    if (!requestedBy || !requestReason) {
      setError('Please provide both "Requested By" and "Request Reason"');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);
    setDataPackage(null);

    try {
      // Always use email if available (more reliable for mixed user_id formats)
      // Some older accounts may have email as user_id, others have UUID
      const identifier = email || userId;
      
      const data = await api.generateCompletePackage(
        identifier,
        requestedBy,
        requestReason
      );
      setDataPackage(data.dataPackage);
      setSuccess('✅ Legal data package generated successfully!');
    } catch (err) {
      const errorMessage = err.message || 'An unknown error occurred';
      setError(errorMessage);
      logErrorFromCatch('Legal Data Request - Generate Package Error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [api, userId, email, requestedBy, requestReason]);

  /**
   * Download data package as JSON file (Step 3)
   */
  const downloadPackage = useCallback(() => {
    if (!dataPackage) return;

    try {
      const jsonStr = JSON.stringify(dataPackage, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `legal-request_${dataPackage.request_metadata.user_id.substring(0, 8)}_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      const errorMessage = err.message || 'Failed to download package';
      setError(errorMessage);
      logErrorFromCatch('Legal Data Request - Download Error:', err);
    }
  }, [dataPackage]);

  /**
   * Reset all form state and start new request
   */
  const resetForm = useCallback(() => {
    setEmail('');
    setUserId(null);
    setUserInfo(null);
    setRequestedBy('');
    setRequestReason('');
    setError(null);
    setSuccess(null);
    setDataPackage(null);
  }, []);

  /**
   * Clear status messages
   */
  const clearMessages = useCallback(() => {
    setError(null);
    setSuccess(null);
  }, []);

  return {
    // Form state
    email,
    setEmail,
    requestedBy,
    setRequestedBy,
    requestReason,
    setRequestReason,

    // Data state
    userId,
    userInfo,
    dataPackage,

    // UI state
    isLoading,
    error,
    success,

    // Methods
    findUser,
    generatePackage,
    downloadPackage,
    resetForm,
    clearMessages
  };
}

export default useLegalDataRequest;
