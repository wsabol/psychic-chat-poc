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

  // Core hooks
  const authState = useAuth();
  const modals = useModalState();
  const tempFlow = useTempAccountFlow(authState);
  const handlers = useAuthHandlers(authState, modals, tempFlow);
  
  const { isLoading, isThankyou, isRegister, isVerification, isLanding, isLogin, isTwoFactor, isPaymentMethodRequired, isSubscriptionRequired, isChat } = useAppRouting(authState, tempFlow.appExited, modals.showRegisterMode, skipPaymentCheck, skipSubscriptionCheck);
  
  const emailVerification = useEmailVerification();
  const onboarding = useOnboarding(authState.token);

  // Effect: Reset modal when authenticated
  useEffect(() => {
    if (authState.isAuthenticated && previousAuthState !== authState.isAuthenticated) {
      modals.setShowRegisterMode(false);
    }
    setPreviousAuthState(authState.isAuthenticated);
  }, [authState.isAuthenticated, previousAuthState, modals]);

  // Effect: Start email verification polling
  useEffect(() => {
    if (isVerification && auth.currentUser) {
      emailVerification.startVerificationPolling(
        auth.currentUser,
        40,
        () => {
          authState.setEmailVerified(true);
          authState.refreshEmailVerificationStatus();
        }
      );
    }
  }, [isVerification, emailVerification, authState]);

  // Effect: Auto-navigate new users to payment methods
  useEffect(() => {
    if (authState.emailVerified && !authState.isTemporaryAccount && onboarding.onboardingStatus?.isOnboarding) {
      setSkipPaymentCheck(true);
      setSkipSubscriptionCheck(true);
      setStartingPage(7);
    }
  }, [authState.emailVerified, authState.isTemporaryAccount, onboarding.onboardingStatus?.isOnboarding]);

  // Effect: Update onboarding when subscription completes
  useEffect(() => {
    if (authState.hasActiveSubscription && skipSubscriptionCheck) {
      setSkipSubscriptionCheck(false);
      setStartingPage(0);
      if (onboarding.updateOnboardingStep) {
        onboarding.updateOnboardingStep('subscription').catch(err => {
          console.warn('[ONBOARDING] Failed to update subscription step:', err);
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
    setStartingPage(7);
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
    setStartingPage(7);
  }, []);

  const handleOnboardingNavigate = useCallback((step) => {
    switch(step) {
      case 'payment_method':
        setSkipPaymentCheck(true);
        setSkipSubscriptionCheck(true);
        setStartingPage(7);
        break;
      case 'subscription':
        setSkipPaymentCheck(true);
        setSkipSubscriptionCheck(true);
        setBillingTab('subscriptions');
        setStartingPage(7);
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
      console.warn('[ONBOARDING] Failed to mark onboarding complete on close:', err);
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
