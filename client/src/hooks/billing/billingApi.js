import { fetchWithTokenRefresh } from '../../utils/fetchWithTokenRefresh';
import { logErrorFromCatch } from '../../shared/errorLogger.js';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

/**
 * Shared error handler for billing API calls
 */
function handleError(context, error) {
  const message = error.message || `Failed to ${context}`;
  logErrorFromCatch(`[BILLING] ${context} error:`, error);
  return message;
}

/**
 * Generic API call wrapper for billing endpoints
 * Handles loading, error, and token refresh
 */
export async function billingFetch(endpoint, options = {}) {
  const { method = 'GET', body = null, errorContext = 'API call' } = options;

  const headers = {
    'Authorization': `Bearer ${options.token}`,
    ...(body && { 'Content-Type': 'application/json' }),
  };

  try {
    const response = await fetchWithTokenRefresh(`${API_URL}${endpoint}`, {
      method,
      headers,
      ...(body && { body: JSON.stringify(body) }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to ${errorContext}`);
    }

    return await response.json();
  } catch (error) {
    const message = handleError(errorContext, error);
    throw new Error(message);
  }
}
