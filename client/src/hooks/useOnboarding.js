import { useState, useEffect, useCallback } from 'react';

const ORACLE_RESPONSE_TIMEOUT = 60000; // 60 seconds

/**
 * useOnboarding - Manages all onboarding state and logic
 */
export function useOnboarding(auth, apiUrl, isTemporaryAccount) {
  const [firstResponseReceived, setFirstResponseReceived] = useState(false);
  const [timerActive, setTimerActive] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(60);
  
  const [showAstrologyPrompt, setShowAstrologyPrompt] = useState(false);
  const [showPersonalInfoModal, setShowPersonalInfoModal] = useState(false);
  const [showHoroscopePage, setShowHoroscopePage] = useState(false);
  const [showFinalModal, setShowFinalModal] = useState(false);
  const [isOnboardingFlow, setIsOnboardingFlow] = useState(false);
  
  const [onboardingFirstMessage, setOnboardingFirstMessage] = useState(null);
  const [onboardingHoroscope, setOnboardingHoroscope] = useState(null);

  // Capture first oracle response
  const captureFirstMessage = useCallback((firstOracleMessage) => {
    setOnboardingFirstMessage({
      content: firstOracleMessage.content,
      timestamp: new Date().toISOString()
    });
    
    try {
      sessionStorage.setItem('onboarding_first_message', JSON.stringify({
        content: firstOracleMessage.content,
        timestamp: new Date().toISOString()
      }));
    } catch (e) {
      console.warn('Could not save to sessionStorage:', e);
    }
  }, []);

  // Start countdown timer for onboarding
  const startCountdown = useCallback(() => {
    setTimerActive(true);
    setTimeRemaining(60);
    
    setTimeout(() => {
      setTimerActive(false);
      setShowAstrologyPrompt(true);
    }, ORACLE_RESPONSE_TIMEOUT);
  }, []);

  // Countdown timer effect
  useEffect(() => {
    if (!timerActive) return;

    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          setTimerActive(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timerActive]);

  // Capture horoscope data
  useEffect(() => {
    if (isTemporaryAccount && isOnboardingFlow) {
      const horoscopeMsg = sessionStorage.getItem('onboarding_horoscope');
      if (horoscopeMsg && !onboardingHoroscope) {
        try {
          setOnboardingHoroscope(JSON.parse(horoscopeMsg));
        } catch (e) {
          console.warn('Could not parse horoscope:', e);
        }
      }
    }
  }, [isTemporaryAccount, isOnboardingFlow, onboardingHoroscope]);

  // Check if input should be disabled during onboarding
  const inputDisabled = isTemporaryAccount && firstResponseReceived;

  return {
    // State
    firstResponseReceived,
    setFirstResponseReceived,
    timerActive,
    setTimerActive,
    timeRemaining,
    setTimeRemaining,
    showAstrologyPrompt,
    setShowAstrologyPrompt,
    showPersonalInfoModal,
    setShowPersonalInfoModal,
    showHoroscopePage,
    setShowHoroscopePage,
    showFinalModal,
    setShowFinalModal,
    isOnboardingFlow,
    setIsOnboardingFlow,
    onboardingFirstMessage,
    onboardingHoroscope,
    
    // Helpers
    captureFirstMessage,
    startCountdown,
    inputDisabled
  };
}
