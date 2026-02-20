import { useCallback } from 'react';
import { useDeviceTracking } from './useDeviceTracking';
import { logErrorFromCatch } from '../shared/errorLogger.js';

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
            logErrorFromCatch('Failed to create temporary account:', err);
        }
    }, [auth, canTryFree, setShowRegisterMode]);

    const handleCreateAccount = useCallback(() => {
        setShowRegisterMode(true);
    }, [setShowRegisterMode]);

    const handleSignIn = useCallback(() => {
        // Set hasLoggedOut=true so the router transitions to the login screen.
        // Without this the landing page just re-renders itself (routing stays on 'landing').
        auth.setHasLoggedOut(true);
    }, [auth]);

    const handleSetupAccount = useCallback(async (onboardingData) => {
        setShowFinalModal(false);
        
        // Register pending migration so backend knows to expect this temp user's data
        if (auth.authUserId) {
            try {
                const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';
                await fetch(`${API_URL}/migration/register-migration`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        tempUserId: auth.authUserId,
                        email: '' // Email will be provided during registration
                    })
                });
                
            } catch (err) {
            }
        }
        
        // Show Firebase login/register page
        setShowRegisterMode(true);
    }, [auth, setShowFinalModal, setShowRegisterMode]);

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

    const handleAstrologyPromptNo = useCallback(async () => {
        setShowAstrologyPrompt(false);
        
        try {
            // Delete temp account from Firebase and database
            const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';
            const deleteUrl = `${API_URL}/cleanup/delete-temp-account/${auth.authUserId}`;
            await fetch(deleteUrl, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${auth.token}` }
            });
            
        } catch (err) {
            logErrorFromCatch('[ONBOARDING] Error deleting temp account:', err);
        }
        
        // Reset hasLoggedOut flag and route to landing page
        auth.setHasLoggedOut(false);
        // Sign out from Firebase
        await auth.handleLogout();
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

