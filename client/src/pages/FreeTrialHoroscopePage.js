import { useState, useEffect } from 'react';
import { useTranslation } from '../context/TranslationContext';
import LogoWithCopyright from '../components/LogoWithCopyright';
import ExitButton from '../components/ExitButton';
import BirthChartCard from '../components/BirthChartCard';
import { logErrorFromCatch } from '../shared/errorLogger.js';
import { formatDateByLanguage } from '../utils/dateLocaleUtils';
import '../styles/responsive.css';
import './HoroscopePage.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

const ZODIAC_SIGNS = [
  { sign: 'aries', label: 'Aries ♈' },
  { sign: 'taurus', label: 'Taurus ♉' },
  { sign: 'gemini', label: 'Gemini ♊' },
  { sign: 'cancer', label: 'Cancer ♋' },
  { sign: 'leo', label: 'Leo ♌' },
  { sign: 'virgo', label: 'Virgo ♍' },
  { sign: 'libra', label: 'Libra ♎' },
  { sign: 'scorpio', label: 'Scorpio ♏' },
  { sign: 'sagittarius', label: 'Sagittarius ♐' },
  { sign: 'capricorn', label: 'Capricorn ♑' },
  { sign: 'aquarius', label: 'Aquarius ♒' },
  { sign: 'pisces', label: 'Pisces ♓' },
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
 */
export default function FreeTrialHoroscopePage({ userId, auth, onExit }) {
  const { t, language } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [horoscope, setHoroscope] = useState(null);
  const [zodiacSign, setZodiacSign] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [needsSignPicker, setNeedsSignPicker] = useState(false);
  const [selectedSign, setSelectedSign] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadHoroscope();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadHoroscope = async (overrideSign) => {
    if (!userId) return;
    try {
      setLoading(true);
      setError(null);

      const url = overrideSign
        ? `${API_URL}/free-trial/horoscope/${userId}?zodiacSign=${encodeURIComponent(overrideSign)}`
        : `${API_URL}/free-trial/horoscope/${userId}`;

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
  if (loading) {
    return (
      <div className="page-safe-area horoscope-page" style={{ position: 'relative' }}>
        <ExitButton isTemporaryAccount={true} onClick={onExit} />
        <div className="horoscope-header">
          <LogoWithCopyright size="80px" alt="Starship Psychics" />
        </div>
        <div className="horoscope-content loading" style={{ textAlign: 'center', padding: '3rem' }}>
          <div className="spinner" style={{ fontSize: 'var(--font-size-spinner)' }}>🔮</div>
          <p style={{ marginTop: '1rem' }}>{t('horoscope.loading')}</p>
        </div>
      </div>
    );
  }

  // ── Sign Picker (no birth info saved) ─────────────────────────────────────
  if (needsSignPicker) {
    return (
      <div className="page-safe-area horoscope-page" style={{ position: 'relative' }}>
        <ExitButton isTemporaryAccount={true} onClick={onExit} />
        <div className="horoscope-header">
          <LogoWithCopyright size="80px" alt="Starship Psychics" />
          <div className="horoscope-header-text">
            <h2 className="heading-primary">🌟 {t('horoscope.selectYourSign') || 'Select Your Zodiac Sign'}</h2>
            <p className="horoscope-subtitle">
              {t('horoscope.selectSignSubtitle') || 'Choose your sun sign for a personalized daily reading.'}
            </p>
          </div>
        </div>

        <section className="horoscope-content">
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0.6rem', marginBottom: '1.5rem' }}>
            {ZODIAC_SIGNS.map(({ sign, label }) => (
              <button
                key={sign}
                onClick={() => setSelectedSign(sign)}
                className={selectedSign === sign ? 'btn-primary' : 'btn-secondary'}
                style={{ minWidth: '44%' }}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            onClick={handleSignConfirm}
            disabled={!selectedSign}
            className="btn-primary"
            style={{ width: '100%', padding: '1rem', fontSize: '1rem', opacity: selectedSign ? 1 : 0.4 }}
          >
            {t('horoscope.getMyHoroscope') || 'Get My Horoscope ✨'}
          </button>
        </section>
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="page-safe-area horoscope-page" style={{ position: 'relative' }}>
        <ExitButton isTemporaryAccount={true} onClick={onExit} />
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
              <BirthChartCard sign={chartData.risingSign} icon="↗️" type="rising" />
            )}
            {chartData.moonSign && (
              <BirthChartCard sign={chartData.moonSign} icon="🌙" type="moon" />
            )}
            <BirthChartCard sign={chartData.sunSign || zodiacSign} icon="☀️" type="sun" />
          </div>
        </section>
      )}

      {/* Horoscope date */}
      <div className="horoscope-metadata" style={{ textAlign: 'center' }}>
        <p className="horoscope-range">{t('horoscope.reading', { range: t('horoscope.daily') })}</p>
        <p className="horoscope-date">{formatDateByLanguage(new Date(), language)}</p>
      </div>

      {/* Horoscope text — uses same CSS classes as normal page for consistent styling */}
      {horoscope && (
        <section className="horoscope-content">
          <div className="horoscope-text">
            <p className="markdown-p">{horoscope}</p>
          </div>
        </section>
      )}

      {/* Upsell — uses disclaimer styling to match normal page's bottom section */}
      <div className="horoscope-disclaimer">
        <p>{t('horoscope.freeTrialUpsell')}</p>
      </div>
    </div>
  );
}
