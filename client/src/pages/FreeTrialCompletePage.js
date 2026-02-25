import { useState, useEffect } from 'react';
import { useTranslation } from '../context/TranslationContext';
import LogoWithCopyright from '../components/LogoWithCopyright';
import { logErrorFromCatch } from '../shared/errorLogger.js';
import '../styles/responsive.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

/**
 * FreeTrialCompletePage
 *
 * Shown after the user views their free-trial horoscope and clicks "Exit to Continue".
 * Mirrors the mobile FreeTrialCompleteScreen:
 *   - Marks the trial session as fully completed in the DB
 *   - Shows a celebration header and full feature list
 *   - "Create Account" → Firebase registration
 *   - "Exit" → logs out the guest session and returns to landing
 */
export default function FreeTrialCompletePage({ userId, onCreateAccount, onExit }) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [completed, setCompleted] = useState(false);

  // Mark trial as fully completed in the DB on mount
  useEffect(() => {
    if (!userId) {
      setCompleted(true);
      return;
    }
    const markComplete = async () => {
      try {
        await fetch(`${API_URL}/free-trial/complete/${userId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        setCompleted(true);
      } catch (err) {
        logErrorFromCatch('[FREE-TRIAL-COMPLETE] Error marking complete:', err);
        setCompleted(true); // non-fatal — show options regardless
      }
    };
    markComplete();
  }, [userId]);

  const handleCreateAccount = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (onCreateAccount) onCreateAccount();
    } catch (err) {
      logErrorFromCatch('[FREE-TRIAL-COMPLETE] Error navigating to register:', err);
      setBusy(false);
    }
  };

  const handleExit = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (onExit) await onExit();
    } catch (err) {
      logErrorFromCatch('[FREE-TRIAL-COMPLETE] Error during exit:', err);
      setBusy(false);
    }
  };

  const features = [
    t('freeTrial.complete.feature1') || '🔮 Unlimited Oracle Chat – Ask anything, anytime',
    t('freeTrial.complete.feature2') || '⭐ Daily Horoscopes – Personalized cosmic guidance',
    t('freeTrial.complete.feature3') || '🌙 Moon Phase Tracker – Align with lunar energy',
    t('freeTrial.complete.feature4') || '🌌 Cosmic Weather – Track planetary influences',
    t('freeTrial.complete.feature5') || '📊 Full Birth Chart – Sun, Moon & Rising signs',
  ];

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      background: 'rgba(0,0,0,0)',
    }}>
      <div style={{
        backgroundColor: 'rgba(20, 20, 50, 0.97)',
        border: '1px solid rgba(157, 78, 221, 0.35)',
        borderRadius: '16px',
        padding: '2.5rem 2rem',
        maxWidth: '500px',
        width: '100%',
        color: 'white',
        textAlign: 'center',
        boxShadow: '0 8px 40px rgba(0,0,0,0.55)',
        position: 'relative',
        zIndex: 10,
      }}>

        {/* Logo */}
        <div style={{ marginBottom: '1rem' }}>
          <LogoWithCopyright size="70px" alt="Starship Psychics" />
        </div>

        {/* Stars */}
        <div style={{ fontSize: '2.2rem', marginBottom: '1rem' }}>✨ 🌟 ✨</div>

        {/* Title */}
        <h1 style={{
          fontSize: '1.7rem',
          fontWeight: 'bold',
          marginBottom: '0.75rem',
          color: '#fff',
          lineHeight: 1.3,
        }}>
          {t('freeTrial.complete.title') || 'Your Free Trial is Complete! ✨'}
        </h1>

        {/* Subtitle */}
        <p style={{
          color: '#b0b0ff',
          fontSize: '0.95rem',
          lineHeight: 1.6,
          marginBottom: '1.75rem',
        }}>
          {t('freeTrial.complete.subtitle') ||
            "You've experienced a taste of what Starship Psychics has to offer. Create an account to unlock everything!"}
        </p>

        {/* Features box */}
        <div style={{
          backgroundColor: 'rgba(26, 26, 46, 0.9)',
          border: '1px solid rgba(157, 78, 221, 0.3)',
          borderRadius: '12px',
          padding: '1.25rem 1.5rem',
          marginBottom: '1.75rem',
          textAlign: 'left',
        }}>
          <p style={{
            color: '#9d4edd',
            fontWeight: 'bold',
            fontSize: '0.95rem',
            marginBottom: '0.75rem',
            textAlign: 'center',
          }}>
            {t('freeTrial.complete.featuresTitle') || '✨ Unlock the Full Experience:'}
          </p>
          {features.map((feature, i) => (
            <p key={i} style={{
              color: '#d0d0ff',
              fontSize: '0.9rem',
              lineHeight: 1.8,
              margin: 0,
            }}>
              {feature}
            </p>
          ))}
        </div>

        {/* Loading indicator while completing */}
        {!completed && (
          <div style={{
            color: '#9d4edd',
            fontSize: '1.4rem',
            marginBottom: '1rem',
            animation: 'spin 1s linear infinite',
          }}>⏳</div>
        )}

        {/* Create Account button */}
        <button
          onClick={handleCreateAccount}
          disabled={busy}
          style={{
            width: '100%',
            padding: '1rem',
            backgroundColor: busy ? '#5a5a8a' : '#9d4edd',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            fontSize: '1.05rem',
            fontWeight: 'bold',
            cursor: busy ? 'not-allowed' : 'pointer',
            marginBottom: '0.85rem',
            boxShadow: busy ? 'none' : '0 4px 16px rgba(157, 78, 221, 0.4)',
            transition: 'all 0.2s ease',
          }}
          onMouseOver={(e) => {
            if (!busy) e.currentTarget.style.backgroundColor = '#8a3cc5';
          }}
          onMouseOut={(e) => {
            if (!busy) e.currentTarget.style.backgroundColor = '#9d4edd';
          }}
        >
          {busy ? '...' : (t('freeTrial.complete.createAccount') || '📝 Create Account to Continue')}
        </button>

        {/* Exit button */}
        <button
          onClick={handleExit}
          disabled={busy}
          style={{
            width: '100%',
            padding: '0.85rem',
            backgroundColor: 'transparent',
            color: busy ? '#555' : '#888',
            border: '1px solid rgba(90, 90, 100, 0.5)',
            borderRadius: '12px',
            fontSize: '0.95rem',
            cursor: busy ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseOver={(e) => {
            if (!busy) e.currentTarget.style.borderColor = '#666';
          }}
          onMouseOut={(e) => {
            if (!busy) e.currentTarget.style.borderColor = 'rgba(90, 90, 100, 0.5)';
          }}
        >
          {t('freeTrial.complete.exit') || 'Exit'}
        </button>
      </div>
    </div>
  );
}
