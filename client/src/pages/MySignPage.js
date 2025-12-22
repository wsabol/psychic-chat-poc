import { useAstrologyData } from './MySignPage/hooks/useAstrologyData';
import { SignCards } from './MySignPage/components/SignCards';
import { SignDetails } from './MySignPage/components/SignDetails';
import BirthInfoMissingPrompt from '../components/BirthInfoMissingPrompt';
import './MySignPage.css';
import '../styles/responsive.css';

/**
 * MySignPage - Display user's birth chart (Sun, Moon, Rising signs)
 * Refactored to use modular components and hooks
 */
export default function MySignPage({ userId, token, auth, onNavigateToPage }) {
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

  return (
    <div className="page-safe-area sign-page">
      {/* Header */}
      <div className="sign-header">
        <h2 className="heading-primary">♈ Your Birth Chart</h2>
        <p className="sign-subtitle">Your Sun, Moon, and Rising Signs calculated from your birth data</p>
      </div>

      {/* The Three Signs */}
      <SignCards astro={astro} />

      {/* Divider */}
      <div className="section-divider"></div>

      {/* Detailed Information */}
      <section className="zodiac-details-section">
        <SignDetails astro={astro} />
      </section>
    </div>
  );
}
