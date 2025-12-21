import React, { useState, useEffect } from 'react';
import { getAuth } from 'firebase/auth';
import ReAuthModal from '../components/ReAuthModal';
import DevicesTab from '../components/security/DevicesTab';
import VerificationMethodsTab from '../components/security/VerificationMethodsTab';
import TwoFactorAuthTab from '../components/security/TwoFactorAuthTab';
import SessionPrivacyTab from '../components/security/SessionPrivacyTab';
import PasswordTab from '../components/security/PasswordTab';

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3000";

/**
 * SecurityPage - User security settings with re-authentication
 * Displays: Devices, Passkeys, Phone, Email, Password
 */
export default function SecurityPage({ userId, token, auth, onboarding }) {
  const [showReAuthModal, setShowReAuthModal] = useState(true);
  const [isVerified, setIsVerified] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [activeTab, setActiveTab] = useState('devices');


  // Get user email from Firebase
  useEffect(() => {
    const authInstance = getAuth();
    const currentUser = authInstance.currentUser;
    if (currentUser && currentUser.email) {
      setUserEmail(currentUser.email);
    }
  }, []);

    const handleReAuthSuccess = async () => {
    setShowReAuthModal(false);
    setIsVerified(true);
    
    // Mark security_settings as complete
    if (onboarding?.updateOnboardingStep) {
      try {
        await onboarding.updateOnboardingStep('security_settings');
      } catch (err) {
        console.warn('[SECURITY] Failed to update onboarding:', err);
      }
    }
  };

  const handleReAuthCancel = () => {
    // Route back or close (depends on navigation context)
    window.history.back();
  };

  if (!isVerified) {
    return (
      <ReAuthModal
        isOpen={showReAuthModal}
        email={userEmail}
        onSuccess={handleReAuthSuccess}
        onCancel={handleReAuthCancel}
      />
    );
  }

  const tabs = [
    { id: 'devices', label: '📱 Devices', icon: '📱' },
    { id: 'verification', label: '🔐 Verification Methods', icon: '🔐' },
    { id: 'twofa', label: '🔑 Two-Factor Auth', icon: '🔑' },
    { id: 'password', label: '🔒 Password', icon: '🔒' },
    { id: 'session', label: '⏱️ Session & Privacy', icon: '⏱️' }
  ];

  return (
    <div className="page-safe-area" style={{ padding: '1rem' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ marginTop: 0, marginBottom: '0.5rem' }}>🔐 Security Settings</h1>
          <p style={{ color: '#666', marginBottom: 0 }}>
            Manage your account security, devices, and verification methods.
          </p>
        </div>

        {/* Tab Navigation */}
        <div style={{
          display: 'flex',
          gap: '1rem',
          marginBottom: '2rem',
          borderBottom: '1px solid #e0e0e0',
          overflowX: 'auto',
          paddingBottom: '1rem'
        }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '0.75rem 1rem',
                backgroundColor: activeTab === tab.id ? '#7c63d8' : 'transparent',
                color: activeTab === tab.id ? 'white' : '#333',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: activeTab === tab.id ? 'bold' : 'normal',
                whiteSpace: 'nowrap',
                fontSize: '14px'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div style={{
          backgroundColor: '#f9f9f9',
          padding: '2rem',
          borderRadius: '8px'
        }}>
          {activeTab === 'devices' && (
            <DevicesTab userId={userId} token={token} apiUrl={API_URL} />
          )}
          {activeTab === 'verification' && (
            <VerificationMethodsTab userId={userId} token={token} apiUrl={API_URL} userEmail={userEmail} />
          )}
          {activeTab === 'twofa' && (
            <TwoFactorAuthTab userId={userId} token={token} apiUrl={API_URL} />
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
