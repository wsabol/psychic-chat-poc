import { useEffect, useRef } from 'react';
import { logErrorFromCatch } from '../shared/errorLogger.js';

export function useTokenRefresh() {
  const refreshInterval = useRef(null);
  
  useEffect(() => {
    const refreshToken = localStorage.getItem('refreshToken');
    const token = localStorage.getItem('token');
    
    // Only start refresh loop if we have both tokens
    if (!refreshToken || !token) return;
    
    // Refresh token every 10 minutes (before 15-minute expiry)
    refreshInterval.current = setInterval(async () => {
      try {
        const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3000";
        
        const res = await fetch(`${API_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken })
        });
        
        if (!res.ok) {
          logErrorFromCatch('⚠️ Token refresh failed, session may need renewal');
          return;
        }
        
        const data = await res.json();
        localStorage.setItem('token', data.token);
      } catch (err) {
        logErrorFromCatch('Token refresh error:', err);
      }
    }, 10 * 60 * 1000);  // Every 10 minutes
    
    return () => {
      if (refreshInterval.current) {
        clearInterval(refreshInterval.current);
      }
    };
  }, []);
}
