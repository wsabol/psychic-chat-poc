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

    const handleSetupAccount = useCallback(async (onboardingData) => {
        console.log('[ONBOARDING] User clicked "Setup Account"');
        setShowFinalModal(false);
        
        // Register pending migration so backend knows to expect this temp user's data
        if (auth.authUserId) {
            try {
                const migrationRes = await fetch('http://localhost:3000/migration/register-migration', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        tempUserId: auth.authUserId,
                        email: '' // Email will be provided during registration
                    })
                });
                
                if (migrationRes.ok) {
                    console.log('[ONBOARDING] ✓ Migration registered');
                }
            } catch (err) {
                console.warn('[ONBOARDING] Migration registration failed:', err);
            }
        }
        
        // Show Firebase login/register page
        setShowRegisterMode(true);
    }, [auth, setShowFinalModal, setShowRegisterMode]);

    const handleExit = useCallback(async () => {
        console.log('[ONBOARDING] User clicked "Exit" from OnboardingModal');
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
        console.log('[ONBOARDING] User declined astrology - exiting to landing page');
        setShowAstrologyPrompt(false);
        
        try {
            // Delete temp account from Firebase and database
            const deleteUrl = `http://localhost:3000/cleanup/delete-temp-account/${auth.authUserId}`;
            const response = await fetch(deleteUrl, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${auth.token}` }
            });
            
            if (response.ok) {
                console.log('[ONBOARDING] ✓ Temp account deleted');
            } else {
                console.warn('[ONBOARDING] ✗ Temp account deletion failed');
            }
        } catch (err) {
            console.error('[ONBOARDING] Error deleting temp account:', err);
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
