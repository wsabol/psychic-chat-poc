import React from 'react';
import { useAppState } from './hooks/useAppState';
import { AppShells } from './screens/AppShells';
import { AppChat } from './screens/AppChat';

/**
 * App - Main application component
 * 
 * Routes between:
 * 1. Pre-auth screens (login, register, verify email, 2FA, etc.)
 * 2. Authenticated screens (chat, billing modals, onboarding)
 */
function App() {
  const state = useAppState();

  // Check if we should show pre-auth shells
  if (state.isLoading || state.isThankyou || state.isVerification || state.isRegister || state.isLanding || state.isLogin || state.isTwoFactor) {
    return <AppShells state={state} />;
  }

  // Otherwise show authenticated chat flow
  return <AppChat state={state} />;
}

export default App;
