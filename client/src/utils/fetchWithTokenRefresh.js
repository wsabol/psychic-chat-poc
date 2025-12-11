import { auth } from '../firebase';

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
          // No user logged in
          console.warn('[FETCH] No user logged in, redirecting to login');
          localStorage.clear();
          window.location.href = '/';
          return response;
        }

        console.log('[FETCH] Token expired, refreshing from Firebase...');
        
        // Force token refresh from Firebase
        const freshToken = await currentUser.getIdToken(true); // 'true' forces refresh
        
        if (!freshToken) {
          // Failed to get fresh token
          console.error('[FETCH] Failed to get fresh token from Firebase');
          localStorage.clear();
          window.location.href = '/';
          return response;
        }

        console.log('[FETCH] Got fresh token, retrying request...');
        
        // Retry original request with fresh token
        const headers = options.headers || {};
        headers['Authorization'] = `Bearer ${freshToken}`;
        response = await fetch(url, { ...options, headers });
        return response;
      } catch (err) {
        console.error('[FETCH] Token refresh failed:', err.message);
        // Token refresh failed, redirect to login
        localStorage.clear();
        window.location.href = '/';
        return response;
      }
    }

    return response;
  } catch (err) {
    console.error('[FETCH] Request error:', err);
    throw err;
  }
}
