import React from 'react';
import { useTranslation } from '../../context/TranslationContext';
import { useReAuth } from './hooks/useReAuth';
import { usePasswordReset } from './hooks/usePasswordReset';
import { StatusMessage } from './components/StatusMessage';
import { EmailDisplay } from './components/EmailDisplay';
import { GoogleAuthButton } from './components/GoogleAuthButton';
import { FacebookAuthButton } from './components/FacebookAuthButton';
import { AppleAuthButton } from './components/AppleAuthButton';
import { PasswordAuthForm } from './components/PasswordAuthForm';
import { PasswordResetView } from './components/PasswordResetView';
import styles from './ReAuthModal.module.css';

/**
 * ReAuthModal - Re-authenticate user before accessing security settings
 * Refactored version: Modular components, custom hooks, CSS modules
 * Reduced from 400+ lines to ~100 lines by extracting concerns
 */
function ReAuthModal({ isOpen, email, onSuccess, onCancel, onFailure }) {
  const { t } = useTranslation();
  
  // Custom hooks for re-authentication and password reset
  const {
    password,
    setPassword,
    showPassword,
    setShowPassword,
    error: authError,
    loading: authLoading,
    handleGoogleReAuth,
    handleFacebookReAuth,
    handleAppleReAuth,
    handlePasswordReAuth,
    hasGoogle,
    hasFacebook,
    hasApple,
    hasPassword,
  } = useReAuth(email, onSuccess, onFailure, t);

  const {
    showPasswordReset,
    setShowPasswordReset,
    resetSent,
    error: resetError,
    loading: resetLoading,
    handlePasswordReset,
  } = usePasswordReset(email, t);

  // Combine loading states
  const loading = authLoading || resetLoading;
  const error = authError || resetError;
  const success = resetSent ? t('security.reauth.successResetSent') : null;

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContainer}>
        {/* Header */}
        <h2 className={styles.modalTitle}>{t('security.reauth.title')}</h2>
        <p className={styles.modalSubtitle}>
          {t('security.reauth.subtitle')}
        </p>

        {/* Status Messages */}
        <StatusMessage error={error} success={success} />

        {/* Email Display */}
        <EmailDisplay email={email} t={t} />

        {/* Password Reset View or Main Auth View */}
        {showPasswordReset ? (
          <PasswordResetView
            loading={loading}
            onSendReset={handlePasswordReset}
            onBack={() => setShowPasswordReset(false)}
            t={t}
          />
        ) : (
          <>
            {/* Social Provider Buttons
                isLinked reflects whether the user signed up with that provider.
                Buttons for providers the user hasn't linked are greyed out and
                cannot be clicked. */}
            <div className={styles.socialButtonsContainer}>
              <FacebookAuthButton
                loading={loading}
                onFacebookReAuth={handleFacebookReAuth}
                t={t}
                isLinked={hasFacebook}
              />
              <GoogleAuthButton
                loading={loading}
                onGoogleReAuth={handleGoogleReAuth}
                t={t}
                isLinked={hasGoogle}
              />
              <AppleAuthButton
                loading={loading}
                onAppleReAuth={handleAppleReAuth}
                t={t}
                isLinked={hasApple}
              />
            </div>

            {/* Divider */}
            <div className={styles.divider}>
              <div className={styles.dividerLine} />
              <span className={styles.dividerText}>{t('security.reauth.orDivider')}</span>
              <div className={styles.dividerLine} />
            </div>

            {/* Password Authentication Form
                Greyed out if the user's account uses a social provider only. */}
            <PasswordAuthForm
              password={password}
              setPassword={setPassword}
              showPassword={showPassword}
              setShowPassword={setShowPassword}
              loading={loading}
              onSubmit={handlePasswordReAuth}
              onForgotPassword={() => setShowPasswordReset(true)}
              t={t}
              isLinked={hasPassword}
            />

            {/* Cancel Button */}
            <div className={styles.buttonGroup}>
              <button
                onClick={onCancel}
                disabled={loading}
                className={styles.secondaryButton}
              >
                {t('security.reauth.cancel')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default ReAuthModal;
