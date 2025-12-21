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

function App() {
    useTokenRefresh();
    const [skipPaymentCheck, setSkipPaymentCheck] = useState(false);
    const [skipSubscriptionCheck, setSkipSubscriptionCheck] = useState(false);
    const [startingPage, setStartingPage] = useState(0);
    const [billingTab, setBillingTab] = useState('payment-methods');
    const [onboardingClosed, setOnboardingClosed] = useState(false);

    const authState = useAuth();
    const modals = useModalState();
    const tempFlow = useTempAccountFlow(authState);
    const handlers = useAuthHandlers(authState, modals, tempFlow);
    const { isLoading, isThankyou, isRegister, isVerification, isLanding, isLogin, isTwoFactor, isPaymentMethodRequired, isSubscriptionRequired, isChat } = useAppRouting(authState, tempFlow.appExited, modals.showRegisterMode, skipPaymentCheck, skipSubscriptionCheck);
    const emailVerification = useEmailVerification();
    const onboarding = useOnboarding(authState.token);
    
    const [verificationFailed, setVerificationFailed] = useState(false);
    const [previousAuthState, setPreviousAuthState] = useState(null);

    useEffect(() => {
        if (authState.isAuthenticated && previousAuthState !== authState.isAuthenticated) {
            modals.setShowRegisterMode(false);
        }
        setPreviousAuthState(authState.isAuthenticated);
    }, [authState.isAuthenticated, previousAuthState, modals]);

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

    useEffect(() => {
        if (authState.emailVerified && !authState.isTemporaryAccount && onboarding.onboardingStatus?.isOnboarding) {
            console.log('[ONBOARDING] Auto-navigating new user to payment methods');
            setSkipPaymentCheck(true);
            setSkipSubscriptionCheck(true);
            setStartingPage(7);
        }
    }, [authState.emailVerified, authState.isTemporaryAccount, onboarding.onboardingStatus?.isOnboarding]);

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

    // FIX: Mark onboarding as complete when user closes the modal
    const handleOnboardingClose = useCallback(async () => {
        console.log('[ONBOARDING] Closing modal - marking onboarding as complete');
        try {
            // Mark subscription step as complete (all required steps done)
            // Existing logic ensures payment method and subscription exist
            if (onboarding.updateOnboardingStep) {
                await onboarding.updateOnboardingStep('subscription');
            }
        } catch (err) {
            console.warn('[ONBOARDING] Failed to mark onboarding complete on close:', err);
        } finally {
            setOnboardingClosed(true);
        }
    }, [onboarding]);

    if (isLoading) {
        return <ErrorBoundary><LoadingScreen /></ErrorBoundary>;
    }

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

    const isUserOnboarding = onboarding.onboardingStatus?.isOnboarding === true;
    
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

    if (isChat) {
        return (
            <ErrorBoundary>
                {onboarding.onboardingStatus?.isOnboarding && !onboardingClosed && (
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
