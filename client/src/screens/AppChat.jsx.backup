import React, { useEffect } from 'react';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { LoadingScreen } from './LoadingScreen';
import { ConsentModal } from '../components/ConsentModal';
import PaymentMethodRequiredModal from '../components/PaymentMethodRequiredModal';
import SubscriptionRequiredModal from '../components/SubscriptionRequiredModal';
import OnboardingModal from '../components/OnboardingModal';
import MainContainer from '../layouts/MainContainer';
import { useLanguagePreference } from '../hooks/useLanguagePreference';
import { useAuth } from '../context/AuthContext';
import { initializeAnalytics, trackPageView } from '../utils/analyticsTracker';

/**
 * AppChat - Handles authenticated chat flow
 * Shows:
 * - Consent modal (if user hasn't accepted terms AND privacy)
 * - Payment required modal (if needed)
 * - Subscription required modal (if needed)
 * - Onboarding modal (if new user)
 * - Main chat container
 */
export function AppChat({ state }) {
  const {
    isPaymentMethodRequired,
    isSubscriptionRequired,
    isChat,
    authState,
    onboarding,
    startingPage,
    billingTab,
    handleNavigateToBilling,
    handleNavigateToSubscriptions,
    handleOnboardingNavigate,
    handleOnboardingClose,
    handleNavigateFromBilling,
    tempFlow,
  } = state;

  const { user } = useAuth();
  const [showConsentModal, setShowConsentModal] = React.useState(false);
  const [consentLoading, setConsentLoading] = React.useState(true);

  // Fetch actual consent status from database
  useEffect(() => {
    if (!user || !user.token) {
      setConsentLoading(false);
      return;
    }
    
    // Skip consent modal for temp/free trial users - they can try first, then consent on signup
    if (authState.isTemporaryAccount) {
      setShowConsentModal(false);
      setConsentLoading(false);
      return;
    }
    
    const fetchConsentStatus = async () => {
      try {
        const response = await fetch(`http://localhost:3000/auth/check-consent/${user.uid}`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${user.token}` }
        });
        const data = await response.json();
        
        // Show modal only if BOTH terms AND privacy are NOT accepted
        const needsConsent = !data.terms_accepted || !data.privacy_accepted;
        console.log('[APPCHAT] Consent check:', { terms_accepted: data.terms_accepted, privacy_accepted: data.privacy_accepted, needsConsent });
        setShowConsentModal(needsConsent);
      } catch (err) {
        console.error('[APPCHAT] Error checking consent:', err);
        // On error, require consent to be safe (compliance-first)
        setShowConsentModal(true);
      } finally {
        setConsentLoading(false);
      }
    };
    
    fetchConsentStatus();
  }, [user?.uid, user?.token]);

  // Fetch user's language preference from DB when authenticated
  useLanguagePreference();

  // Initialize analytics on first load
  useEffect(() => {
    initializeAnalytics();
    trackPageView('app-initialized');
  }, []);

  const isUserOnboarding = onboarding.onboardingStatus?.isOnboarding === true;

  // Force re-render when onboarding status changes
  useEffect(() => {
    console.log('[APPCHAT] Onboarding status updated:', isUserOnboarding);
  }, [isUserOnboarding]);

  // Handle consent accepted
  const handleConsentAccepted = () => {
    console.log('[APPCHAT] Consent accepted');
    setShowConsentModal(false);
    // User will be redirected or updated by AuthContext
    window.location.reload();
  };

  // Guard: Show loading while checking consent
  if (consentLoading) {
    return <ErrorBoundary><LoadingScreen /></ErrorBoundary>;
  }

  // Guard: Show consent modal if user hasn't accepted terms
  if (showConsentModal && user) {
    return (
      <ErrorBoundary>
        <ConsentModal
          userId={user.uid}
          token={user.token}
          onConsentAccepted={handleConsentAccepted}
        />
      </ErrorBoundary>
    );
  }

  // Guard: Don't show modals while onboarding data is loading
  if (authState.isAuthenticated && onboarding.onboardingStatus === null) {
    return <ErrorBoundary><LoadingScreen /></ErrorBoundary>;
  }

  // Show payment required modal
  if (isPaymentMethodRequired && !isUserOnboarding) {
    return (
      <ErrorBoundary>
        <PaymentMethodRequiredModal
          onNavigateToBilling={handleNavigateToBilling}
          isOnboarding={onboarding.onboardingStatus?.isOnboarding || false}
        />
      </ErrorBoundary>
    );
  }

  // Show subscription required modal
  if (isSubscriptionRequired && !isUserOnboarding) {
    return (
      <ErrorBoundary>
        <SubscriptionRequiredModal
          onNavigateToSubscriptions={handleNavigateToSubscriptions}
          isOnboarding={onboarding.onboardingStatus?.isOnboarding || false}
        />
      </ErrorBoundary>
    );
  }

  // Show chat with optional onboarding modal
  if (isChat) {
    const shouldShowModal = !authState.isTemporaryAccount && onboarding.onboardingStatus?.isOnboarding === true;
    console.log('[APPCHAT-RENDER] shouldShowModal:', shouldShowModal, 'isTemporaryAccount:', authState.isTemporaryAccount, 'isOnboarding:', onboarding.onboardingStatus?.isOnboarding);
    return (
      <ErrorBoundary>
        {shouldShowModal && (
          <OnboardingModal
            currentStep={onboarding.onboardingStatus.currentStep}
            completedSteps={onboarding.onboardingStatus.completedSteps}
            onNavigateToStep={handleOnboardingNavigate}
            onClose={handleOnboardingClose}
            isMinimized={onboarding.isMinimized}
            onToggleMinimize={onboarding.setIsMinimized}
            isDragging={onboarding.isDragging}
            position={onboarding.position}
            onStartDrag={onboarding.handleStartDrag}
          />
        )}

        <MainContainer
          auth={authState}
          token={authState.token}
          userId={authState.authUserId}
          onLogout={authState.handleLogout}
          onExit={() => {
            tempFlow.setAppExited(true);
          }}
          startingPage={startingPage}
          billingTab={billingTab}
          onNavigateFromBilling={handleNavigateFromBilling}
          onboarding={onboarding}
        />
      </ErrorBoundary>
    );
  }

  return null;
}
