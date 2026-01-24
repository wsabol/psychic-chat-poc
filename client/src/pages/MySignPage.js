import { useAstrologyData } from './MySignPage/hooks/useAstrologyData';
import { SignCards } from './MySignPage/components/SignCards';
import { SignDetails } from './MySignPage/components/SignDetails';
import { ZodiacWheel } from './MySignPage/components/ZodiacWheel';
import BirthInfoMissingPrompt from '../components/BirthInfoMissingPrompt';
import LogoWithCopyright from '../components/LogoWithCopyright';
import { useTranslation } from '../context/TranslationContext';
import { zodiacSymbols } from '../data/zodiac/modules/zodiac-symbols';
import './MySignPage.css';
import '../styles/responsive.css';

/**
 * MySignPage - Display user's birth chart (Sun, Moon, Rising signs)
 * Refactored to use modular components and hooks
 */
export default function MySignPage({ userId, token, auth, onNavigateToPage }) {
  const { t } = useTranslation();
  const { astroData, loading, error, fetchAstrologyData } = useAstrologyData(userId, token);

  if (loading) {
    return (
      <div className="page-safe-area sign-page">
        <div className="loading-container">
          <p>Loading your birth chart...</p>
        </div>
      </div>
    );
  }

  if (error === 'BIRTH_INFO_MISSING') {
    return (
      <div className="page-safe-area sign-page">
        <BirthInfoMissingPrompt 
          onNavigateToPersonalInfo={() => onNavigateToPage && onNavigateToPage(2)}
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-safe-area sign-page">
        <div className="error-container">
          <p className="error-message">⚠️ {error}</p>
          <button onClick={fetchAstrologyData} className="btn-secondary">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!astroData?.astrology_data) {
    return (
      <div className="page-safe-area sign-page">
        <div className="error-container">
          <p className="error-message">No astrology data available.</p>
        </div>
      </div>
    );
  }

  const astro = astroData.astrology_data;
  
  // Get zodiac emoji from sun sign
  const sunSignKey = astro.sun_sign?.toLowerCase();
  const sunSignEmoji = sunSignKey && zodiacSymbols[sunSignKey] 
    ? zodiacSymbols[sunSignKey].emoji
    : '✨';

  return (
    <div className="page-safe-area sign-page">
      {/* Header */}
      <div className="sign-header">
        <h2 className="heading-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <LogoWithCopyright size="80px" alt="Starship Psychics" />
          {sunSignEmoji} {t('astrology.birthChart')}
        </h2>
        <p className="sign-subtitle">{t('astrology.description') || 'Your Sun, Moon, and Rising Signs calculated from your birth data'}</p>
      </div>

      {/* The Three Signs */}
      <SignCards astro={astro} t={t} />

            {/* Divider */}
      <div className="section-divider"></div>

      {/* Zodiac Wheel - 12 Houses */}
      <ZodiacWheel astroData={astro} />

      {/* Divider */}
      <div className="section-divider"></div>

      {/* Detailed Information */}
      <section className="zodiac-details-section">
        <SignDetails astro={astro} t={t} />
      </section>
    </div>
  );
}
