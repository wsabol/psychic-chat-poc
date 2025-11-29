import React from "react";
import { useAuth } from "./hooks/useAuth";
import { useChat } from "./hooks/useChat";
import { useTokenRefresh } from "./hooks/useTokenRefresh";
import { usePersonalInfo } from "./hooks/usePersonalInfo";
import { useModalState } from "./hooks/useModalState";
import { useTempAccountFlow } from "./hooks/useTempAccountFlow";
import { useAuthHandlers } from "./hooks/useAuthHandlers";
import { useAppRouting } from "./hooks/useAppRouting";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { LoadingScreen } from "./screens/LoadingScreen";
import { ThankYouScreen } from "./screens/ThankYouScreen";
import { LandingScreenWrapper } from "./screens/LandingScreenWrapper";
import { LoginScreenWrapper } from "./screens/LoginScreenWrapper";
import { ChatScreen } from "./screens/ChatScreen";

/**
 * Main App Component - Modularized
 * Coordinates routing, state, and handlers
 * ~50 lines instead of 900+
 */
function App() {
    useTokenRefresh();

    const auth = useAuth();
    const chat = useChat(auth.authUserId, auth.token, auth.isAuthenticated, auth.authUserId);
    const personalInfo = usePersonalInfo(auth.authUserId, auth.token);
    const modals = useModalState();
    const tempFlow = useTempAccountFlow(auth);
    const handlers = useAuthHandlers(auth, modals, tempFlow);
    const { isLoading, isThankyou, isRegister, isLanding, isLogin, isChat } = useAppRouting(auth, tempFlow.appExited);

    // Loading
    if (isLoading) {
        return <ErrorBoundary><LoadingScreen /></ErrorBoundary>;
    }

    // Thank you screen (after exit)
    if (isThankyou) {
        return (
            <ErrorBoundary>
                <ThankYouScreen
                    onCreateAccount={() => {
                        tempFlow.setAppExited(false);
                        modals.setShowRegisterMode(true);
                    }}
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

    // Chat screen (authenticated)
    if (isChat) {
        return (
            <ErrorBoundary>
                <ChatScreen
                    auth={auth}
                    chat={chat}
                    personalInfo={personalInfo}
                    modals={modals}
                    handlers={handlers}
                    tempFlow={tempFlow}
                />
            </ErrorBoundary>
        );
    }

    return null;
}

export default App;
