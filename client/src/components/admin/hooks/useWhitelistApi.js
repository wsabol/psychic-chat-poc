/**
 * Whitelist API Hook
 * Provides API call abstractions for whitelist operations
 */

import { fetchWithTokenRefresh } from '../../../utils/fetchWithTokenRefresh';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

/**
 * Custom hook for whitelist API operations
 * @param {string} token - Authentication token
 * @returns {Object} API methods
 */
export function useWhitelistApi(token) {
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
   * Fetch all whitelisted IPs
   */
  const fetchWhitelist = async () => {
    return makeRequest(`${API_URL}/admin/whitelist`);
  };

  /**
   * Fetch current IP address
   */
  const fetchCurrentIp = async () => {
    return makeRequest(`${API_URL}/admin/whitelist/current-ip`);
  };

  /**
   * Add IP to whitelist
   */
  const addToWhitelist = async (ipAddress, description) => {
    return makeRequest(`${API_URL}/admin/whitelist/add`, {
      method: 'POST',
      body: JSON.stringify({ ipAddress, description })
    });
  };

  /**
   * Remove IP from whitelist
   */
  const removeFromWhitelist = async (id) => {
    return makeRequest(`${API_URL}/admin/whitelist/${id}`, {
      method: 'DELETE'
    });
  };

  return {
    fetchWhitelist,
    fetchCurrentIp,
    addToWhitelist,
    removeFromWhitelist
  };
}

export default useWhitelistApi;
