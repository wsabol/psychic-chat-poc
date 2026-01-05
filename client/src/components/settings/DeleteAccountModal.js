import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../context/TranslationContext';
import { getAuth } from 'firebase/auth';

/**
 * DeleteAccountModal - Modal for confirming account deletion
 * 
 * Features:
 * - Three-step verification process:
 *   1. Initial confirmation (warn about deletion)
 *   2. Email verification with 6-digit code
 *   3. Final confirmation ("We don't want to see you go" message)
 * - Resend code functionality with 60-second cooldown
 * - Fully translated UI supporting 8 languages
 * 
 * Translation keys used:
 * - settings.deleteAccount* (initial confirmation)
 * - settings.verifyEmail, settings.verificationCode* (email verification)
 * - settings.finalConfirmation* (final confirmation before deletion)
 */

// Constants
const STEPS = {
  INITIAL: 'initial',
  VERIFY: 'verify',
  FINAL: 'final'
};

const RESEND_COOLDOWN = 60; // seconds

// Style constants
const STYLES = {
  modalOverlay: {
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
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '2rem',
    maxWidth: '450px',
    width: '90%',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
    maxHeight: '90vh',
    overflowY: 'auto',
  },
  headerContainer: {
    textAlign: 'center',
    marginBottom: '1.5rem',
  },
  headerIcon: {
    fontSize: '48px',
    marginBottom: '0.5rem',
  },
  headerTitle: {
    margin: '0.5rem 0',
    fontSize: '20px',
    color: '#d32f2f',
  },
  headerTitleWarning: {
    margin: '0.5rem 0',
    fontSize: '20px',
    color: '#ff9800',
  },
  headerSubtitle: {
    color: '#666',
    marginTop: '0.5rem',
    fontSize: '13px',
  },
  warningBox: {
    backgroundColor: '#ffebee',
    border: '1px solid #ef5350',
    borderRadius: '6px',
    padding: '1rem',
    marginBottom: '1.5rem',
    fontSize: '13px',
    color: '#c62828',
  },
  errorBox: {
    backgroundColor: '#ffebee',
    border: '1px solid #ef5350',
    borderRadius: '6px',
    padding: '0.75rem',
    marginBottom: '1rem',
    fontSize: '12px',
    color: '#c62828',
  },
  detailsContainer: {
    marginBottom: '1.5rem',
  },
  detailText: {
    fontSize: '13px',
    color: '#333',
    marginBottom: '0.5rem',
  },
  detailSubtext: {
    fontSize: '13px',
    color: '#666',
  },
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: 'bold',
    marginBottom: '0.5rem',
  },
  input: {
    width: '100%',
    padding: '0.75rem',
    fontSize: '13px',
    border: '1px solid #ccc',
    borderRadius: '4px',
    boxSizing: 'border-box',
    fontFamily: 'monospace',
    letterSpacing: '2px',
  },
  inputError: {
    border: '2px solid #d32f2f',
  },
  resendContainer: {
    marginBottom: '1.5rem',
    textAlign: 'center',
  },
  resendTimer: {
    fontSize: '12px',
    color: '#666',
    margin: 0,
  },
  resendButton: {
    background: 'none',
    border: 'none',
    color: '#7c63d8',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 'bold',
    textDecoration: 'underline',
  },
  buttonGroup: {
    display: 'flex',
    gap: '0.75rem',
  },
  buttonBase: {
    flex: 1,
    padding: '0.75rem',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 'bold',
    transition: 'opacity 0.2s',
  },
  cancelButton: {
    backgroundColor: '#e0e0e0',
    color: '#333',
  },
  deleteButton: {
    backgroundColor: '#d32f2f',
    color: 'white',
  },
  buttonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  infoBox: {
    backgroundColor: '#fff3cd',
    border: '1px solid #ffc107',
    borderRadius: '6px',
    padding: '1rem',
    marginBottom: '1.5rem',
    fontSize: '13px',
    color: '#856404',
    lineHeight: '1.5',
  },
};

