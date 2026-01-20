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
        } catch (err) {
          // Cleanup failed - account verification still successful
        }
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

    // Effect: Route users based on their current onboarding step
  // CRITICAL: Check the database field onboarding_step (last completed step)
  // - If onboarding_step = "create_account" → Route to Billing (payment method)
  // - If onboarding_step = "payment_method_added" → Route to Billing (subscriptions)
  // - If onboarding_step = "subscription_complete" → Route to Personal Info
  // - If onboarding_step = "personal_info_complete" → Route to Chat with Welcome
  useEffect(() => {
    // Only for authenticated, non-temp users with loaded onboarding status
    if (authState.isAuthenticated && !authState.isTemporaryAccount && onboarding.onboardingStatus?.isOnboarding === true) {
      const currentStep = onboarding.onboardingStatus?.currentStep;
      
      // Route based on current step
      if (currentStep === 'create_account' || currentStep === 'payment_method') {
        setSkipPaymentCheck(true);
        setSkipSubscriptionCheck(true);
        setBillingTab('payment-methods');
        setStartingPage(9); // Billing page
            } else if (currentStep === 'subscription') {
        setSkipPaymentCheck(true);
        setSkipSubscriptionCheck(true);
        setStartingPage(1); // PersonalInfoPage (Get Acquainted)
      } else if (currentStep === 'personal_info') {
        setSkipPaymentCheck(true);
        setSkipSubscriptionCheck(true);
        setStartingPage(1); // PersonalInfoPage
      } else if (currentStep === 'welcome') {
        setSkipPaymentCheck(true);
        setSkipSubscriptionCheck(true);
        setStartingPage(0); // ChatPage with Welcome modal
      }
    }
  }, [authState.isAuthenticated, authState.isTemporaryAccount, onboarding.onboardingStatus?.isOnboarding, onboarding.onboardingStatus?.currentStep]);

    // Note: Subscription completion routing is now handled by the step-based routing effect above
  // No longer need to check hasActiveSubscription - we check currentStep instead

      // Effect: Ensure temporary (free trial) accounts start on ChatPage (index 0) at login
  // CRITICAL: Free trial users should ALWAYS start at Chat (index 0)
  // This is their main interface and they navigate from there
  useEffect(() => {
    if (authState.isAuthenticated && authState.isTemporaryAccount) {
      setStartingPage(0); // Always Chat for free trial
    }
  }, [authState.isAuthenticated, authState.isTemporaryAccount]);

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
    setBillingTab('payment-methods');
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
    setSkipPaymentCheck(true);
    setSkipSubscriptionCheck(true);
    setBillingTab('subscriptions');
    setStartingPage(9); // billing page is now index 9 after adding admin
  }, []);

    const handleOnboardingNavigate = useCallback((step) => {
    // CRITICAL: This handler is called when user clicks a step in the OnboardingModal
    // For temporary accounts (free trial), DO NOT navigate to PersonalInfoPage automatically
    // Temp accounts use ChatPage's 60-second timer flow - they explicitly choose to enter birth info
    // This handler is only for permanent accounts going through onboarding
    if (authState.isTemporaryAccount && step === 'personal_info') {
      return; // Skip navigation for temp accounts
    }
    
    switch(step) {
      case 'payment_method':
        setSkipPaymentCheck(true);
        setSkipSubscriptionCheck(true);
        setBillingTab('payment-methods');
        setStartingPage(9); // billing page is now index 9 after adding admin
        break;
            case 'subscription':
        setSkipPaymentCheck(true);
        setSkipSubscriptionCheck(true);
        setStartingPage(1); // PersonalInfoPage (Get Acquainted)
        break;
      case 'personal_info':
        setStartingPage(1);
        break;
              case 'welcome':
        setStartingPage(0);
        // CRITICAL: Do NOT call updateOnboardingStep here!
        // The WelcomeMessage will be shown automatically because personal_info is completed
        // Only call updateOnboardingStep when welcome modal closes (via onOnboardingComplete)
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
      // Error updating step - user can retry or continue
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

