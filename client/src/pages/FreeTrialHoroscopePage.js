import { useState, useEffect } from 'react';
import { useTranslation } from '../context/TranslationContext';
import LogoWithCopyright from '../components/LogoWithCopyright';
import ExitButton from '../components/ExitButton';
import BirthChartCard from '../components/BirthChartCard';
import SunSignInfo from '../components/SunSignInfo';
import { logErrorFromCatch } from '../shared/errorLogger.js';
import { formatDateByLanguage } from '../utils/dateLocaleUtils';
import { getTranslatedAstrologyData } from '../utils/translatedAstroUtils';
import '../styles/responsive.css';
import './HoroscopePage.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

const ZODIAC_SIGNS = [
  { sign: 'aries',       label: 'Aries ♈' },
  { sign: 'taurus',      label: 'Taurus ♉' },
  { sign: 'gemini',      label: 'Gemini ♊' },
  { sign: 'cancer',      label: 'Cancer ♋' },
  { sign: 'leo',         label: 'Leo ♌' },
  { sign: 'virgo',       label: 'Virgo ♍' },
  { sign: 'libra',       label: 'Libra ♎' },
  { sign: 'scorpio',     label: 'Scorpio ♏' },
  { sign: 'sagittarius', label: 'Sagittarius ♐' },
  { sign: 'capricorn',   label: 'Capricorn ♑' },
  { sign: 'aquarius',    label: 'Aquarius ♒' },
  { sign: 'pisces',      label: 'Pisces ♓' },
];

/**
 * FreeTrialHoroscopePage
 *
 * Dedicated horoscope page for free trial (guest) users.
 * Mirrors the layout and CSS of the normal HoroscopePage for visual consistency.
 *
 * - Uses /free-trial/horoscope/:tempUserId (no Firebase auth — avoids fetchWithTokenRefresh 401)
 * - Falls back to a zodiac sign picker if no birth date was saved
 * - Marks the trial step as 'horoscope' (is_completed = true) on successful load
 * - "✓ Exit to Continue" button (ExitButton) → navigates directly to Firebase register screen
 *   (AppChat wires onExit → handlers.handleCreateAccount → showRegisterMode = true)
 *   NOTE: ExitButton is only shown AFTER the horoscope response — not on loading/sign-picker screens
 */
