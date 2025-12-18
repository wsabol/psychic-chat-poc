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
import { VerificationScreen } from "./screens/VerificationScreen";
import TwoFAScreen from "./screens/TwoFAScreen";
import { auth } from "./firebase";
import MainContainer from "./layouts/MainContainer";

/**
 * Main App Component - With Auto-Navigation After Login
 * 
 * Authentication Flow:
 * Landing/Login → 2FA → Email Verification → Payment Method Setup → Subscription → Chat
 * 
 * Temp accounts skip payment method and subscription checks (trial only)
 */
function App() {
    useTokenRefresh();
    const [skipPaymentCheck, setSkipPaymentCheck] = useState(false);
    const [skipSubscriptionCheck, setSkipSubscriptionCheck] = useState(false);
    const [startingPage, setStartingPage] = useState(0); // 0=chat, 7=billing

    const authState = useAuth();
    const modals = useModalState();
    const tempFlow = useTempAccountFlow(authState);
    const handlers = useAuthHandlers(authState, modals, tempFlow);
    const { isLoading, isThankyou, isRegister, isVerification, isLanding, isLogin, isTwoFactor, isPaymentMethodRequired, isSubscriptionRequired, isChat } = useAppRouting(authState, tempFlow.appExited, modals.showRegisterMode, skipPaymentCheck, skipSubscriptionCheck);
    const emailVerification = useEmailVerification();
    
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
                () => authState.refreshEmailVerificationStatus()
            );
        }
    }, [isVerification, emailVerification, authState]);

    // ✅ NEW: When subscription becomes active, reset skip flag AND return to chat page
    useEffect(() => {
        if (authState.hasActiveSubscription && skipSubscriptionCheck) {
            setSkipSubscriptionCheck(false);
            setStartingPage(0); // Return to chat page (index 0)
        }
    }, [authState.hasActiveSubscription, skipSubscriptionCheck]);

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
        setSkipSubscriptionCheck(true); // Allow to skip subscription check to reach billing page
        setStartingPage(7); // Billing page is index 7
    }, []);

    // When user tries to navigate away from billing page
    // Re-check ONLY subscription (not payment method, since user just added it)
    const handleNavigateFromBilling = useCallback(async () => {
        // Don't reset payment check - user just added it so it's valid
        // Only re-check subscription status
        setSkipPaymentCheck(true); // Keep skipping payment check since it's now valid
        setSkipSubscriptionCheck(false); // Re-enable subscription check
        
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

    // Payment method required - user must add payment method first
    if (isPaymentMethodRequired) {
        return (
            <ErrorBoundary>
                <PaymentMethodRequiredModal 
                    onNavigateToBilling={handleNavigateToBilling}
                />
            </ErrorBoundary>
        );
    }

    // Subscription required - user needs to subscribe
    if (isSubscriptionRequired) {
        return (
            <ErrorBoundary>
                <SubscriptionRequiredModal 
                    onNavigateToSubscriptions={handleNavigateToSubscriptions}
                />
            </ErrorBoundary>
        );
    }

    // Chat screen - user is fully authenticated and authorized
    if (isChat) {
        return (
            <ErrorBoundary>
                <MainContainer 
                    auth={authState}
                    token={authState.token}
                    userId={authState.authUserId}
                    onLogout={authState.handleLogout}
                    onExit={() => {
                        tempFlow.setAppExited(true);
                    }}
                    startingPage={startingPage}
                    onNavigateFromBilling={handleNavigateFromBilling}
                />
            </ErrorBoundary>
        );
    }

    return null;
}

export default App;
