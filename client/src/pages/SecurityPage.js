import React, { useState, useEffect } from 'react';
import { useTranslation } from '../context/TranslationContext';
import { getAuth } from 'firebase/auth';
import ReAuthModal from '../components/ReAuthModal';
import VerificationAndTwoFATab from '../components/security/VerificationAndTwoFATab';
import SessionPrivacyTab from '../components/security/SessionPrivacyTab';
import PasswordTab from '../components/security/PasswordTab';

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3000";

/**
 * SecurityPage - User security settings with re-authentication
 * 
 * Compact design with improved UX:
 * - Combined Verification Methods + 2FA in one tab (must verify phone/email before enabling 2FA)
 * - Smaller fonts and padding for better screen fit
 * - Reordered tabs: Verification first, then Password, Devices, Session
 */
export default function SecurityPage({ userId, token, auth, onboarding, onNavigateToPage }) {
  const { t } = useTranslation();
  const [isVerified, setIsVerified] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [activeTab, setActiveTab] = useState('verification');
  const [reAuthAttempts, setReAuthAttempts] = useState(0);
  const MAX_REAUTH_ATTEMPTS = 3;

  // Get user email from Firebase
  useEffect(() => {
    const authInstance = getAuth();
    const currentUser = authInstance.currentUser;
    if (currentUser && currentUser.email) {
      setUserEmail(currentUser.email);
    }
  }, []);

  const handleReAuthSuccess = async () => {
// Modal already closed by isVerified state
    setIsVerified(true);
    
    // Mark security_settings as complete
    if (onboarding?.updateOnboardingStep) {
      try {
        await onboarding.updateOnboardingStep('security_settings');
      } catch (err) {
      }
    }
  };

    const handleReAuthCancel = () => {
    // Try to go back to previous page
    if (onNavigateToPage) {
      onNavigateToPage(0); // Go to chat page
    } else {
      window.history.back();
    }
  };

  const handleReAuthFailure = () => {
    const newAttempts = reAuthAttempts + 1;
    setReAuthAttempts(newAttempts);
    
    if (newAttempts >= MAX_REAUTH_ATTEMPTS) {
      // Too many failed attempts, go back
      handleReAuthCancel();
    }
  };

    if (!isVerified) {
    return (
      <ReAuthModal
        isOpen={!isVerified}
        email={userEmail}
        onSuccess={handleReAuthSuccess}
        onCancel={handleReAuthCancel}
        onFailure={handleReAuthFailure}
      />
    );
  }

  const tabs = [
    { id: 'verification', label: t('security.twoFactor'), icon: '🔐' },
    { id: 'password', label: t('security.changePassword'), icon: '🔒' },
    { id: 'session', label: t('security.sessions'), icon: '⏱️' }
  ];

  return (
    <div className="page-safe-area" style={{ padding: '0.75rem' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        {/* Header */}
              <div style={{ marginBottom: '1rem' }}>
          <h2 className="heading-primary">🔐 {t('security.title')}</h2>
          <p style={{ color: '#666', marginBottom: 0, fontSize: '13px' }}>
            {t('security.title')}
          </p>
        </div>

        {/* Tab Navigation */}
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          marginBottom: '1rem',
          borderBottom: '1px solid #e0e0e0',
          overflowX: 'auto',
          paddingBottom: '0.75rem'
        }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '0.5rem 0.75rem',
                backgroundColor: activeTab === tab.id ? '#7c63d8' : 'rgba(255, 255, 255, 0.9)',
                color: activeTab === tab.id ? 'white' : '#333',
                border: activeTab === tab.id ? 'none' : '1px solid rgba(200, 200, 200, 0.5)',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: activeTab === tab.id ? 'bold' : 'normal',
                whiteSpace: 'nowrap',
                fontSize: '12px',
                transition: 'all 0.2s ease'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div style={{
          backgroundColor: 'rgba(255, 255, 255, 0.97)',
          padding: '1rem',
          borderRadius: '8px',
          maxHeight: 'calc(100vh - 220px)',
          overflowY: 'auto'
        }}>
          {activeTab === 'verification' && (
            <VerificationAndTwoFATab userId={userId} token={token} apiUrl={API_URL} userEmail={userEmail} />
          )}
          {activeTab === 'password' && (
            <PasswordTab userId={userId} token={token} apiUrl={API_URL} />
          )}
          {activeTab === 'session' && (
            <SessionPrivacyTab userId={userId} token={token} apiUrl={API_URL} />
          )}
        </div>
      </div>
    </div>
  );
}

