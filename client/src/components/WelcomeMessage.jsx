import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '../context/TranslationContext';
import { logErrorFromCatch } from '../shared/errorLogger.js';
import './WelcomeMessage.css';

/**
 * WelcomeMessage Component
 * 
 * Displays welcome modal as final onboarding step
 * - Shows user's name (familiar or first name)
 * - Auto-closes after 30 seconds
 * - User can close with X button or Close button
 * - Completes onboarding_step = 'welcome' when closing
 * - Navigates to Chat (index 0)
 */
export function WelcomeMessage({ userId, onClose, onNavigateToChat, onOnboardingComplete, token }) {
  const { t } = useTranslation();
  const [fadeIn, setFadeIn] = useState(false);
  const [autoCloseTimer, setAutoCloseTimer] = useState(30);
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

  // Fetch user's name on mount
  useEffect(() => {
    const fetchUserName = async () => {
      try {
        const response = await fetch(`${API_URL}/user-profile/${userId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          const displayName = data.familiar_name || data.first_name || '';
          setUserName(displayName);
        }
      } catch (err) {
        logErrorFromCatch('[WELCOME] Error fetching user name:', err);
      } finally {
        setLoading(false);
      }
    };

    if (userId && token) {
      fetchUserName();
    }
  }, [userId, token, API_URL]);

  // Trigger fade-in animation
  useEffect(() => {
    setFadeIn(true);
  }, []);

  // Complete onboarding by marking welcome step as done
  const handleCompleteOnboarding = useCallback(async () => {
    if (completing) return;
    setCompleting(true);

    try {
      if (onOnboardingComplete) {
        await onOnboardingComplete();
      }
      
      if (onNavigateToChat) {
        onNavigateToChat();
      }
      
      if (onClose) {
        onClose();
      }
    } catch (err) {
      logErrorFromCatch('[WELCOME] Error completing onboarding:', err);
      if (onClose) {
        onClose();
      }
    } finally {
      setCompleting(false);
    }
  }, [completing, onOnboardingComplete, onNavigateToChat, onClose]);

  // Auto-close countdown (30 seconds)
  useEffect(() => {
    if (autoCloseTimer <= 0) {
      handleCompleteOnboarding();
      return;
    }

    const timer = setTimeout(() => {
      setAutoCloseTimer(prev => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [autoCloseTimer, handleCompleteOnboarding]);

  return (
    <div className={`welcome-message-overlay ${fadeIn ? 'fade-in' : ''}`}>
      <div className="welcome-message-modal">
        {/* Header with close button (X) */}
        <div className="welcome-header">
          <h2>{t('welcome.title')}</h2>
          <button
            className="welcome-close-btn"
            onClick={handleCompleteOnboarding}
            disabled={completing}
            title="Close welcome"
            type="button"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="welcome-content">
          {!loading && userName && (
            <p className="welcome-greeting">
              {t('welcome.personalized', { name: userName })}
            </p>
          )}

          <p className="welcome-paragraph">
            {t('welcome.paragraph1')}
          </p>
          <p className="welcome-paragraph">
            {t('welcome.paragraph2')}
          </p>
          <p className="welcome-paragraph">
            {t('welcome.paragraph3')}
          </p>

          <div className="welcome-timer">
            {t('welcome.autoNavigate', { seconds: autoCloseTimer })}
          </div>
        </div>

        {/* Footer with button */}
        <div className="welcome-footer">
          <button
            className="welcome-btn welcome-btn-primary"
            onClick={handleCompleteOnboarding}
            disabled={completing}
            type="button"
          >
            {completing ? t('common.saving') : t('welcome.close')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default WelcomeMessage;