import { useCallback } from 'react';
import { useDeviceTracking } from './useDeviceTracking';

/**
 * All authentication and navigation handlers
 * Separated from component logic for reusability
 */
export function useAuthHandlers(auth, modals, tempFlow) {
    const { canTryFree, markAsExited } = useDeviceTracking();
    const {
        setShowRegisterMode,
        setShowPersonalInfoModal,
        setShowFinalModal,
        setShowAstrologyPrompt,
    } = modals;

    const handleTryFree = useCallback(async () => {
        if (!canTryFree()) {
            alert('Free trial already used. Please create an account.');
            setShowRegisterMode(true);
            return;
        }
        try {
            await auth.createTemporaryAccount();
        } catch (err) {
            console.error('Failed to create temporary account:', err);
        }
    }, [auth, canTryFree, setShowRegisterMode]);

    const handleCreateAccount = useCallback(() => {
        setShowRegisterMode(true);
    }, [setShowRegisterMode]);

    const handleSignIn = useCallback(() => {
        // Navigation to login handled by routing
    }, []);

    const handleSetupAccount = useCallback(() => {
        setShowFinalModal(false);
        setShowRegisterMode(true);
    }, [setShowFinalModal, setShowRegisterMode]);

    const handleExit = useCallback(async () => {
        setShowFinalModal(false);
        await auth.deleteTemporaryAccount();
        markAsExited();
        tempFlow.setAppExited(true);
    }, [auth, setShowFinalModal, markAsExited, tempFlow]);

    const handlePersonalInfoClose = useCallback(() => {
        setShowPersonalInfoModal(false);
    }, [setShowPersonalInfoModal]);

    const handleReset = useCallback(() => {
        if (window.confirm('Reset app for testing? This will clear all data and sign you out.')) {
            localStorage.clear();
            window.location.reload();
        }
    }, []);

    const handleAstrologyPromptYes = useCallback(() => {
        setShowAstrologyPrompt(false);
        setShowPersonalInfoModal(true);
    }, [setShowAstrologyPrompt, setShowPersonalInfoModal]);

    const handleAstrologyPromptNo = useCallback(() => {
        setShowAstrologyPrompt(false);
        auth.exitApp();
    }, [auth, setShowAstrologyPrompt]);

    return {
        handleTryFree,
        handleCreateAccount,
        handleSignIn,
        handleSetupAccount,
        handleExit,
        handlePersonalInfoClose,
        handleReset,
        handleAstrologyPromptYes,
        handleAstrologyPromptNo,
    };
}
