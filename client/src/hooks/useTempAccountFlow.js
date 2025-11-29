import { useState, useCallback } from 'react';

/**
 * Manages temp account lifecycle: creation, exit, greeting
 */
export function useTempAccountFlow(auth) {
    const [greetingShown, setGreetingShown] = useState(false);
    const [firstResponseReceived, setFirstResponseReceived] = useState(false);
    const [appExited, setAppExited] = useState(false);

    const handleExit = useCallback(async (setShowFinalModal, setDeviceTracking) => {
        setShowFinalModal(false);
        await auth.deleteTemporaryAccount();
        setDeviceTracking(true); // Mark device as exited
        setAppExited(true);
    }, [auth]);

    const handleAstrologyPromptYes = useCallback((setShowAstrologyPrompt, setShowPersonalInfoModal) => {
        setShowAstrologyPrompt(false);
        setShowPersonalInfoModal(true);
    }, []);

    const handleAstrologyPromptNo = useCallback((setShowAstrologyPrompt) => {
        setShowAstrologyPrompt(false);
        auth.exitApp();
    }, [auth]);

    return {
        greetingShown,
        setGreetingShown,
        firstResponseReceived,
        setFirstResponseReceived,
        appExited,
        setAppExited,
        handleExit,
        handleAstrologyPromptYes,
        handleAstrologyPromptNo,
    };
}
