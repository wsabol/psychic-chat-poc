import { useEffect, useState } from 'react';
import { useTranslation } from '../context/TranslationContext';
import { useSpeech } from '../hooks/useSpeech';
import { useVenusLoveData } from '../hooks/useVenusLoveData';
import VoiceBar from '../components/VoiceBar';
import BirthInfoMissingPrompt from '../components/BirthInfoMissingPrompt';
import AspectsDisplay from '../components/AspectsDisplay';
import LogoWithCopyright from '../components/LogoWithCopyright';
import '../styles/responsive.css';
import './VenusLovePage.css';

// ── Planet sign chips ──────────────────────────────────────────────────────
const PLANET_ICONS = {
  Venus:  '♀',
  Mars:   '♂',
  Moon:   '🌙',
  Rising: '↗️',
};

function SignChip({ planet, sign, degree }) {
  if (!sign) return null;
  return (
    <span className="vlp-sign-chip">
      <span className="vlp-chip-icon">{PLANET_ICONS[planet] || '✦'}</span>
      <span className="vlp-chip-label">{planet}</span>
      <span className="vlp-chip-sign">{sign}{degree ? ` ${degree}°` : ''}</span>
    </span>
  );
}

// ── Brief / Full toggle button ────────────────────────────────────────────
function ToggleBriefBtn({ showingBrief, onClick }) {
  return (
    <button className="vlp-toggle-btn" onClick={onClick}>
      {showingBrief ? '📖 Read Full Profile' : '📝 Show Summary'}
    </button>
  );
}

/**
 * VenusLovePage
 *
 * Displays the Oracle's personalised Venus Love Profile:
 *   • Romantic identity & love languages
 *   • Ideal partner qualities
 *   • How to identify a potential lover
 *   • Current love weather (today's Venus/Mars transits)
 *   • Growth in love
 *
 * Follows the same layout pattern as CosmicWeatherPage.
 */
export default function VenusLovePage({ userId, token, auth, onNavigateToPage }) {
  const { t } = useTranslation();
  const [showingBrief, setShowingBrief] = useState(false);
  const [hasAutoPlayed, setHasAutoPlayed] = useState(false);

  const isAuthenticated = auth?.isAuthenticated || !!token;
  const { profileData, loading, generating, error, load, refresh } =
    useVenusLoveData(userId, token, isAuthenticated);

  const {
    speak, stop, pause, resume,
    isPlaying, isPaused, isLoading: isSpeechLoading,
    error: speechError, isSupported, volume, setVolume
  } = useSpeech();

  // Load on mount
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-play
  useEffect(() => {
    if (isSupported && profileData && !hasAutoPlayed && !isPlaying) {
      setHasAutoPlayed(true);
      const text = showingBrief && profileData.brief ? profileData.brief : profileData.profile;
      setTimeout(() => speak(text, { rate: 0.95, pitch: 1.15 }), 600);
    }
  }, [isSupported, profileData, hasAutoPlayed, isPlaying, showingBrief, speak]);

  const handlePlayVoice = () => {
    const text = showingBrief && profileData.brief ? profileData.brief : profileData.profile;
    speak(text, { rate: 0.95, pitch: 1.15 });
  };

  const handleTogglePause = () => {
    if (isPlaying) pause();
    else if (isPaused) resume();
  };

  // Derive the text to display
  const displayText = profileData
    ? (showingBrief && profileData.brief ? profileData.brief : profileData.profile)
    : null;

  return (
    <div className="page-safe-area vlp-page">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="vlp-header">
        <LogoWithCopyright size="80px" alt="Starship Psychics" />
        <div className="vlp-header-text">
          <h2 className="heading-primary">💕 Venus Love Profile</h2>
          <p className="vlp-subtitle">
            Your romantic identity, love languages &amp; how to find your match
          </p>
        </div>
      </div>

      {/* ── Birth info missing ─────────────────────────────────────────── */}
      {error === 'BIRTH_INFO_MISSING' && (
        <BirthInfoMissingPrompt
          onNavigateToPersonalInfo={() => onNavigateToPage && onNavigateToPage(1)}
        />
      )}

      {/* ── Other errors ──────────────────────────────────────────────── */}
      {error && error !== 'BIRTH_INFO_MISSING' && (
        <div className="vlp-content error">
          <p className="error-message">⚠️ {error}</p>
          <button onClick={load} className="btn-secondary">{t('common.tryAgain')}</button>
        </div>
      )}

      {/* ── Loading ───────────────────────────────────────────────────── */}
      {(loading || generating) && (
        <div className="vlp-content loading">
          <div className="vlp-spinner">💕</div>
          <p>{generating ? 'Reading the stars of your heart…' : 'Loading your Venus Love Profile…'}</p>
        </div>
      )}

      {/* ── Main content ──────────────────────────────────────────────── */}
      {profileData && !loading && (
        <section className="vlp-content">

          {/* Sign chips row */}
          <div className="vlp-chips-row">
            <SignChip planet="Venus"  sign={profileData.venusSign}  degree={profileData.venusDegree} />
            <SignChip planet="Mars"   sign={profileData.marsSign} />
            <SignChip planet="Moon"   sign={profileData.moonSign} />
            <SignChip planet="Rising" sign={profileData.risingSign} />
          </div>

          {/* Oracle text */}
          <div className="vlp-text">
            {(displayText || '').split(/\n\n+/).filter(p => p.trim()).map((para, i) => (
              <pre key={i} className="markdown-pre">{para.trim()}</pre>
            ))}

            {/* Voice bar */}
            {isSupported && (
              <VoiceBar
                isPlaying={isPlaying}
                isPaused={isPaused}
                isLoading={isSpeechLoading}
                error={speechError}
                onPlay={handlePlayVoice}
                onTogglePause={handleTogglePause}
                onStop={stop}
                isSupported={isSupported}
                volume={volume}
                onVolumeChange={setVolume}
              />
            )}

            <div className="vlp-actions">
              <ToggleBriefBtn
                showingBrief={showingBrief}
                onClick={() => setShowingBrief(v => !v)}
              />
              <button
                className="vlp-refresh-btn"
                onClick={refresh}
                disabled={generating}
                title="Refresh your love profile with today's transits"
              >
                {generating ? '✨ Refreshing…' : '🔄 Refresh Today\'s Love Weather'}
              </button>
            </div>
          </div>

          {/* Venus & Mars aspects */}
          {profileData.aspects && (
            <div className="vlp-aspects-section">
              <AspectsDisplay aspects={profileData.aspects} />
            </div>
          )}

          <div className="vlp-disclaimer">
            <p>{t('common.disclaimer')}</p>
          </div>
        </section>
      )}
    </div>
  );
}
