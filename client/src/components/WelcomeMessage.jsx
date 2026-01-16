import React, { useState, useEffect } from 'react';
import { useTranslation } from '../context/TranslationContext';
import { logErrorFromCatch } from '../shared/errorLogger.js';
import './WelcomeMessage.css';

/**
 * WelcomeMessage Component
 * 
 * Displays a welcome modal when user completes onboarding
 * - Shows user's name (familiar or first name)
 * - Offers navigation to chat or explore
 * - Auto-navigates to chat after 8 seconds
 * - Remembers if dismissed (never shows again)
 */
export function WelcomeMessage({ userId, onClose, onNavigateToChat }) {
  const { t } = useTranslation();
  const [fadeIn, setFadeIn] = useState(false);
  const [autoNavigateTimer, setAutoNavigateTimer] = useState(8);
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(true);

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';
  const STORAGE_KEY = `welcome_message_dismissed_${userId}`;

  // Fetch user's name on mount
  useEffect(() => {
    const fetchUserName = async () => {
      try {
        const response = await fetch(`${API_URL}/user-profile/${userId}`);
        if (response.ok) {
          const data = await response.json();
          // Use familiar name if available, fallback to first name
          const displayName = data.familiar_name || data.first_name || '';
          setUserName(displayName);
        }
      } catch (err) {
        logErrorFromCatch('[WELCOME] Error fetching user name:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserName();
  }, [userId, API_URL]);

  // Trigger fade-in animation
  useEffect(() => {
    setFadeIn(true);
  }, []);

  // Auto-navigate countdown
  useEffect(() => {
    if (autoNavigateTimer <= 0) {
      handleGoToChat();
      return;
    }

    const timer = setTimeout(() => {
      setAutoNavigateTimer(prev => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [autoNavigateTimer]);

  const handleGoToChat = () => {
    // Mark as dismissed
    localStorage.setItem(STORAGE_KEY, 'true');
    // Navigate to chat
    if (onNavigateToChat) {
      onNavigateToChat();
    }
  };

  const handleExploreFirst = () => {
    // Mark as dismissed
    localStorage.setItem(STORAGE_KEY, 'true');
    // Just close without navigating
    if (onClose) {
      onClose();
    }
  };

  return (
    <div className={`welcome-message-overlay ${fadeIn ? 'fade-in' : ''}`}>
      <div className="welcome-message-modal">
        {/* Header */}
        <div className="welcome-header">
          <h2>{t('welcome.title')}</h2>
        </div>

        {/* Content */}
        <div className="welcome-content">
          {/* Personalized greeting */}
          {!loading && userName && (
            <p className="welcome-greeting">
              {t('welcome.personalized', { name: userName })}
            </p>
          )}

          {/* Main message paragraphs */}
          <p className="welcome-paragraph">
            {t('welcome.paragraph1')}
          </p>
          <p className="welcome-paragraph">
            {t('welcome.paragraph2')}
          </p>
          <p className="welcome-paragraph">
            {t('welcome.paragraph3')}
          </p>

          {/* Auto-navigate timer */}
          <div className="welcome-timer">
            {t('welcome.autoNavigate', { seconds: autoNavigateTimer })}
          </div>
        </div>

        {/* Footer with buttons */}
        <div className="welcome-footer">
          <button 
            className="welcome-btn welcome-btn-primary"
            onClick={handleGoToChat}
            type="button"
          >
            {t('welcome.goToChat')}
          </button>
          <button 
            className="welcome-btn welcome-btn-secondary"
            onClick={handleExploreFirst}
            type="button"
          >
            {t('welcome.exploreFirst')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default WelcomeMessage;
