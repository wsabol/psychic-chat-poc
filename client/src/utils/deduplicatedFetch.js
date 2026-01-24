import { fetchWithTokenRefresh } from './fetchWithTokenRefresh.js';

/**
 * Request deduplication cache
 * Prevents multiple simultaneous identical requests
 * Key format: "METHOD:URL:BODY_HASH"
 */
const requestCache = new Map();

/**
 * Simple hash function for request body
 */
function hashRequestBody(body) {
  if (!body) return 'NO_BODY';
  if (typeof body === 'string') return body.substring(0, 100); // Simple hash for strings
  return JSON.stringify(body).substring(0, 100); // Simple hash for objects
}

/**
 * Generate cache key for a request
 */
function getCacheKey(url, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const bodyHash = hashRequestBody(options.body);
  return `${method}:${url}:${bodyHash}`;
}

/**
 * Wrapper around fetchWithTokenRefresh that deduplicates simultaneous identical requests
 * 
 * If multiple identical requests are made at the same time, only one actual network request
 * is made and all callers receive the same promise/response.
 * 
 * @param {string} url - The URL to fetch
 * @param {object} options - Fetch options (method, headers, body, etc.)
 * @returns {Promise<Response>} - The fetch response
 */
export async function deduplicatedFetch(url, options = {}) {
  const cacheKey = getCacheKey(url, options);
  
  // If an identical request is already in progress, wait for it and clone the response
  if (requestCache.has(cacheKey)) {
    const cachedPromise = requestCache.get(cacheKey);
    const response = await cachedPromise;
    // Clone the response for this caller so they can read the body independently
    return response.clone();
  }
  
  // Create new request promise
  const requestPromise = fetchWithTokenRefresh(url, options)
    .finally(() => {
      // Clean up cache entry after request completes
      requestCache.delete(cacheKey);
    });
  
  // Store the promise in cache
  requestCache.set(cacheKey, requestPromise);
  
  const response = await requestPromise;
  // Clone the response for this caller so they can read the body independently
  return response.clone();
}

/**
 * Clear all pending request cache entries
 * Useful for testing or when user logs out
 */
export function clearRequestCache() {
  requestCache.clear();
}

/**
 * Get the number of in-flight requests
 * Useful for debugging
 */
export function getInFlightRequestCount() {
  return requestCache.size;
}
