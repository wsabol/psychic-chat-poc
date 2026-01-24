/**
 * Price Management Data Hook
 * Manages price management data fetching and state
 */

import { useState, useEffect, useCallback } from 'react';
import usePriceManagementApi from './usePriceManagementApi';
import { logErrorFromCatch } from '../../../shared/errorLogger.js';

/**
 * Custom hook for managing price management data
 * @param {string} token - Authentication token
 * @returns {Object} Price management state and methods
 */
export function usePriceManagement(token) {
  const [prices, setPrices] = useState([]);
  const [monthlyCount, setMonthlyCount] = useState(0);
  const [yearlyCount, setYearlyCount] = useState(0);
  const [monthlyStatus, setMonthlyStatus] = useState(null);
  const [yearlyStatus, setYearlyStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const api = usePriceManagementApi(token);

  /**
   * Fetch all prices from API
   */
  const fetchPrices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.fetchPrices();
      setPrices(data.prices || []);
    } catch (err) {
      setError(err.message);
      logErrorFromCatch('Error fetching prices:', err);
    } finally {
      setLoading(false);
    }
  }, [api]);

  /**
   * Fetch subscriber counts
   */
  const fetchSubscriberCounts = useCallback(async () => {
    try {
      const [monthlyData, yearlyData] = await Promise.all([
        api.fetchSubscriberCount('month'),
        api.fetchSubscriberCount('year')
      ]);
      setMonthlyCount(monthlyData.count || 0);
      setYearlyCount(yearlyData.count || 0);
    } catch (err) {
      logErrorFromCatch('Error fetching subscriber counts:', err);
    }
  }, [api]);

  /**
   * Fetch migration status
   */
  const fetchMigrationStatus = useCallback(async () => {
    try {
      const [monthlyData, yearlyData] = await Promise.all([
        api.fetchMigrationStatus('month'),
        api.fetchMigrationStatus('year')
      ]);
      setMonthlyStatus(monthlyData.status || null);
      setYearlyStatus(yearlyData.status || null);
    } catch (err) {
      logErrorFromCatch('Error fetching migration status:', err);
    }
  }, [api]);

  /**
   * Create new price
   */
  const createNewPrice = async (productId, amount, interval) => {
    if (!productId.trim()) {
      setError('Please enter a product ID');
      return;
    }
    if (!amount || amount <= 0) {
      setError('Please enter a valid amount');
      return;
    }
    if (!interval || !['month', 'year'].includes(interval)) {
      setError('Please select a valid interval');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const data = await api.createPrice(productId.trim(), Number(amount), interval);
      setSuccess(`✅ Price created successfully: ${data.price.id}`);
      await fetchPrices();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Schedule price change for both monthly and annual
   */
  const schedulePriceChange = async (monthly, annual) => {
    // Validate at least one is provided
    if (!monthly && !annual) {
      setError('Please select at least one price change (monthly or annual)');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const data = await api.schedulePriceChange(monthly, annual);
      setSuccess(`✅ ${data.message}`);
      await Promise.all([fetchSubscriberCounts(), fetchMigrationStatus()]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Send price change notifications (legacy)
   */
  const sendPriceNotifications = async (params) => {
    const { interval, oldAmount, newAmount, oldPriceId, newPriceId } = params;

    // Validate
    if (!interval || !['month', 'year'].includes(interval)) {
      setError('Please select a valid interval');
      return;
    }
    if (!oldAmount || oldAmount <= 0) {
      setError('Please enter a valid old amount');
      return;
    }
    if (!newAmount || newAmount <= 0) {
      setError('Please enter a valid new amount');
      return;
    }
    if (!oldPriceId.trim()) {
      setError('Please enter the old price ID');
      return;
    }
    if (!newPriceId.trim()) {
      setError('Please enter the new price ID');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const data = await api.sendNotifications({
        interval,
        oldAmount: Number(oldAmount),
        newAmount: Number(newAmount),
        oldPriceId: oldPriceId.trim(),
        newPriceId: newPriceId.trim()
      });
      setSuccess(`✅ ${data.message}. Sent: ${data.sent}, Failed: ${data.failed}`);
      await fetchMigrationStatus();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Migrate subscriptions
   */
  const migrateAllSubscriptions = async (params) => {
    const { oldPriceId, newPriceId, interval, newAmount } = params;

    // Validate
    if (!oldPriceId.trim()) {
      setError('Please enter the old price ID');
      return;
    }
    if (!newPriceId.trim()) {
      setError('Please enter the new price ID');
      return;
    }
    if (!interval || !['month', 'year'].includes(interval)) {
      setError('Please select a valid interval');
      return;
    }
    if (!newAmount || newAmount <= 0) {
      setError('Please enter a valid new amount');
      return;
    }

    // Get subscriber count for confirmation
    const count = interval === 'month' ? monthlyCount : yearlyCount;
    
    if (!window.confirm(`This will migrate ${count} ${interval}ly subscriptions to the new price. Continue?`)) {
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const data = await api.migrateSubscriptions({
        oldPriceId: oldPriceId.trim(),
        newPriceId: newPriceId.trim(),
        interval,
        newAmount: Number(newAmount)
      });
      setSuccess(`✅ ${data.message}. Migrated: ${data.migrated}, Failed: ${data.failed}`);
      await Promise.all([fetchSubscriberCounts(), fetchMigrationStatus()]);
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

  /**
   * Refresh all data
   */
  const refreshAll = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchPrices(),
        fetchSubscriberCounts(),
        fetchMigrationStatus()
      ]);
    } catch (err) {
      logErrorFromCatch('Error refreshing data:', err);
    } finally {
      setLoading(false);
    }
  }, [fetchPrices, fetchSubscriberCounts, fetchMigrationStatus]);

  // Fetch initial data on mount
  useEffect(() => {
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    prices,
    monthlyCount,
    yearlyCount,
    monthlyStatus,
    yearlyStatus,
    loading,
    error,
    success,
    createNewPrice,
    schedulePriceChange,
    sendPriceNotifications,
    migrateAllSubscriptions,
    refreshAll,
    clearMessages
  };
}

export default usePriceManagement;
