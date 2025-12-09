/**
 * Wrapper around fetch that handles token refresh on 403
 */
export async function fetchWithTokenRefresh(url, options = {}) {
  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3000";
  
  try {
    let response = await fetch(url, options);

    if (response.status === 403) {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        localStorage.clear();
        window.location.href = '/';
        return response;
      }

      try {
        const refreshResponse = await fetch(`${API_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken })
        });

        if (refreshResponse.ok) {
          const data = await refreshResponse.json();
          const newToken = data.token;
          localStorage.setItem('token', newToken);
          const headers = options.headers || {};
          headers['Authorization'] = `Bearer ${newToken}`;
          response = await fetch(url, { ...options, headers });
          return response;
        } else {
          localStorage.clear();
          window.location.href = '/';
          return response;
        }
      } catch (err) {
        localStorage.clear();
        window.location.href = '/';
        return response;
      }
    }

    return response;
  } catch (err) {
    throw err;
  }
}
