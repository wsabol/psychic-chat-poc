import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "./hooks/useAuth";
import { useTokenRefresh } from "./hooks/useTokenRefresh";
import { useModalState } from "./hooks/useModalState";
import { useTempAccountFlow } from "./hooks/useTempAccountFlow";
import { useAuthHandlers } from "./hooks/useAuthHandlers";
import { useAppRouting } from "./hooks/useAppRouting";
import { useEmailVerification } from "./hooks/useEmailVerification";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { LoadingScreen } from "./screens/LoadingScreen";
import { ThankYouScreen } from "./screens/ThankYouScreen";
import { LandingScreenWrapper } from "./screens/LandingScreenWrapper";
import { LoginScreenWrapper } from "./screens/LoginScreenWrapper";
import PaymentMethodRequiredModal from "./components/PaymentMethodRequiredModal";
import SubscriptionRequiredModal from "./components/SubscriptionRequiredModal";
import OnboardingModal from "./components/OnboardingModal";
import { VerificationScreen } from "./screens/VerificationScreen";
import TwoFAScreen from "./screens/TwoFAScreen";
import { auth } from "./firebase";
import MainContainer from "./layouts/MainContainer";
import { useOnboarding } from "./hooks/useOnboarding";

/**
 * Main App Component - With Auto-Navigation & Onboarding
 * 
 * Authentication Flow:
 * Landing/Login → 2FA → Email Verification → Onboarding (Payment Method → Subscription) → Chat
 * 
 * Onboarding Flow (New Users):
 * 1. Create Account (done)
 * 2. Add Payment Method (required)
 * 3. Purchase Subscription (required)
 * 4. Get Acquainted - Personal Info (optional)
 * 5. Check Security Settings (optional)
 * 
 * Temp accounts skip payment method and subscription checks (trial only)
 */
