/**
 * Price Management API Hook
 * Provides API call abstractions for price management operations
 */

import { fetchWithTokenRefresh } from '../../../utils/fetchWithTokenRefresh';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

/**
 * Custom hook for price management API operations
 * @param {string} token - Authentication token
 * @returns {Object} API methods
 */
export function usePriceManagementApi(token) {
  /**
   * Make API request with standard headers
   */
  const makeRequest = async (url, options = {}) => {
    const response = await fetchWithTokenRefresh(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return data;
  };

  /**
   * Fetch all active Stripe prices
   */
  const fetchPrices = async () => {
    return makeRequest(`${API_URL}/admin/price-management/prices`);
  };

  /**
   * Create new price in Stripe
   * @param {string} productId - Stripe product ID
   * @param {number} amount - Amount in cents
   * @param {string} interval - 'month' or 'year'
   */
  const createPrice = async (productId, amount, interval) => {
    return makeRequest(`${API_URL}/admin/price-management/prices/create`, {
      method: 'POST',
      body: JSON.stringify({ productId, amount, interval })
    });
  };

  /**
   * Get active subscriber count by interval
   * @param {string} interval - 'month' or 'year'
   */
  const fetchSubscriberCount = async (interval) => {
    return makeRequest(`${API_URL}/admin/price-management/subscribers/${interval}`);
  };

  /**
   * Schedule price change for both monthly and annual subscriptions
   * Sends notifications and schedules automatic migration after 30 days
   * @param {Object} monthly - { oldPriceId, newPriceId, oldAmount, newAmount }
   * @param {Object} annual - { oldPriceId, newPriceId, oldAmount, newAmount }
   */
  const schedulePriceChange = async (monthly, annual) => {
    return makeRequest(`${API_URL}/admin/price-management/schedule-price-change`, {
      method: 'POST',
      body: JSON.stringify({ monthly, annual })
    });
  };

  /**
   * Send price change notifications (legacy)
   * @param {Object} params - Notification parameters
   */
  const sendNotifications = async ({ interval, oldAmount, newAmount, oldPriceId, newPriceId }) => {
    return makeRequest(`${API_URL}/admin/price-management/notify`, {
      method: 'POST',
      body: JSON.stringify({ interval, oldAmount, newAmount, oldPriceId, newPriceId })
    });
  };

  /**
   * Migrate subscriptions to new price
   * @param {Object} params - Migration parameters
   */
  const migrateSubscriptions = async ({ oldPriceId, newPriceId, interval, newAmount }) => {
    return makeRequest(`${API_URL}/admin/price-management/migrate`, {
      method: 'POST',
      body: JSON.stringify({ oldPriceId, newPriceId, interval, newAmount })
    });
  };

  /**
   * Get migration status for an interval
   * @param {string} interval - 'month' or 'year'
   */
  const fetchMigrationStatus = async (interval) => {
    return makeRequest(`${API_URL}/admin/price-management/status/${interval}`);
  };

  return {
    fetchPrices,
    createPrice,
    fetchSubscriberCount,
    schedulePriceChange,
    sendNotifications,
    migrateSubscriptions,
    fetchMigrationStatus
  };
}

export default usePriceManagementApi;
