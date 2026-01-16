import React, { useEffect, useState } from 'react';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { LoadingScreen } from './LoadingScreen';
import { ConsentModal } from '../components/ConsentModal';
import PaymentMethodRequiredModal from '../components/PaymentMethodRequiredModal';
import SubscriptionRequiredModal from '../components/SubscriptionRequiredModal';
import OnboardingModal from '../components/OnboardingModal';
import WelcomeMessage from '../components/WelcomeMessage';
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
 * - Welcome message (after onboarding completes)
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
  const [showWelcomeMessage, setShowWelcomeMessage] = useState(false);
  const [wasOnboarding, setWasOnboarding] = useState(false);

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
        const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';
        const response = await fetch(`${API_URL}/auth/check-consent/${user.uid}`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${user.token}` }
        });
        const data = await response.json();
        
        // Show modal only if BOTH terms AND privacy are NOT accepted
        const needsConsent = !data.terms_accepted || !data.privacy_accepted;
        setShowConsentModal(needsConsent);
      } catch (err) {

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

  // Detect when onboarding COMPLETES (transitions from true to false)
  useEffect(() => {
    
    // If was onboarding and now NOT onboarding = onboarding just completed
    if (wasOnboarding && !isUserOnboarding) {
      setShowWelcomeMessage(true);
    }
    
    // Track state for next render
    setWasOnboarding(isUserOnboarding);
  }, [isUserOnboarding, wasOnboarding]);

  // Debug: Track welcome message state
  useEffect(() => {
  }, [showWelcomeMessage]);

  // Handle consent accepted
  const handleConsentAccepted = () => {
    setShowConsentModal(false);
    // User will be redirected or updated by AuthContext
    window.location.reload();
  };

  // Handle welcome message close
  const handleWelcomeClose = () => {
    setShowWelcomeMessage(false);
  };

  // Handle navigate to chat from welcome
  const handleWelcomeNavigateToChat = () => {
    setShowWelcomeMessage(false);
  };

    // Guard: Show loading while checking consent
  if (consentLoading) {
    return <ErrorBoundary><LoadingScreen /></ErrorBoundary>;
  }

  // Show consent modal if user hasn't accepted terms and privacy
  if (showConsentModal) {
    return (
      <ErrorBoundary>
        <ConsentModal
          userId={authState.authUserId}
          token={authState.token}
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

  // Show chat with optional onboarding modal and welcome message
  if (isChat) {
    const shouldShowModal = !authState.isTemporaryAccount && onboarding.onboardingStatus?.isOnboarding === true;
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

        {showWelcomeMessage && (
          <WelcomeMessage
            userId={authState.authUserId}
            onClose={handleWelcomeClose}
            onNavigateToChat={handleWelcomeNavigateToChat}
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

