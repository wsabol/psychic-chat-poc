/**
 * Legal Data Request API Hook
 * Provides API call abstractions for legal data request operations
 */

import { fetchWithTokenRefresh } from '../../../utils/fetchWithTokenRefresh';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

/**
 * Custom hook for legal data request API operations
 * @param {string} token - Authentication token
 * @returns {Object} API methods
 */
export function useLegalDataRequestApi(token) {
  /**
   * Make API request with standard headers
   */
  const makeRequest = async (url, options = {}) => {
    try {
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
        // Extract error message from response
        const errorMessage = data.error || data.message || `HTTP ${response.status}: ${response.statusText}`;
        throw new Error(errorMessage);
      }

      return data;
    } catch (err) {
      // If it's already an Error with a message, re-throw it
      if (err instanceof Error && err.message) {
        throw err;
      }
      // Otherwise create a new error with a descriptive message
      throw new Error('Network error or unexpected response format');
    }
  };

  /**
   * Find user by email address
   * @param {string} email - User email address
   * @returns {Promise<Object>} User data
   */
  const findUserByEmail = async (email) => {
    return makeRequest(`${API_URL}/admin/legal-data-requests/find-user`, {
      method: 'POST',
      body: JSON.stringify({ email })
    });
  };

  /**
   * Generate complete legal data package
   * @param {string} emailOrUserId - User email or ID
   * @param {string} requestedBy - Name of person making request
   * @param {string} requestReason - Legal basis for request
   * @returns {Promise<Object>} Complete data package
   */
  const generateCompletePackage = async (emailOrUserId, requestedBy, requestReason) => {
    return makeRequest(`${API_URL}/admin/legal-data-requests/complete-package`, {
      method: 'POST',
      body: JSON.stringify({
        emailOrUserId,
        requestedBy,
        requestReason
      })
    });
  };

  return {
    findUserByEmail,
    generateCompletePackage
  };
}

export default useLegalDataRequestApi;
