import { auth } from '../firebase';
import { logErrorFromCatch } from '../shared/errorLogger.js';

// Prevent multiple simultaneous token refresh attempts
let tokenRefreshPromise = null;

/**
 * Wrapper around fetch that handles Firebase token refresh on 401/403
 * Firebase tokens expire after 1 hour - this automatically refreshes them
 */
export async function fetchWithTokenRefresh(url, options = {}) {
  
  try {
    let response = await fetch(url, options);

    // Handle both 401 (token expired) and 403 (invalid token)
    if (response.status === 401 || response.status === 403) {
      // Check if it's a token expiration error
      let errorData = {};
      try {
        errorData = await response.clone().json();
      } catch (e) {
        // response not JSON
      }
      
      const isTokenExpired = errorData.code === 'TOKEN_EXPIRED' || response.status === 401;
      
      if (!isTokenExpired) {
        // Not a token issue, return the error
        return response;
      }

      try {
        // Get fresh Firebase ID token from current user
        const currentUser = auth.currentUser;
        if (!currentUser) {
          // No user logged in - log them out completely
          // Use a redirect flag to prevent race conditions
          sessionStorage.setItem('redirecting', 'true');
          setTimeout(() => {
            localStorage.clear();
            sessionStorage.clear();
            window.location.href = '/';
          }, 100);
          // Return a proper error response
          return new Response(JSON.stringify({ error: 'Session expired. Please log in again.' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        
        // Use a shared promise to prevent multiple simultaneous refresh attempts
        if (!tokenRefreshPromise) {
          tokenRefreshPromise = currentUser.getIdToken(true); // 'true' forces refresh
          
          tokenRefreshPromise
            .finally(() => {
              tokenRefreshPromise = null; // Reset after completion
            });
        }
        
        const freshToken = await tokenRefreshPromise;
        
        if (!freshToken) {
          // Failed to get fresh token
          logErrorFromCatch('[FETCH] Failed to get fresh token from Firebase');
          sessionStorage.setItem('redirecting', 'true');
          setTimeout(() => {
            localStorage.clear();
            sessionStorage.clear();
            window.location.href = '/';
          }, 100);
          return new Response(JSON.stringify({ error: 'Failed to refresh session. Please log in again.' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        
        // Retry original request with fresh token
        const headers = { ...(options.headers || {}) };
        headers['Authorization'] = `Bearer ${freshToken}`;
        response = await fetch(url, { ...options, headers });
        return response;
      } catch (err) {
        logErrorFromCatch('[FETCH] Token refresh failed:', err.message);
        // Token refresh failed, redirect to login
        sessionStorage.setItem('redirecting', 'true');
        setTimeout(() => {
          localStorage.clear();
          sessionStorage.clear();
          window.location.href = '/';
        }, 100);
        return new Response(JSON.stringify({ error: 'Session refresh failed. Please log in again.' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    return response;
  } catch (err) {
    logErrorFromCatch('[FETCH] Request error:', err);
    throw err;
  }
}

