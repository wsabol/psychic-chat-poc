import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAppState } from './hooks/useAppState';
import { AppShells } from './screens/AppShells';
import { AppChat } from './screens/AppChat';
import { PoliciesPage } from './pages/PoliciesPage';
import StarField from './components/StarField';
import Footer from './components/Footer';

/**
 * App - Main application component
 * 
 * Routes between:
 * 1. Policy pages (accessible to all)
 * 2. Pre-auth screens (login, register, verify email, 2FA, etc.)
 * 3. Authenticated screens (chat, billing modals, onboarding)
 */
function App() {
  const state = useAppState();
  const location = useLocation();

  // Check if viewing a policy page
  const isPoliciesPage = location.pathname === '/policies';

    if (isPoliciesPage) {
    return (
      <>
        <StarField />
        <PoliciesPage />
        <Footer />
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