export default function FreeTrialHoroscopePage({ userId, auth, onExit }) {
  const { t, language } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [horoscope, setHoroscope] = useState(null);
  const [zodiacSign, setZodiacSign] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [sunSignData, setSunSignData] = useState(null);
  const [needsSignPicker, setNeedsSignPicker] = useState(false);
  const [selectedSign, setSelectedSign] = useState(null);
  const [hoveredSign, setHoveredSign] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadHoroscope();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load translated sun sign data whenever the zodiac sign or language changes
  useEffect(() => {
    if (!zodiacSign) { setSunSignData(null); return; }
    const load = async () => {
      const signKey = zodiacSign.toLowerCase();
      const data = await getTranslatedAstrologyData(signKey, language);
      const englishData = await getTranslatedAstrologyData(signKey, 'en-US');
      setSunSignData(data ? {
        ...data,
        _englishElement: englishData?.element,
        _englishRulingPlanet: englishData?.rulingPlanet,
      } : null);
    };
    load();
  }, [zodiacSign, language]);

  /**
   * Build the horoscope API URL, always including the current language so that
   * refreshLanguagePreference() runs server-side and the oracle responds in the
   * user's selected language.  Also includes zodiacSign when provided by the
   * sign-picker — this triggers persistPickedZodiacSign() in the backend which
   * writes the minimal user_astrology row + synthetic birth date that
   * processHoroscopeSync() requires.
   *
   * Passes the browser's local timezone so the server stores it in
   * user_preferences before generating — this ensures the oracle uses the
   * user's local date (not GMT) when determining "today's" horoscope.
   */
  const buildHoroscopeUrl = (overrideSign) => {
    const localTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    const params = new URLSearchParams({ language, timezone: localTimezone });
    if (overrideSign) params.set('zodiacSign', overrideSign);
    return `${API_URL}/free-trial/horoscope/${userId}?${params.toString()}`;
  };

  const loadHoroscope = async (overrideSign) => {
    if (!userId) return;
    try {
      setLoading(true);
      setError(null);

      const url = buildHoroscopeUrl(overrideSign);

      const response = await fetch(url);

      if (!response.ok) {
        const status = response.status;
        if (status === 400 || status === 404) {
          // No birth info saved — show sign picker
          setNeedsSignPicker(true);
          setLoading(false);
          return;
        }
        throw new Error(`Failed to load horoscope (${status})`);
      }

      const data = await response.json();
      setHoroscope(data.horoscope);
      setZodiacSign(data.zodiacSign);
      setChartData(data.chartData || null);
      setNeedsSignPicker(false);

      // Mark step as 'horoscope' (also sets is_completed = true in DB)
      try {
        await fetch(`${API_URL}/free-trial/update-step/${userId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ step: 'horoscope' }),
        });
      } catch (stepErr) {
        // Non-fatal — user still sees their horoscope
        logErrorFromCatch('[FREE-TRIAL-HOROSCOPE] Failed to update step:', stepErr);
      }
    } catch (err) {
      logErrorFromCatch('[FREE-TRIAL-HOROSCOPE] Error loading horoscope:', err);
      setError('horoscope.loadError');
    } finally {
      setLoading(false);
    }
  };

  const handleSignConfirm = () => {
    if (selectedSign) loadHoroscope(selectedSign);
  };

  const capitalize = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';

  // ── Loading ───────────────────────────────────────────────────────────────
  // No ExitButton here — only shown after the oracle's horoscope response
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#0f0f1e',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
      }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem', animation: 'spin 2s linear infinite' }}>🔮</div>
        <p style={{ color: '#b0b0ff', fontSize: '1rem' }}>{t('horoscope.loading')}</p>
      </div>
    );
  }

  // ── Sign Picker (no birth info saved) ─────────────────────────────────────
  // No ExitButton here — it should only appear after the oracle's horoscope response
  if (needsSignPicker) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#0f0f1e',
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <LogoWithCopyright size="70px" alt="Starship Psychics" />
        </div>

        {/* Title */}
        <h2 style={{
          color: '#ffffff',
          fontSize: '1.4rem',
          fontWeight: 'bold',
          textAlign: 'center',
          margin: '0 0 0.5rem 0',
        }}>
          🌟 {t('horoscope.selectYourSign') || 'Select Your Zodiac Sign'}
        </h2>

        {/* Subtitle */}
        <p style={{
          color: '#b0b0ff',
          fontSize: '0.9rem',
          textAlign: 'center',
          margin: '0 0 1.5rem 0',
          lineHeight: '1.5',
        }}>
          {t('horoscope.selectSignSubtitle') || 'Choose your sun sign for a personalized daily reading.'}
        </p>

        {/* Sign grid */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: '0.6rem',
          marginBottom: '1.5rem',
        }}>
          {ZODIAC_SIGNS.map(({ sign, label }) => {
            const isActive = selectedSign === sign;
            const isHovered = hoveredSign === sign;
            return (
              <button
                key={sign}
                onClick={() => setSelectedSign(sign)}
                onMouseEnter={() => setHoveredSign(sign)}
                onMouseLeave={() => setHoveredSign(null)}
                style={{
                  backgroundColor: isActive ? '#9d4edd' : isHovered ? '#2a2a50' : '#1e1e3e',
                  color: isActive ? '#ffffff' : '#cccccc',
                  border: `1px solid ${isActive ? '#9d4edd' : '#3a3a5e'}`,
                  borderRadius: '10px',
                  padding: '0.625rem 1rem',
                  minWidth: '44%',
                  fontSize: '0.95rem',
                  fontWeight: isActive ? 'bold' : 'normal',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  textAlign: 'center',
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Confirm button */}
        <button
          onClick={handleSignConfirm}
          disabled={!selectedSign}
          style={{
            backgroundColor: '#9d4edd',
            color: '#ffffff',
            border: 'none',
            borderRadius: '12px',
            padding: '1rem',
            fontSize: '1.1rem',
            fontWeight: 'bold',
            cursor: selectedSign ? 'pointer' : 'not-allowed',
            opacity: selectedSign ? 1 : 0.4,
            width: '100%',
            transition: 'opacity 0.2s ease',
          }}
        >
          {t('horoscope.getMyHoroscope') || 'Get My Horoscope ✨'}
        </button>
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="page-safe-area horoscope-page" style={{ position: 'relative' }}>
        <div className="horoscope-header">
          <LogoWithCopyright size="80px" alt="Starship Psychics" />
        </div>
        <div className="horoscope-content" style={{ textAlign: 'center', padding: '2rem' }}>
          <p className="error-message">⚠️ {t(error) || error}</p>
          <button onClick={() => loadHoroscope()} className="btn-secondary" style={{ marginTop: '1rem' }}>
            {t('common.tryAgain') || 'Try Again'}
          </button>
        </div>
      </div>
    );
  }

  // ── Horoscope Display ──────────────────────────────────────────────────────
  // ExitButton appears here — ONLY after the oracle's horoscope response
  return (
    <div className="page-safe-area horoscope-page" style={{ position: 'relative' }}>
      {/* Fixed "✓ Exit to Continue" button — wired to register screen via AppChat's onExit */}
      <ExitButton isTemporaryAccount={true} onClick={onExit} />

      {/* Header — identical structure to normal HoroscopePage */}
      <div className="horoscope-header">
        <LogoWithCopyright size="80px" alt="Starship Psychics" />
        <div className="horoscope-header-text">
          <h2 className="heading-primary">{t('horoscope.title') || 'Your Daily Horoscope 🌟'}</h2>
          {zodiacSign && (
            <p className="horoscope-subtitle" style={{ color: 'var(--color-accent-purple)', fontWeight: 'bold' }}>
              {capitalize(zodiacSign)}
            </p>
          )}
        </div>
      </div>

      {/* Birth Chart Triptych — same component as HoroscopePage for consistent styling */}
      {chartData && (chartData.moonSign || chartData.risingSign) && (
        <section className="horoscope-birth-chart">
          <div className="birth-chart-cards">
            {chartData.risingSign && (
              <BirthChartCard sign={chartData.risingSign} degree={chartData.risingDegree} icon="↗️" type="rising" />
            )}
            {chartData.moonSign && (
              <BirthChartCard sign={chartData.moonSign} degree={chartData.moonDegree} icon="🌙" type="moon" />
            )}
            <BirthChartCard sign={chartData.sunSign || zodiacSign} degree={chartData.sunDegree} icon="☀️" type="sun" />
          </div>
        </section>
      )}

      {/* Horoscope content — matches normal HoroscopePage structure exactly */}
      {horoscope && (
        <section className="horoscope-content">
          {/* Metadata inside content section — same as normal page */}
          <div className="horoscope-metadata">
            <p className="horoscope-range">{t('horoscope.reading', { range: t('horoscope.daily') })}</p>
            <p className="horoscope-date">{formatDateByLanguage(new Date(), language)}</p>
          </div>

          {/* Horoscope text — same styling as normal page */}
          <div className="horoscope-text">
            <p className="markdown-p">{horoscope}</p>
          </div>

          {/* Sun sign info — dates, element, ruling planet, about (mirrors normal HoroscopePage) */}
          <SunSignInfo sunSignData={sunSignData} />

          {/* Disclaimer — same as normal HoroscopePage */}
          <div className="horoscope-disclaimer">
            <p>{t('horoscope.disclaimer')}</p>
          </div>
        </section>
      )}
    </div>
  );
}
