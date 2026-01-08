import { useState, useEffect } from 'react';
import { useTranslation } from '../context/TranslationContext';
import { MoonPhaseHeader } from '../components/MoonPhaseHeader';
import { MoonPhaseDisplay } from '../components/MoonPhaseDisplay';
import { MoonPhaseContent } from '../components/MoonPhaseContent';
import { MoonPhasesGrid } from '../components/MoonPhasesGrid';
import { SunSignInfo } from '../components/SunSignInfo';
import { HoroscopeError } from '../components/HoroscopeError';
import { HoroscopeLoading } from '../components/HoroscopeLoading';
import { BirthChartDisplay } from '../components/BirthChartDisplay';
import { BirthInfoMissingPrompt } from '../components/BirthInfoMissingPrompt';
import { useAstroData } from '../hooks/useAstroData';
import { useUserPreferences } from '../hooks/useUserPreferences';
import { useMoonPhaseData } from '../hooks/useMoonPhaseData';
import { useSunSignData } from '../hooks/useSunSignData';
import { calculateMoonPhase } from '../utils/moonPhaseUtils';
import { isBirthInfoMissing } from '../utils/birthInfoErrorHandler';
import '../styles/responsive.css';
import './MoonPhasePage.css';

export default function MoonPhasePage({ userId, token, auth, onNavigateToPage }) {
  const { language } = useTranslation();
  const [currentPhase, setCurrentPhase] = useState(() => calculateMoonPhase());
  const [showingBrief, setShowingBrief] = useState(false);

  // Load user data
  const { astroInfo } = useAstroData(userId, token);
  const { userPreference, voiceEnabled } = useUserPreferences(userId, token);

  // Load moon phase data
  const {
    moonPhaseData,
    loading,
    generating,
    error,
    hasAutoPlayed,
    setHasAutoPlayed,
    lastUpdated,
    loadMoonPhaseData,
    setError,
    stopPolling
  } = useMoonPhaseData(userId, token, currentPhase);

  // Load sun sign data
  const sunSignData = useSunSignData(astroInfo, language);

  // Load moon phase when user preference changes
  useEffect(() => {
    if (!loading) {
      loadMoonPhaseData();
    }
  }, [userPreference]);

  // Update phase and reload when current phase changes
  useEffect(() => {
    const phase = calculateMoonPhase();
    setCurrentPhase(phase);
  }, []);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  return (
    <div className="page-safe-area moon-phase-page">
      <MoonPhaseHeader />

      {/* Birth info missing */}
      {!loading && !error && isBirthInfoMissing(astroInfo) && (
        <BirthInfoMissingPrompt 
          onNavigateToPersonalInfo={() => onNavigateToPage?.(2)}
        />
      )}

      {/* Error state */}
      <HoroscopeError 
        error={error}
        onRetry={loadMoonPhaseData}
        onNavigateToPersonalInfo={() => onNavigateToPage?.(2)}
      />

      {/* Loading state */}
      {loading && <HoroscopeLoading generating={generating} />}

      {/* Moon phase display */}
      <MoonPhaseDisplay currentPhase={currentPhase} astroInfo={astroInfo} />

      {/* Birth chart */}
      <BirthChartDisplay astroInfo={astroInfo} />

      {/* Moon phase content */}
      <MoonPhaseContent
        moonPhaseData={moonPhaseData}
        showingBrief={showingBrief}
        setShowingBrief={setShowingBrief}
        voiceEnabled={voiceEnabled}
        hasAutoPlayed={hasAutoPlayed}
        setHasAutoPlayed={setHasAutoPlayed}
        lastUpdated={lastUpdated}
      />

      {/* Moon phases grid */}
      {moonPhaseData && !loading && (
        <MoonPhasesGrid currentPhase={currentPhase} />
      )}

      {/* Sun sign info */}
      <SunSignInfo sunSignData={sunSignData} />
    </div>
  );
}
