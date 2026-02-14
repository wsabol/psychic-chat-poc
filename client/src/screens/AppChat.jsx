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
import { useFreeTrial } from '../hooks/useFreeTrial';

/**
 * AppChat - Handles authenticated chat flow
 * Shows:
 * - Consent modal (if user hasn't accepted terms AND privacy)
 * - Payment required modal (if needed)
 * - Subscription required modal (if needed)
 * - Onboarding modal (if new user)
 * - Welcome message (after personal info completed)
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
  const [welcomeShownOnce, setWelcomeShownOnce] = useState(false);
  
  // Initialize free trial tracking for temp users (creates session on mount)
  const freeTrialState = useFreeTrial(authState.isTemporaryAccount, authState.authUserId);

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
        
        // Show modal ONLY if user hasn't accepted both terms and privacy
        // Note: data.hasConsent already checks if terms_accepted AND privacy_accepted are true
        // Users who accepted before refactoring will have hasConsent=true even with outdated versions
        // The needsUpdate flag is informational but shouldn't block access
        const needsConsent = !data.hasConsent;
        setShowConsentModal(needsConsent);
      } catch (err) {
        // On network error or API failure: 
        // Don't show consent modal - let them through to avoid blocking legitimate users
        // If they truly haven't consented, they'll be caught on next successful API call
        // This prevents showing consent modal when database is cleared/API is down
        setShowConsentModal(false);
      } finally {
        setConsentLoading(false);
      }
    };
    
    if (!authState.isTemporaryAccount) {
      fetchConsentStatus();
    }
  }, [user, authState.isTemporaryAccount, authState.userProfileLoaded]);

  // Fetch user's language preference from DB when authenticated
  useLanguagePreference();

  // Initialize analytics on first load
  useEffect(() => {
    initializeAnalytics();
    trackPageView('app-initialized');
  }, []);

  const isUserOnboarding = onboarding.onboardingStatus?.isOnboarding === true;

  // CRITICAL: Show Welcome message AUTOMATICALLY after personal_info is completed
  // NOT based on step, but on completedSteps.personal_info
  // This allows automatic navigation to chat with welcome modal after saving personal info
  useEffect(() => {
    const isFreeTrial = authState.isTemporaryAccount;
    const isPersonalInfoCompleted = onboarding.onboardingStatus?.completedSteps?.personal_info === true;
    const isStillOnboarding = onboarding.onboardingStatus?.isOnboarding === true;
    
    // Show welcome automatically after personal_info is completed, only once per session
    if (!isFreeTrial && isPersonalInfoCompleted && isStillOnboarding && !welcomeShownOnce) {
      setShowWelcomeMessage(true);
      setWelcomeShownOnce(true); // Mark that we've shown it
    }
  }, [onboarding.onboardingStatus?.completedSteps?.personal_info, onboarding.onboardingStatus?.isOnboarding, authState.isTemporaryAccount, welcomeShownOnce]);

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

  // Guard: Block temp users if they've already completed free trial
  if (authState.isTemporaryAccount && freeTrialState.isCompleted && freeTrialState.error) {
    return (
      <ErrorBoundary>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          padding: '2rem',
          textAlign: 'center'
        }}>
          <h2>🔮 Free Trial Already Completed</h2>
          <p style={{ marginTop: '1rem', marginBottom: '2rem' }}>
            {freeTrialState.error}
          </p>
          <p style={{ marginBottom: '2rem' }}>
            Please create an account to continue using Starship Psychics.
          </p>
          <button
            onClick={() => {
              // Log out the temp user
              authState.handleLogout();
              // Force navigation to register screen
              setTimeout(() => {
                window.location.href = '/?register=true';
              }, 100);
            }}
            style={{
              padding: '1rem 2rem',
              fontSize: '1.1rem',
              backgroundColor: '#6366f1',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            Create Account
          </button>
        </div>
      </ErrorBoundary>
    );
  }

  // Guard: Show loading while checking consent or free trial
  if (consentLoading || (authState.isTemporaryAccount && freeTrialState.loading)) {
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
  // SKIP for temporary accounts - they don't have onboarding data
  if (authState.isAuthenticated && !authState.isTemporaryAccount && onboarding.onboardingStatus === null) {
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

        {showWelcomeMessage && !authState.isTemporaryAccount && (
          <WelcomeMessage
            userId={authState.authUserId}
            token={authState.token}
            onClose={handleWelcomeClose}
            onNavigateToChat={handleWelcomeNavigateToChat}
            onOnboardingComplete={async () => {
              const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';
              try {
                await fetch(`${API_URL}/billing/onboarding-step/welcome`, {
                  method: 'POST',
                  headers: { 'Authorization': `Bearer ${authState.token}` }
                });
                await onboarding.fetchOnboardingStatus();
              } catch (err) {
                // Error completing welcome step
              }
            }}
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
          freeTrialState={freeTrialState}
        />
      </ErrorBoundary>
    );
  }

  return null;
}
