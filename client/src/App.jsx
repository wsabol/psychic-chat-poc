import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAppState } from './hooks/useAppState';
import { AppShells } from './screens/AppShells';
import { AppChat } from './screens/AppChat';
import { PoliciesPage } from './pages/PoliciesPage';
import StarField from './components/StarField';
import Footer from './components/Footer';
import { initializeCookieManager } from './utils/cookieManager.js';
import InstallPromptBanner from './components/InstallPromptBanner';

/**
 * App - Main application component
 *
 * Routes between:
 * 1. Policy pages (accessible to all)
 * 2. Pre-auth screens (login, register, verify email, 2FA, etc.)
 * 3. Authenticated screens (chat, billing modals, onboarding)
 */
function App() {
  // On startup, enforce the user's previously-saved cookie preference.
  // If cookies were disabled in a prior session, this immediately purges
  // any non-essential cookies that may have been set before the page loaded.
  useEffect(() => {
    initializeCookieManager();
  }, []);

  // ── Magic-link 2FA completion ─────────────────────────────────────────────
  // When the user clicks "Verify My Email & Sign In" in the 2FA email, the API
  // marks the verification code as used then redirects here with:
  //   ?magic_verified=true&uid=<firebaseUid>
  //
  // We store `2fa_verified_<uid>` in sessionStorage so that the next time
  // onAuthStateChanged runs it finds the session already verified and skips
  // the TwoFAScreen — no code entry required.
  //
  // If the link is clicked in a different browser (no Firebase session), the
  // flag is stored but ignored because Firebase auth will be null and the user
  // will be directed to the login page — which is correct and secure.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const magicVerified = params.get('magic_verified');
    const uid           = params.get('uid');
    const verifyError   = params.get('verify_error');

    if (magicVerified === 'true' && uid) {
      // Mark this user's 2FA as verified for the current browser session.
      sessionStorage.setItem(`2fa_verified_${uid}`, 'true');
      // Clean the URL so the params don't persist on refresh.
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (verifyError) {
      // The magic link was invalid/expired — just clean the URL.
      // The auth flow will show the TwoFAScreen where the user can request a new code.
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);
  // ─────────────────────────────────────────────────────────────────────────

  const state = useAppState();
  const location = useLocation();

  // Check if viewing a policy page
  const isPoliciesPage = location.pathname === '/policies';

    if (isPoliciesPage) {
    return (
      <>
        <InstallPromptBanner />
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
        <InstallPromptBanner />
        <StarField />
        <AppShells state={state} />
      </>
    );
  }

  // Otherwise show authenticated chat flow
  return (
    <>
      <InstallPromptBanner />
      <StarField />
      <AppChat state={state} />
    </>
  );
}

export default App;
