import React, { useEffect, useState } from "react";
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

import { VerificationScreen } from "./screens/VerificationScreen";
import { auth } from "./firebase";
import MainContainer from "./layouts/MainContainer";

/**
 * Main App Component - With Auto-Navigation After Login
 */
function App() {
    useTokenRefresh();

    const authState = useAuth();
    const chat = useChat(authState.authUserId, authState.token, authState.isAuthenticated, authState.authUserId);
    const personalInfo = usePersonalInfo(authState.authUserId, authState.token);
    const modals = useModalState();
    const tempFlow = useTempAccountFlow(authState);
    const handlers = useAuthHandlers(authState, modals, tempFlow);
    const { isLoading, isThankyou, isRegister, isVerification, isLanding, isLogin, isChat } = useAppRouting(authState, tempFlow.appExited, modals.showRegisterMode);
    const emailVerification = useEmailVerification();
    
    const [verificationFailed, setVerificationFailed] = useState(false);
    const [previousAuthState, setPreviousAuthState] = useState(null);

    // Auto-close register mode when user successfully authenticates
    useEffect(() => {
        if (authState.isAuthenticated && previousAuthState !== authState.isAuthenticated) {
            console.log('[AUTO-NAV] User authenticated, closing register mode');
            modals.setShowRegisterMode(false);
        }
        setPreviousAuthState(authState.isAuthenticated);
    }, [authState.isAuthenticated, previousAuthState, modals]);

    // Start email verification polling when on verification screen
    useEffect(() => {
        if (isVerification && auth.currentUser) {
            console.log('[VERIFICATION] Starting verification polling for:', auth.currentUser.email);
            emailVerification.startVerificationPolling(auth.currentUser);
        }
    }, [isVerification, emailVerification]);

    // Handle verification failure
    const handleVerificationFailed = () => {
        console.log('[EMAIL-VERIFY] Verification failed - three strikes');
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
        console.log('[AUTH] Signing out from verification screen');
        await authState.handleLogout();
    };

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
                    onTryFree={handlers.handleTryFree}
                    onCreateAccount={handlers.handleCreateAccount}
                    onSignIn={handlers.handleSignIn}
                />
            </ErrorBoundary>
        );
    }

    // Login page
    if (isLogin) {
        return <ErrorBoundary><LoginScreenWrapper /></ErrorBoundary>;
    }

    // Chat screen
    if (isChat) {
    return (
        <ErrorBoundary>
            <MainContainer 
                auth={authState}
                token={authState.token}
                userId={authState.authUserId}
            />
        </ErrorBoundary>
    );
}

    return null;
}

export default App;
