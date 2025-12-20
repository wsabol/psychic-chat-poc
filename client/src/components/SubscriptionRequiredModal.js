import React, { useState, useEffect } from 'react';

/**
 * SubscriptionRequiredModal - Full screen modal blocking access until subscription
 * Shows when ESTABLISHED user has no active subscription
 * Cannot be dismissed - user must go to subscriptions page to renew
 * 
 * HIDDEN during onboarding - new users see OnboardingModal instead
 */
export default function SubscriptionRequiredModal({ onNavigateToSubscriptions, isOnboarding = false }) {
  // Don't show during onboarding - user sees OnboardingModal instead
  if (isOnboarding) return null;
  const [fadeIn, setFadeIn] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setFadeIn(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div style={styles.overlay} className={fadeIn ? 'fade-in' : ''}>
      <div style={styles.modalContainer}>
        <div style={styles.iconContainer}>
          <span style={styles.icon}>⏱️</span>
        </div>

        <h2 style={styles.heading}>Subscription Required</h2>

        <p style={styles.message}>
          Your free trial has ended. You need an active subscription to access the full app and continue your readings.
        </p>

        <div style={styles.featuresContainer}>
          <h3 style={styles.subheading}>Get Unlimited Access to:</h3>
          <ul style={styles.featuresList}>
            <li style={styles.featureItem}>✨ Unlimited Tarot Readings</li>
            <li style={styles.featureItem}>🌙 Daily Horoscopes</li>
            <li style={styles.featureItem}>🔮 Personal Astrology Insights</li>
            <li style={styles.featureItem}>💎 Premium Features</li>
          </ul>
        </div>

        <button 
          onClick={onNavigateToSubscriptions}
          style={styles.button}
          onMouseEnter={(e) => e.target.style.backgroundColor = '#5a4a9f'}
          onMouseLeave={(e) => e.target.style.backgroundColor = '#7c63d8'}
        >
          View Subscription Plans
        </button>
      </div>

      <style>{`
        .fade-in {
          animation: fadeInOverlay 0.5s ease-in forwards;
        }

        @keyframes fadeInOverlay {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideIn {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    backdropFilter: 'blur(4px)',
  },

  modalContainer: {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '3rem 2rem',
    maxWidth: '500px',
    width: '90%',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
    textAlign: 'center',
    animation: 'slideIn 0.5s ease-out forwards',
  },

  iconContainer: {
    marginBottom: '1.5rem',
  },

  icon: {
    fontSize: '4rem',
    display: 'inline-block',
  },

  heading: {
    fontSize: '1.8rem',
    color: '#333',
    margin: '0 0 1rem 0',
    fontWeight: '700',
  },

  message: {
    fontSize: '1rem',
    color: '#666',
    lineHeight: '1.6',
    margin: '0 0 2rem 0',
  },

  featuresContainer: {
    backgroundColor: '#f8f8f8',
    borderRadius: '12px',
    padding: '1.5rem',
    marginBottom: '2rem',
    border: '1px solid #e8e8e8',
  },

  subheading: {
    fontSize: '0.95rem',
    color: '#333',
    margin: '0 0 1rem 0',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },

  featuresList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
  },

  featureItem: {
    fontSize: '0.95rem',
    color: '#555',
    padding: '0.5rem 0',
    margin: 0,
  },

  button: {
    backgroundColor: '#7c63d8',
    color: 'white',
    border: 'none',
    padding: '1rem 2rem',
    fontSize: '1rem',
    fontWeight: '600',
    borderRadius: '8px',
    cursor: 'pointer',
    width: '100%',
    transition: 'background-color 0.3s ease',
    marginBottom: '0',
  },
};
