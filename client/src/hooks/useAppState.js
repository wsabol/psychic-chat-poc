import { useState, useCallback, useEffect } from 'react';
import { useAuth } from './useAuth';
import { useTokenRefresh } from './useTokenRefresh';
import { useModalState } from './useModalState';
import { useTempAccountFlow } from './useTempAccountFlow';
import { useAuthHandlers } from './useAuthHandlers';
import { useAppRouting } from './useAppRouting';
import { useEmailVerification } from './useEmailVerification';
import { useOnboarding } from './useOnboarding';
import { auth } from '../firebase';

/**
 * Consolidates all app state management into one hook
 * WITH DEBUG LOGGING
 */
export function useAppState() {
  useTokenRefresh();
  
    // Navigation state
  const [skipPaymentCheck, setSkipPaymentCheck] = useState(true);
  const [skipSubscriptionCheck, setSkipSubscriptionCheck] = useState(true);
  const [startingPage, setStartingPage] = useState(0);
  const [billingTab, setBillingTab] = useState('payment-methods');
  const [onboardingClosed, setOnboardingClosed] = useState(false);
  const [verificationFailed, setVerificationFailed] = useState(false);
  const [previousAuthState, setPreviousAuthState] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Core hooks
  const authState = useAuth();
  const modals = useModalState();
  const tempFlow = useTempAccountFlow(authState);
  const handlers = useAuthHandlers(authState, modals, tempFlow);
  
  const { isLoading, isThankyou, isRegister, isVerification, isLanding, isLogin, isTwoFactor, isPaymentMethodRequired, isSubscriptionRequired, isChat } = useAppRouting(authState, tempFlow.appExited, modals.showRegisterMode, skipPaymentCheck, skipSubscriptionCheck, isAdmin);
  
  const emailVerification = useEmailVerification();
  const onboarding = useOnboarding(authState.token);

  // Effect: Reset modal when authenticated
  useEffect(() => {
    if (authState.isAuthenticated && previousAuthState !== authState.isAuthenticated) {
      modals.setShowRegisterMode(false);
    }
    setPreviousAuthState(authState.isAuthenticated);
  }, [authState.isAuthenticated, previousAuthState, modals]);

    // Effect: Check admin status after authentication
  useEffect(() => {
    if (authState.isAuthenticated && authState.token && authState.authUserId) {
      // Check if user is admin
      const ADMIN_EMAILS = ['starshiptechnology1@gmail.com', 'wsabol39@gmail.com'];
      const isUserAdmin = ADMIN_EMAILS.includes(authState.authEmail?.toLowerCase());
      setIsAdmin(isUserAdmin);
    } else {
      setIsAdmin(false);
    }
  }, [authState.isAuthenticated, authState.token, authState.authUserId, authState.authEmail]);

    // Effect: Start email verification polling and cleanup old temp account on verification
  useEffect(() => {
    if (isVerification && auth.currentUser) {
      const onVerified = async () => {
        authState.setEmailVerified(true);
        authState.refreshEmailVerificationStatus();
        try {
          const newUserId = auth.currentUser?.uid;
          if (!newUserId) return;
          const tempAccountUid = localStorage.getItem('temp_account_uid');
          if (tempAccountUid && tempAccountUid !== newUserId) {
            await fetch(`http://localhost:3000/cleanup/delete-temp-account/${tempAccountUid}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' } });
            localStorage.removeItem('temp_account_uid');
            localStorage.removeItem('temp_account_email');
          }
        } catch (err) {}
      };
      emailVerification.startVerificationPolling(auth.currentUser, 40, onVerified);
    }
  }, [isVerification, emailVerification, authState]);

  // Effect: Auto-navigate new users to payment methods
  useEffect(() => {
    if (authState.emailVerified && !authState.isTemporaryAccount && onboarding.onboardingStatus?.isOnboarding) {
      setSkipPaymentCheck(true);
      setSkipSubscriptionCheck(true);
            setStartingPage(9); // billing page is now index 9 after adding admin
    }
  }, [authState.emailVerified, authState.isTemporaryAccount, onboarding.onboardingStatus?.isOnboarding]);

  // Effect: Update onboarding when subscription completes
  useEffect(() => {
    if (authState.hasActiveSubscription && skipSubscriptionCheck) {
      setSkipSubscriptionCheck(false);
      setStartingPage(0);
      if (onboarding.updateOnboardingStep) {
        onboarding.updateOnboardingStep('subscription').catch(err => {
        });
      }
    }
  }, [authState.hasActiveSubscription, skipSubscriptionCheck, onboarding]);

  // Handlers
  const handleVerificationFailed = useCallback(() => {
    setVerificationFailed(true);
    tempFlow.setAppExited(true);
  }, [tempFlow]);

  const handleResendEmail = useCallback(async () => {
    if (auth.currentUser) {
      return await emailVerification.resendVerificationEmail(auth.currentUser);
    }
    return false;
  }, [emailVerification]);

  const handleSignOutFromVerification = useCallback(async () => {
    await authState.handleLogout();
  }, [authState]);

        const handleNavigateToBilling = useCallback(() => {
    setSkipPaymentCheck(true);
    setSkipSubscriptionCheck(true);
    setStartingPage(9); // billing page is now index 9 after adding admin
  }, []);

  const handleNavigateFromBilling = useCallback(async () => {
    setSkipPaymentCheck(true);
    setSkipSubscriptionCheck(false);
    if (authState.token && authState.authUserId) {
      await authState.recheckSubscriptionOnly(authState.token, authState.authUserId);
    }
  }, [authState]);

        const handleNavigateToSubscriptions = useCallback(() => {
    setSkipSubscriptionCheck(true);
    setStartingPage(9); // billing page is now index 9 after adding admin
  }, []);

        const handleOnboardingNavigate = useCallback((step) => {
    switch(step) {
      case 'payment_method':
        setSkipPaymentCheck(true);
        setSkipSubscriptionCheck(true);
        setStartingPage(9); // billing page is now index 9 after adding admin
        break;
      case 'subscription':
        setSkipPaymentCheck(true);
        setSkipSubscriptionCheck(true);
        setBillingTab('subscriptions');
        setStartingPage(9); // billing page is now index 9 after adding admin
        break;
            case 'personal_info':
        setStartingPage(1);
        break;
      case 'security_settings':
        setStartingPage(6);
        break;
      default:
        break;
    }
  }, []);

  const handleOnboardingClose = useCallback(async () => {
    try {
      if (onboarding.updateOnboardingStep) {
        await onboarding.updateOnboardingStep('subscription');
      }
    } catch (err) {
    } finally {
      setOnboardingClosed(true);
    }
  }, [onboarding]);

  return {
    // State
    authState,
    modals,
    tempFlow,
    handlers,
    emailVerification,
    onboarding,
    verificationFailed,
    onboardingClosed,
    startingPage,
    billingTab,

    // Routing
    isLoading,
    isThankyou,
    isRegister,
    isVerification,
    isLanding,
    isLogin,
    isTwoFactor,
    isPaymentMethodRequired,
    isSubscriptionRequired,
    isChat,

    // Handlers
    handleVerificationFailed,
    handleResendEmail,
    handleSignOutFromVerification,
    handleNavigateToBilling,
    handleNavigateFromBilling,
    handleNavigateToSubscriptions,
    handleOnboardingNavigate,
    handleOnboardingClose,
    setVerificationFailed,
  };
}

