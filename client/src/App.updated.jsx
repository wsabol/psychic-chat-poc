import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAppState } from './hooks/useAppState';
import { useAuth } from './hooks/useAuth';
import { AppShells } from './screens/AppShells';
import { AppChat } from './screens/AppChat';
import { PoliciesPage } from './pages/PoliciesPage';
import StarField from './components/StarField';

/**
 * App - Main application component
 * 
 * Routes between:
 * 1. Policy pages (accessible to all)
 * 2. Pre-auth screens (login, register, verify email, 2FA, etc.)
 * 3. Authenticated screens (chat, billing modals, onboarding)
 * 
 * TIMEZONE: Detects browser timezone on app startup and saves to user preferences
 */
function App() {
  const state = useAppState();
  const location = useLocation();
  const { isAuthenticated, authUserId } = useAuth();

  // Detect and save user's timezone on app startup
  useEffect(() => {
    const saveUserTimezone = async () => {
      try {
        // Get user's browser timezone (e.g., "America/Chicago")
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        
        // Only save if user is authenticated and we have their ID
        if (isAuthenticated && authUserId) {
          const response = await fetch('/auth/preferences/timezone', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              userId: authUserId,
              timezone: timezone
            })
          });
          
          if (response.ok) {
            const data = await response.json();
            console.log('[TIMEZONE] Saved user timezone:', data.timezone);
          } else {
            console.warn('[TIMEZONE] Failed to save timezone:', response.statusText);
          }
        }
      } catch (err) {
        console.error('[TIMEZONE] Error detecting/saving timezone:', err);
        // Silent fail - not critical, will fall back to GMT on server
      }
    };
    
    saveUserTimezone();
  }, [isAuthenticated, authUserId]);

  // Check if viewing a policy page
  const isPoliciesPage = location.pathname === '/policies';

  if (isPoliciesPage) {
    return (
      <>
        <StarField />
        <PoliciesPage />
      </>
    );
  }

  // Check if we should show pre-auth shells
  if (state.isLoading || state.isThankyou || state.isVerification || state.isRegister || state.isLanding || state.isLogin || state.isTwoFactor) {
    return (
      <>
        <StarField />
        <AppShells state={state} />
      </>
    );
  }

  // Otherwise show authenticated chat flow
  return (
    <>
      <StarField />
      <AppChat state={state} />
    </>
  );
}

export default App;