function App() {
    useTokenRefresh();
    const [skipPaymentCheck, setSkipPaymentCheck] = useState(false);
    const [skipSubscriptionCheck, setSkipSubscriptionCheck] = useState(false);
    const [startingPage, setStartingPage] = useState(0); // 0=chat, 7=billing
    const [billingTab, setBillingTab] = useState('payment-methods'); // which billing tab to show

    const authState = useAuth();
    const modals = useModalState();
    const tempFlow = useTempAccountFlow(authState);
    const handlers = useAuthHandlers(authState, modals, tempFlow);
    const { isLoading, isThankyou, isRegister, isVerification, isLanding, isLogin, isTwoFactor, isPaymentMethodRequired, isSubscriptionRequired, isChat } = useAppRouting(authState, tempFlow.appExited, modals.showRegisterMode, skipPaymentCheck, skipSubscriptionCheck);
    const emailVerification = useEmailVerification();
    const onboarding = useOnboarding(authState.token);
    
    const [verificationFailed, setVerificationFailed] = useState(false);
    const [previousAuthState, setPreviousAuthState] = useState(null);

    // Auto-close register mode when user successfully authenticates
    useEffect(() => {
        if (authState.isAuthenticated && previousAuthState !== authState.isAuthenticated) {
            modals.setShowRegisterMode(false);
        }
        setPreviousAuthState(authState.isAuthenticated);
    }, [authState.isAuthenticated, previousAuthState, modals]);

    // Start email verification polling when on verification screen
    useEffect(() => {
        if (isVerification && auth.currentUser) {
            emailVerification.startVerificationPolling(
                auth.currentUser,
                40,
                // ✅ Update authState.emailVerified when verification completes
                () => {
                    authState.setEmailVerified(true);
                    authState.refreshEmailVerificationStatus();
                }
            );
        }
    }, [isVerification, emailVerification, authState]);

    // ✅ Auto-navigate to payment methods after email verification for new users (onboarding)
    useEffect(() => {
        if (authState.emailVerified && !authState.isTemporaryAccount && onboarding.onboardingStatus?.isOnboarding) {
            // Auto-navigate to billing payment methods page for new users
            console.log('[ONBOARDING] Auto-navigating new user to payment methods');
            setSkipPaymentCheck(true);
            setSkipSubscriptionCheck(true);
            setStartingPage(7); // Billing page
        }
    }, [authState.emailVerified, authState.isTemporaryAccount, onboarding.onboardingStatus?.isOnboarding]);

    // ✅ When subscription becomes active, update onboarding and return to chat
    useEffect(() => {
        if (authState.hasActiveSubscription && skipSubscriptionCheck) {
            setSkipSubscriptionCheck(false);
            setStartingPage(0); // Return to chat page (index 0)
            // Update onboarding status to subscription complete
            if (onboarding.updateOnboardingStep) {
                onboarding.updateOnboardingStep('subscription').catch(err => {
                    console.warn('[ONBOARDING] Failed to update subscription step:', err);
                });
            }
        }
    }, [authState.hasActiveSubscription, skipSubscriptionCheck, onboarding]);

    // Handle verification failure
    const handleVerificationFailed = () => {
        setVerificationFailed(true);
        tempFlow.setAppExited(true);
    };

    const handleResendEmail = async () => {
        if (auth.currentUser) {
            return await emailVerification.resendVerificationEmail(auth.currentUser);
        }
        return false;
    };

    const handleSignOutFromVerification = async () => {
        await authState.handleLogout();
    };

    // Modal callbacks - allow user to go to billing to add payment method
    const handleNavigateToBilling = useCallback(() => {
        setSkipPaymentCheck(true);
        setSkipSubscriptionCheck(true);
        setStartingPage(7); // Billing page is index 7
    }, []);

    // When user tries to navigate away from billing page
    const handleNavigateFromBilling = useCallback(async () => {
        setSkipPaymentCheck(true);
        setSkipSubscriptionCheck(false);
        
        // Re-check subscription only
        if (authState.token && authState.authUserId) {
            await authState.recheckSubscriptionOnly(authState.token, authState.authUserId);
        }
    }, [authState]);

    // Modal callbacks - allow user to go to billing to subscribe
    const handleNavigateToSubscriptions = useCallback(() => {
        setSkipSubscriptionCheck(true);
        setStartingPage(7); // Billing page is index 7
    }, []);

    // Handle onboarding step navigation
    const handleOnboardingNavigate = useCallback((step) => {
        console.log('[ONBOARDING] Navigating to step:', step);
        console.log('[ONBOARDING] Step value:', JSON.stringify(step), 'length:', step?.length);
        console.log('[ONBOARDING] Checking cases:');
        console.log('  payment_method?', step === 'payment_method');
        console.log('  subscription?', step === 'subscription');
        console.log('  personal_info?', step === 'personal_info');
        switch(step) {
            case 'payment_method':
                setSkipPaymentCheck(true);
                setSkipSubscriptionCheck(true);
                setStartingPage(7); // Go to billing
                break;
            case 'subscription':
                console.log('[ONBOARDING] Setting state for subscription tab');
                setSkipPaymentCheck(true);
                setSkipSubscriptionCheck(true);
                setBillingTab('subscriptions');
                console.log('[ONBOARDING] Set billingTab to subscriptions');
                setStartingPage(7);
                console.log('[ONBOARDING] Set startingPage to 7 (billing)');
                break;
            case 'personal_info':
                setStartingPage(1); // Personal info page (index 1)
                break;
            case 'security_settings':
                setStartingPage(6); // Security page (index 6)
                break;
            default:
                break;
        }
    }, []);

    // Handle onboarding close - mark as complete and go to chat
    const handleOnboardingClose = useCallback(async () => {
        console.log('[ONBOARDING] Closing onboarding, marking as complete');
        try {
            await onboarding.updateOnboardingStep('security_settings');
        } catch (err) {
            console.warn('[ONBOARDING] Error marking complete:', err);
        }
        setStartingPage(0); // Go to chat page
    }, [onboarding]);

    // Loading
    if (isLoading) {
        return <ErrorBoundary><LoadingScreen /></ErrorBoundary>;
    }

    // Thank you screen
    if (isThankyou || verificationFailed) {
        return (
            <ErrorBoundary>
                <ThankYouScreen
                    onCreateAccount={() => {
                        tempFlow.setAppExited(false);
                        setVerificationFailed(false);
                        modals.setShowRegisterMode(true);
                    }}
                    onContinue={() => {
                        tempFlow.setAppExited(false);
                        setVerificationFailed(false);
                    }}
                    onExit={() => {
                        authState.exitApp();
                    }}
                />
            </ErrorBoundary>
        );
    }

    // Email verification screen
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

    // Register mode
    if (isRegister) {
        return <ErrorBoundary><LoginScreenWrapper /></ErrorBoundary>;
    }

    // Landing page
    if (isLanding) {
        return (
            <ErrorBoundary>
                <LandingScreenWrapper
                    onTryFree={() => {
                        authState.setHasLoggedOut(false);
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

    // Login page
    if (isLogin) {
        return <ErrorBoundary><LoginScreenWrapper /></ErrorBoundary>;
    }

    // 2FA verification screen
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

    // ✅ PRIORITIZE ONBOARDING: Skip blocking modals if user is in onboarding
    const isUserOnboarding = onboarding.onboardingStatus?.isOnboarding === true;
    
    // Payment method required - ONLY show for established users (not during onboarding)
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

    // Subscription required - ONLY show for established users (not during onboarding)
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

    // Chat screen - user is fully authenticated and authorized
    if (isChat) {
        return (
            <ErrorBoundary>
                {/* Show OnboardingModal only if user is still onboarding */}
                {onboarding.onboardingStatus && (
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

export default App;
