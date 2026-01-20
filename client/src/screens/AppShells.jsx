import React from 'react';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { LoadingScreen } from './LoadingScreen';
import { ThankYouScreen } from './ThankYouScreen';
import { LandingScreenWrapper } from './LandingScreenWrapper';
import { LoginScreenWrapper } from './LoginScreenWrapper';
import { VerificationScreen } from './VerificationScreen';
import TwoFAScreen from './TwoFAScreen';
import { useTranslation } from '../context/TranslationContext';

/**
 * AppShells - Renders early screens before chat
 * Handles: Loading, Login, Register, Verification, 2FA, ThankYou, Landing
 */
export function AppShells({ state }) {
  const { language } = useTranslation();
  const {
    isLoading,
    isThankyou,
    isRegister,
    isVerification,
    isLanding,
    isLogin,
    isTwoFactor,
    verificationFailed,
    authState,
    modals,
    handlers,
    emailVerification,
    tempFlow,
    handleVerificationFailed,
    handleResendEmail,
    handleSignOutFromVerification,
    setVerificationFailed,
  } = state;

  if (isLoading) {
    return <ErrorBoundary><LoadingScreen /></ErrorBoundary>;
  }

  if (isThankyou || verificationFailed) {
    return (
      <ErrorBoundary>
        <ThankYouScreen
          onCreateAccount={async () => {
            // Delete the temporary account first
            if (authState.isTemporaryAccount) {
              await authState.deleteTemporaryAccount();
            }
            tempFlow.setAppExited(false);
            setVerificationFailed(false);
            // Reset auth state to ensure clean login state for Google sign-in
            authState.resetAuthState();
            authState.setHasLoggedOut(false);
            modals.setShowRegisterMode(true);
          }}
          onContinue={() => {
            tempFlow.setAppExited(false);
            setVerificationFailed(false);
          }}
                              onExit={async () => {
            try {
              await authState.exitApp(authState.isTemporaryAccount);
              // Reset app state like Create Account does
              tempFlow.setAppExited(false);
              setVerificationFailed(false);
              authState.setHasLoggedOut(false);
            } catch (err) {
              console.error('[EXIT-BUTTON] Error exiting app:', err);
              // Still reset state even if error
              tempFlow.setAppExited(false);
              setVerificationFailed(false);
            }
          }}
        />
      </ErrorBoundary>
    );
  }

  if (isVerification) {
    return (
      <ErrorBoundary>
        <VerificationScreen
          userEmail={authState.authEmail}
          onVerified={() => emailVerification.setIsVerified(true)}
          onResendEmail={handleResendEmail}
          isLoading={emailVerification.loading}
          error={emailVerification.error}
          resendLoading={emailVerification.loading}
          checkCount={emailVerification.checkCount || 0}
          onVerificationFailed={handleVerificationFailed}
          onSignOut={handleSignOutFromVerification}
        />
      </ErrorBoundary>
    );
  }

  if (isRegister) {
    return <ErrorBoundary><LoginScreenWrapper /></ErrorBoundary>;
  }

  if (isLanding) {
    return (
      <ErrorBoundary>
        <LandingScreenWrapper
          onTryFree={() => {
            authState.setHasLoggedOut(false);
            // Save selected language to localStorage before creating temp account
            localStorage.setItem('temp_user_language', language);
            handlers.handleTryFree();
          }}
          onCreateAccount={() => {
            authState.setHasLoggedOut(false);
            handlers.handleCreateAccount();
          }}
          onSignIn={() => {
            authState.setHasLoggedOut(false);
            handlers.handleSignIn();
          }}
        />
      </ErrorBoundary>
    );
  }

  if (isLogin) {
    return <ErrorBoundary><LoginScreenWrapper /></ErrorBoundary>;
  }

  if (isTwoFactor) {
    return (
      <ErrorBoundary>
        <TwoFAScreen
          userId={authState.tempUserId}
          tempToken={authState.tempToken}
          method={authState.twoFactorMethod}
          verify2FAFunc={authState.verify2FA}
          onVerified={() => {}}
          onSignOut={authState.handleLogout}
          isLoading={false}
          error={authState.error}
        />
      </ErrorBoundary>
    );
  }

  return null;
}
