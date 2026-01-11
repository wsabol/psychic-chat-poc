import { useState, useEffect } from 'react';
import { useTranslation } from '../context/TranslationContext';
import { ComplianceUpdateModal } from '../components/ComplianceUpdateModal-CLEAN';
import { HoroscopeHeader } from '../components/HoroscopeHeader';
import { HoroscopeToggle } from '../components/HoroscopeToggle';
import { BirthChartDisplay } from '../components/BirthChartDisplay';
import { HoroscopeContent } from '../components/HoroscopeContent';
import { SunSignInfo } from '../components/SunSignInfo';
import { HoroscopeError } from '../components/HoroscopeError';
import { HoroscopeLoading } from '../components/HoroscopeLoading';
import { BirthInfoMissingPrompt } from '../components/BirthInfoMissingPrompt';
import { useHoroscopeData } from '../hooks/useHoroscopeData';
import { useUserPreferences } from '../hooks/useUserPreferences';
import { useAstroData } from '../hooks/useAstroData';
import { useSunSignData } from '../hooks/useSunSignData';
import { isBirthInfoMissing } from '../utils/birthInfoErrorHandler';
import '../styles/responsive.css';
import './HoroscopePage.css';

export default function HoroscopePage({ userId, token, auth, onExit, onNavigateToPage }) {
  const { language } = useTranslation();
  const [horoscopeRange, setHoroscopeRange] = useState('daily');
  const [showingBrief, setShowingBrief] = useState(false);

  // Load user data
  const { astroInfo } = useAstroData(userId, token);
  const { userPreference, voiceEnabled } = useUserPreferences(userId, token);
  
  // Load horoscope data
  const {
    horoscopeData,
    loading,
    generating,
    error,
    complianceStatus,
    hasAutoPlayed,
    setHasAutoPlayed,
    loadHoroscope,
    setComplianceStatus,
    setError,
    stopPolling
  } = useHoroscopeData(userId, token, horoscopeRange, astroInfo);

  // Load sun sign data
  const sunSignData = useSunSignData(astroInfo, language);

  // Load horoscope when range or preference changes
  useEffect(() => {
    if (!loading) {
      loadHoroscope();
    }
  }, [horoscopeRange, userPreference]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  const handleClose = () => {
    if (onExit) {
      onExit();
    } else {
    }
  };

  // Show compliance modal if needed
  if (complianceStatus?.requiresPrivacyUpdate || complianceStatus?.requiresTermsUpdate) {
    return (
      <ComplianceUpdateModal
        userId={userId}
        token={token}
        compliance={{
          blocksAccess: true,
          requiresTermsUpdate: complianceStatus.requiresTermsUpdate,
          requiresPrivacyUpdate: complianceStatus.requiresPrivacyUpdate,
          termsVersion: {
            requiresReacceptance: complianceStatus.requiresTermsUpdate,
            current: complianceStatus.termsVersion
          },
          privacyVersion: {
            requiresReacceptance: complianceStatus.requiresPrivacyUpdate,
            current: complianceStatus.privacyVersion
          }
        }}
        onConsentUpdated={() => {
          setComplianceStatus(null);
          loadHoroscope();
        }}
      />
    );
  }

  return (
    <div className="page-safe-area horoscope-page" style={{ position: 'relative' }}>
      {/* Close button for temporary accounts */}
      {auth?.isTemporaryAccount && (
        <>
          <button
            type="button"
            onClick={handleClose}
            style={{
              position: 'absolute',
              top: '1rem',
              right: '1rem',
              background: 'transparent',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              zIndex: 100,
              opacity: 0.7,
              transition: 'opacity 0.2s'
            }}
            onMouseEnter={(e) => e.target.style.opacity = '1'}
            onMouseLeave={(e) => e.target.style.opacity = '0.7'}
            title="Close"
          >
            ✕
          </button>
          <button type="button" onClick={handleClose} className="exit-prompt" title="Click to continue">
            <span className="exit-arrow">👉</span>
            <span className="exit-message">Click to continue</span>
          </button>
        </>
      )}

      <HoroscopeHeader />
      <HoroscopeToggle 
        horoscopeRange={horoscopeRange}
        setHoroscopeRange={setHoroscopeRange}
        loading={loading}
        generating={generating}
      />

      {/* Birth info missing */}
      {!loading && !error && isBirthInfoMissing(astroInfo) && (
        <BirthInfoMissingPrompt 
          onNavigateToPersonalInfo={() => onNavigateToPage?.(2)}
        />
      )}

      {/* Error state */}
      <HoroscopeError 
        error={error}
        onRetry={loadHoroscope}
        onNavigateToPersonalInfo={() => onNavigateToPage?.(2)}
      />

      {/* Loading state */}
      {loading && <HoroscopeLoading generating={generating} />}

      {/* Birth chart */}
      <BirthChartDisplay astroInfo={astroInfo} />

      {/* Horoscope content */}
      <HoroscopeContent
        horoscopeData={horoscopeData}
        showingBrief={showingBrief}
        setShowingBrief={setShowingBrief}
        voiceEnabled={voiceEnabled}
        hasAutoPlayed={hasAutoPlayed}
        setHasAutoPlayed={setHasAutoPlayed}
      />

      {/* Sun sign info */}
      <SunSignInfo sunSignData={sunSignData} />
    </div>
  );
}

