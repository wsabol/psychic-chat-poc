import { useState } from 'react';

/**
 * Centralized modal state management
 * Returns object with all modal states and setters
 */
export function useModalState() {
    const [menuOpen, setMenuOpen] = useState(false);
    const [showPersonalInfoModal, setShowPersonalInfoModal] = useState(false);
    const [showMySignModal, setShowMySignModal] = useState(false);
    const [showMoonPhaseModal, setShowMoonPhaseModal] = useState(false);
    const [showHoroscopeModal, setShowHoroscopeModal] = useState(false);
    const [showCosmicWeatherModal, setShowCosmicWeatherModal] = useState(false);
    const [showSecurityModal, setShowSecurityModal] = useState(false);
    const [showAstrologyPrompt, setShowAstrologyPrompt] = useState(false);
    const [showFinalModal, setShowFinalModal] = useState(false);
    const [showRegisterMode, setShowRegisterMode] = useState(false);

    return {
        menuOpen,
        setMenuOpen,
        showPersonalInfoModal,
        setShowPersonalInfoModal,
        showMySignModal,
        setShowMySignModal,
        showMoonPhaseModal,
        setShowMoonPhaseModal,
        showHoroscopeModal,
        setShowHoroscopeModal,
        showCosmicWeatherModal,
        setShowCosmicWeatherModal,
        showSecurityModal,
        setShowSecurityModal,
        showAstrologyPrompt,
        setShowAstrologyPrompt,
        showFinalModal,
        setShowFinalModal,
        showRegisterMode,
        setShowRegisterMode,
    };
}