export default function DeleteAccountModal({ isOpen, userEmail, onConfirm, onCancel, isLoading }) {
  const { t } = useTranslation();
  const [step, setStep] = useState(STEPS.INITIAL);
  const [verificationCode, setVerificationCode] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const [error, setError] = useState('');

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

  // Handle resend timer countdown
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
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('Not authenticated');
      
      const response = await fetch(`${API_URL}/user/send-delete-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ email: userEmail }),
      });
      
      if (!response.ok) {
        let errorMsg = 'Failed to send verification code';
        try {
          const errorData = await response.json();
          console.error('[DELETE] API Error:', errorData);
          errorMsg = errorData.error || errorData.message || errorMsg;
        } catch (e) {
          console.error('[DELETE] Response status:', response.status, response.statusText);
        }
        throw new Error(errorMsg);
      }
      
      setStep(STEPS.VERIFY);
      setResendTimer(RESEND_COOLDOWN);
    } catch (err) {
      console.error('Error sending verification:', err);
      setError(t('settings.verificationCodeError'));
    }
  };

  const handleResendCode = async () => {
    if (resendTimer > 0) return;
    await handleSendVerification();
  };

  const handleVerifyCode = () => {
    if (!verificationCode.trim()) {
      setError(t('settings.verificationCodeRequired'));
      return;
    }
    setError('');
    setStep(STEPS.FINAL);
  };

  const handleFinalDelete = () => {
    if (!verificationCode.trim()) {
      setError(t('settings.verificationCodeRequired'));
      return;
    }
    onConfirm(verificationCode);
  };

  const handleBackStep = () => {
    if (step === STEPS.FINAL) {
      setStep(STEPS.VERIFY);
    } else if (step === STEPS.VERIFY) {
      setStep(STEPS.INITIAL);
      setVerificationCode('');
    }
    setError('');
  };

  if (!isOpen) return null;

  return (
    <div style={STYLES.modalOverlay} onClick={onCancel}>
      <div style={STYLES.modalContent} onClick={(e) => e.stopPropagation()}>
        {step === STEPS.INITIAL && renderInitialStep()}
        {step === STEPS.VERIFY && renderVerifyStep()}
        {step === STEPS.FINAL && renderFinalStep()}
      </div>
    </div>
  );

  function renderInitialStep() {
    return (
      <>
        <div style={STYLES.headerContainer}>
          <div style={STYLES.headerIcon}>⚠️</div>
          <h2 style={STYLES.headerTitle}>{t('settings.deleteAccount')}</h2>
          <p style={STYLES.headerSubtitle}>{t('settings.deleteAccountWarning')}</p>
        </div>

        <div style={STYLES.warningBox}>
          <strong>Important:</strong> {t('settings.privacyConsent')}
        </div>

        <div style={STYLES.detailsContainer}>
          <p style={STYLES.detailText}>
            <strong>{t('personalInfo.email')}:</strong> {userEmail}
          </p>
          <p style={STYLES.detailSubtext}>{t('settings.deleteAccountEmail')}</p>
        </div>

        {error && <div style={STYLES.errorBox}>{error}</div>}

        <div style={STYLES.buttonGroup}>
          <button onClick={onCancel} disabled={isLoading} style={{...STYLES.buttonBase, ...STYLES.cancelButton, ...(isLoading && STYLES.buttonDisabled)}}>
            {t('settings.deleteAccountCancel')}
          </button>
          <button onClick={handleSendVerification} disabled={isLoading} style={{...STYLES.buttonBase, ...STYLES.deleteButton, ...(isLoading && STYLES.buttonDisabled)}}>
            {isLoading ? t('settings.sendingCode') : t('settings.continue')}
          </button>
        </div>
      </>
    );
  }

  function renderVerifyStep() {
    return (
      <>
        <div style={STYLES.headerContainer}>
          <div style={{ ...STYLES.headerIcon, fontSize: '40px' }}>📧</div>
          <h2 style={{ ...STYLES.headerTitle, color: '#333' }}>{t('settings.verifyEmail')}</h2>
          <p style={STYLES.headerSubtitle}>{t('settings.verificationCodeSent', { email: userEmail })}</p>
        </div>

        <div style={STYLES.detailsContainer}>
          <label style={STYLES.label}>{t('settings.verificationCode')}</label>
          <input
            type="text"
            value={verificationCode}
            onChange={(e) => {
              setVerificationCode(e.target.value.toUpperCase());
              setError('');
            }}
            placeholder={t('settings.verificationCodePlaceholder')}
            maxLength="6"
            style={{ ...STYLES.input, ...(error && STYLES.inputError), textAlign: 'center', fontSize: '18px' }}
          />
        </div>

        <div style={STYLES.resendContainer}>
          {resendTimer > 0 ? (
            <p style={STYLES.resendTimer}>{t('settings.resendCodeTimer', { seconds: resendTimer })}</p>
          ) : (
            <button onClick={handleResendCode} style={STYLES.resendButton}>{t('settings.resendCode')}</button>
          )}
        </div>

        {error && <div style={STYLES.errorBox}>{error}</div>}

        <div style={STYLES.buttonGroup}>
          <button onClick={handleBackStep} disabled={isLoading} style={{...STYLES.buttonBase, ...STYLES.cancelButton, ...(isLoading && STYLES.buttonDisabled)}}>
            {t('settings.back')}
          </button>
          <button onClick={handleVerifyCode} disabled={isLoading || !verificationCode.trim()} style={{...STYLES.buttonBase, ...STYLES.deleteButton, ...(isLoading || !verificationCode.trim()) && STYLES.buttonDisabled}}>
            {isLoading ? t('settings.verifying') : t('settings.verifyCode')}
          </button>
        </div>
      </>
    );
  }

  function renderFinalStep() {
    return (
      <>
        <div style={STYLES.headerContainer}>
          <div style={{ ...STYLES.headerIcon, fontSize: '48px' }}>💔</div>
          <h2 style={STYLES.headerTitleWarning}>{t('settings.weWishYouWouldStay')}</h2>
          <p style={STYLES.headerSubtitle}>{t('settings.deleteAccountFinalWarning')}</p>
        </div>

        <div style={STYLES.infoBox}>{t('settings.deleteAccountFinalMessage')}</div>

        <div style={STYLES.detailsContainer}>
          <p style={{ ...STYLES.detailText, fontWeight: 'bold', marginBottom: '1rem' }}>{t('settings.willBeDeleted')}:</p>
          <ul style={{ margin: '0 0 1rem 1rem', fontSize: '12px', color: '#666' }}>
            <li>{t('settings.deleteAccountData')}</li>
            <li>{t('settings.deletePaymentInfo')}</li>
            <li>{t('settings.deleteReadingHistory')}</li>
            <li>{t('settings.cannotUndo')}</li>
          </ul>
        </div>

        {error && <div style={STYLES.errorBox}>{error}</div>}

        <div style={STYLES.buttonGroup}>
          <button onClick={handleBackStep} disabled={isLoading} style={{...STYLES.buttonBase, ...STYLES.cancelButton, ...(isLoading && STYLES.buttonDisabled)}}>
            {t('settings.goBack')}
          </button>
          <button onClick={handleFinalDelete} disabled={isLoading} style={{...STYLES.buttonBase, ...STYLES.deleteButton, ...(isLoading && STYLES.buttonDisabled)}}>
            {isLoading ? t('settings.deletingAccount') : t('settings.permanentlyDelete')}
          </button>
        </div>
      </>
    );
  }
}
