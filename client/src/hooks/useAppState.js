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
  const emailVerification = useEmailVerification();
  // CRITICAL: Pass isTemporaryAccount to skip onboarding for free trial users
  const onboarding = useOnboarding(authState.token, authState.isTemporaryAccount);
  
  const { isLoading, isThankyou, isRegister, isVerification, isLanding, isLogin, isTwoFactor, isPaymentMethodRequired, isSubscriptionRequired, isChat } = useAppRouting(authState, tempFlow.appExited, modals.showRegisterMode, skipPaymentCheck, skipSubscriptionCheck, isAdmin, onboarding?.onboardingStatus?.isOnboarding ?? false);

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

  // Effect: Route established users with COMPLETED onboarding to Chat
  // CRITICAL: If onboarding_completed = true, user should ALWAYS go to Chat (index 0)
  useEffect(() => {
    // Only for authenticated, non-temp users with loaded onboarding status
    if (authState.isAuthenticated && !authState.isTemporaryAccount && onboarding.onboardingStatus !== null) {
      // Check if onboarding is COMPLETE (isOnboarding = false)
      if (onboarding.onboardingStatus?.isOnboarding === false) {
        setStartingPage(0); // Chat page
        setSkipPaymentCheck(true);
        setSkipSubscriptionCheck(true);
      }
    }
  }, [authState.isAuthenticated, authState.isTemporaryAccount, onboarding.onboardingStatus]);

  // Effect: Auto-navigate NEW users to payment methods (only if still onboarding)
  useEffect(() => {
    if (authState.emailVerified && !authState.isTemporaryAccount && onboarding.onboardingStatus?.isOnboarding === true) {
      setSkipPaymentCheck(true);
      setSkipSubscriptionCheck(true);
            setStartingPage(9); // billing page is now index 9 after adding admin
    }
  }, [authState.emailVerified, authState.isTemporaryAccount, onboarding.onboardingStatus?.isOnboarding]);

  // Effect: Route new users with active subscription to Personal Info page (only if still onboarding)
  useEffect(() => {
    if (authState.hasActiveSubscription && skipSubscriptionCheck && onboarding.onboardingStatus?.isOnboarding === true) {
      setSkipSubscriptionCheck(false);
      setStartingPage(1);  // ← PersonalInfoPage (Get Acquainted)
      if (onboarding.updateOnboardingStep) {
        onboarding.updateOnboardingStep('subscription').catch(err => {
                });
      }
    }
  }, [authState.hasActiveSubscription, skipSubscriptionCheck, onboarding.onboardingStatus?.isOnboarding, onboarding]);

  // CRITICAL: Ensure temporary accounts ALWAYS stay on ChatPage (index 0)
  // This prevents any effect or initialization from sending them to PersonalInfoPage
  useEffect(() => {
    if (authState.isTemporaryAccount && startingPage !== 0) {
      setStartingPage(0);
    }
  }, [authState.isTemporaryAccount, startingPage]);

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
    // CRITICAL: For temporary accounts (free trial), DO NOT navigate to PersonalInfoPage automatically
    // Temp accounts use ChatPage's 60-second timer flow - they explicitly choose to enter birth info
    // This handler is only for permanent accounts going through onboarding
    if (authState.isTemporaryAccount && step === 'personal_info') {
      return; // Skip navigation for temp accounts
    }
    
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
            case 'welcome':
        setStartingPage(0);
        if (onboarding.updateOnboardingStep) {
          onboarding.updateOnboardingStep('welcome').catch(err => {});
        }
        break;
      case 'security_settings':
        setStartingPage(6);
        break;
      default:
        break;
    }
  }, [onboarding, authState.isTemporaryAccount]);

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

