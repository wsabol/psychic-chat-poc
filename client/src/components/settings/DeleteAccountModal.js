import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../context/TranslationContext';
import { getAuth, sendEmailVerification } from 'firebase/auth';

/**
 * DeleteAccountModal - Modal for confirming account deletion
 * 
 * Requires email verification before account can be deleted
 */
export default function DeleteAccountModal({ isOpen, userEmail, onConfirm, onCancel, isLoading }) {
  const { t } = useTranslation();
  const [step, setStep] = useState('confirm'); // 'confirm' or 'verify'
  const [verificationCode, setVerificationCode] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const [error, setError] = useState('');

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  const handleSendVerification = async () => {
    setError('');
    
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (user) {
        // Send Firebase verification email
        await sendEmailVerification(user);
        
        // Also notify backend to send verification email
        await fetch(`${API_URL}/api/user/send-delete-verification`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: userEmail,
          }),
        });
        
        setStep('verify');
        setResendTimer(60); // 60 second cooldown
      }
    } catch (err) {
      console.error('Error sending verification:', err);
      setError('Failed to send verification email. Please try again.');
    }
  };

  const handleResendCode = async () => {
    if (resendTimer > 0) return;
    await handleSendVerification();
  };

  const handleConfirmDelete = () => {
    if (!verificationCode.trim()) {
      setError('Please enter the verification code');
      return;
    }
    onConfirm(verificationCode);
  };

  if (!isOpen) return null;

  // Modal overlay
  const modalOverlay = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2000,
  };

  const modalContent = {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '2rem',
    maxWidth: '450px',
    width: '90%',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
    maxHeight: '90vh',
    overflowY: 'auto',
  };

  return (
    <div style={modalOverlay} onClick={onCancel}>
      <div style={modalContent} onClick={(e) => e.stopPropagation()}>
        {step === 'confirm' ? (
          <>
            {/* Warning Header */}
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '48px', marginBottom: '0.5rem' }}>⚠️</div>
              <h2 style={{ margin: '0.5rem 0', fontSize: '20px', color: '#d32f2f' }}>
                {t('settings.deleteAccount')}
              </h2>
              <p style={{ color: '#666', marginTop: '0.5rem', fontSize: '13px' }}>
                {t('settings.deleteAccountWarning')}
              </p>
            </div>

            {/* Warning Message */}
            <div
              style={{
                backgroundColor: '#ffebee',
                border: '1px solid #ef5350',
                borderRadius: '6px',
                padding: '1rem',
                marginBottom: '1.5rem',
                fontSize: '13px',
                color: '#c62828',
              }}
            >
              <strong>Important:</strong> {t('settings.privacyConsent')}
            </div>

            {/* Confirmation Details */}
            <div style={{ marginBottom: '1.5rem' }}>
              <p style={{ fontSize: '13px', color: '#333', marginBottom: '0.5rem' }}>
                <strong>Email:</strong> {userEmail}
              </p>
              <p style={{ fontSize: '13px', color: '#666' }}>
                {t('settings.deleteAccountEmail')}
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div
                style={{
                  backgroundColor: '#ffebee',
                  border: '1px solid #ef5350',
                  borderRadius: '6px',
                  padding: '0.75rem',
                  marginBottom: '1rem',
                  fontSize: '12px',
                  color: '#c62828',
                }}
              >
                {error}
              </div>
            )}

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={onCancel}
                disabled={isLoading}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  backgroundColor: '#e0e0e0',
                  color: '#333',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  opacity: isLoading ? 0.6 : 1,
                }}
              >
                {t('settings.deleteAccountCancel')}
              </button>
              <button
                onClick={handleSendVerification}
                disabled={isLoading}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  backgroundColor: '#d32f2f',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  opacity: isLoading ? 0.6 : 1,
                }}
              >
                {isLoading ? t('settings.deletingAccount') : 'Continue'}
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Verification Header */}
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '40px', marginBottom: '0.5rem' }}>📧</div>
              <h2 style={{ margin: '0.5rem 0', fontSize: '18px' }}>Verify Your Email</h2>
              <p style={{ color: '#666', marginTop: '0.5rem', fontSize: '13px' }}>
                We've sent a verification code to {userEmail}
              </p>
            </div>

            {/* Verification Code Input */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                Verification Code
              </label>
              <input
                type="text"
                value={verificationCode}
                onChange={(e) => {
                  setVerificationCode(e.target.value.toUpperCase());
                  setError('');
                }}
                placeholder="Enter 6-digit code"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  fontSize: '13px',
                  border: error ? '2px solid #d32f2f' : '1px solid #ccc',
                  borderRadius: '4px',
                  boxSizing: 'border-box',
                  fontFamily: 'monospace',
                  letterSpacing: '2px',
                }}
              />
            </div>

            {/* Resend Code */}
            <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
              {resendTimer > 0 ? (
                <p style={{ fontSize: '12px', color: '#666', margin: 0 }}>
                  Resend code in {resendTimer}s
                </p>
              ) : (
                <button
                  onClick={handleResendCode}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#7c63d8',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    textDecoration: 'underline',
                  }}
                >
                  Resend Code
                </button>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div
                style={{
                  backgroundColor: '#ffebee',
                  border: '1px solid #ef5350',
                  borderRadius: '6px',
                  padding: '0.75rem',
                  marginBottom: '1rem',
                  fontSize: '12px',
                  color: '#c62828',
                }}
              >
                {error}
              </div>
            )}

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={() => {
                  setStep('confirm');
                  setVerificationCode('');
                  setError('');
                }}
                disabled={isLoading}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  backgroundColor: '#e0e0e0',
                  color: '#333',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  opacity: isLoading ? 0.6 : 1,
                }}
              >
                Back
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isLoading || !verificationCode.trim()}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  backgroundColor: '#d32f2f',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: isLoading || !verificationCode.trim() ? 'not-allowed' : 'pointer',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  opacity: isLoading || !verificationCode.trim() ? 0.6 : 1,
                }}
              >
                {isLoading ? t('settings.deletingAccount') : t('settings.deleteAccountConfirm')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
