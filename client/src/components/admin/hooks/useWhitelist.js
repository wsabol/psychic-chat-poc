/**
 * Whitelist Data Hook
 * Manages whitelist data fetching and state
 */

import { useState, useEffect, useCallback } from 'react';
import useWhitelistApi from './useWhitelistApi';
import { logErrorFromCatch } from '../../../shared/errorLogger.js';

/**
 * Custom hook for managing whitelist data
 * @param {string} token - Authentication token
 * @returns {Object} Whitelist state and methods
 */
export function useWhitelist(token) {
  const [whitelist, setWhitelist] = useState([]);
  const [currentIp, setCurrentIp] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const api = useWhitelistApi(token);

  /**
   * Fetch whitelist from API
   */
  const fetchWhitelist = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.fetchWhitelist();
      setWhitelist(data.whitelist || []);
      setLastUpdated(new Date().toLocaleString());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [api]);

  /**
   * Fetch current IP from API
   */
  const fetchCurrentIp = useCallback(async () => {
    try {
      const data = await api.fetchCurrentIp();
      setCurrentIp(data);
    } catch (err) {
      logErrorFromCatch('Error fetching current IP:', err);
    }
  }, [api]);

  /**
   * Add IP to whitelist
   */
  const whitelistCurrentIp = async () => {
    if (!currentIp?.ipAddress) {
      setError('Unable to determine current IP address');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await api.addToWhitelist(currentIp.ipAddress, 'Admin current IP');
      setSuccess('✅ Current IP address whitelisted successfully');
      await Promise.all([fetchWhitelist(), fetchCurrentIp()]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Add manual IP to whitelist
   */
  const whitelistManualIp = async (ipAddress, description) => {
    if (!ipAddress.trim()) {
      setError('Please enter an IP address');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await api.addToWhitelist(ipAddress.trim(), description.trim() || 'Manually added');
      setSuccess(`✅ IP ${ipAddress} whitelisted successfully`);
      await fetchWhitelist();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Remove IP from whitelist
   */
  const removeFromWhitelist = async (id) => {
    if (!window.confirm('Are you sure you want to remove this IP from the whitelist?')) {
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await api.removeFromWhitelist(id);
      setSuccess('✅ IP address removed from whitelist');
      await Promise.all([fetchWhitelist(), fetchCurrentIp()]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Clear messages
   */
  const clearMessages = useCallback(() => {
    setError(null);
    setSuccess(null);
  }, []);

  // Fetch on mount only
  useEffect(() => {
    fetchWhitelist();
    fetchCurrentIp();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    whitelist,
    currentIp,
    loading,
    error,
    success,
    lastUpdated,
    fetchWhitelist,
    whitelistCurrentIp,
    whitelistManualIp,
    removeFromWhitelist,
    clearMessages
  };
}

export default useWhitelist;
