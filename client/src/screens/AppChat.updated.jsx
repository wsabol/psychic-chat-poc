import React, { useEffect } from 'react';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { LoadingScreen } from './LoadingScreen';
import PaymentMethodRequiredModal from '../components/PaymentMethodRequiredModal';
import SubscriptionRequiredModal from '../components/SubscriptionRequiredModal';
import OnboardingModal from '../components/OnboardingModal';
import MainContainer from '../layouts/MainContainer';
import { useLanguagePreference } from '../hooks/useLanguagePreference';
import { initializeAnalytics, trackPageView } from '../utils/analyticsTracker';

/**
 * AppChat - Handles authenticated chat flow
 * Shows:
 * - Payment required modal (if needed)
 * - Subscription required modal (if needed)
 * - Onboarding modal (if new user)
 * - Main chat container
 * 
 * TIMEZONE: Saves user's browser timezone on first authenticated load
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

  // Fetch user's language preference from DB when authenticated
  useLanguagePreference();

  // Initialize analytics on first load
  useEffect(() => {
    initializeAnalytics();
    trackPageView('app-initialized');
  }, []);

  // Detect and save user's timezone on authenticated app load
  useEffect(() => {
    const saveUserTimezone = async () => {
      try {
        // Get user's browser timezone (e.g., "America/Chicago")
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const userId = authState?.authUserId;
        
        console.log('[TIMEZONE] Detected:', timezone, 'User ID:', userId);
        
        if (userId) {
          console.log('[TIMEZONE] Saving timezone to server...');
          const response = await fetch('/auth/preferences/timezone', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              userId: userId,
              timezone: timezone
            })
          });
          
          if (response.ok) {
            const data = await response.json();
            console.log('[TIMEZONE] ✓ Saved user timezone:', data.timezone);
          } else {
            console.warn('[TIMEZONE] ✗ Failed to save timezone:', response.statusText);
          }
        }
      } catch (err) {
        console.error('[TIMEZONE] Error:', err);
      }
    };
    
    // Only run when user is authenticated and isChat is true (fully loaded)
    if (isChat && authState?.authUserId) {
      saveUserTimezone();
    }
  }, [isChat, authState?.authUserId]);

  const isUserOnboarding = onboarding.onboardingStatus?.isOnboarding === true;

  // Force re-render when onboarding status changes
  useEffect(() => {
    console.log('[APPCHAT] Onboarding status updated:', isUserOnboarding);
  }, [isUserOnboarding]);

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
