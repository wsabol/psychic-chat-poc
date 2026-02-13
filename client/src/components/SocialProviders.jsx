import React from 'react';
import { 
  signInWithPopup, 
  GoogleAuthProvider,
  FacebookAuthProvider
} from 'firebase/auth';
import { auth } from '../firebase';
import { useTranslation } from '../context/TranslationContext';

/**
 * SocialProviders Component
 * Displays social login provider icons (Google and Facebook)
 * Handles authentication with Firebase Auth providers
 */
export function SocialProviders({ 
  mode = 'login',
  termsAccepted = false,
  privacyAccepted = false,
  loading = false,
  setLoading,
  setError
}) {
  const { t } = useTranslation();

  const handleProviderLogin = async (providerType) => {
    // DISABLED: Facebook login not yet configured
    if (providerType === 'facebook') {
      setError('Facebook login is not yet available. Please use Google or email/password.');
      return;
    }
    
    // On register mode, check terms/privacy acceptance
    if (mode === 'register') {
      if (!termsAccepted || !privacyAccepted) {
        setError(t('login.acceptTermsAndPrivacy'));
        return;
      }
      
      // Store consent acceptance in sessionStorage for AuthContext to retrieve
      // This ensures consents are saved to database after Firebase creates the account
      sessionStorage.setItem('pendingConsent', JSON.stringify({
        termsAccepted,
        privacyAccepted,
        timestamp: Date.now()
      }));
    }

    setLoading(true);
    setError('');

    let provider;
    try {
      switch (providerType) {
        case 'google':
          provider = new GoogleAuthProvider();
          break;
        case 'facebook':
          provider = new FacebookAuthProvider();
          break;
        default:
          throw new Error('Unknown provider');
      }

      await signInWithPopup(auth, provider);
    } catch (err) {
      if (err.code === 'auth/popup-closed-by-user') {
        setError(t('login.popupClosed'));
      } else if (err.code === 'auth/account-exists-with-different-credential') {
        setError(t('login.accountExistsWithDifferentCredential'));
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  // Only show providers that are properly configured
  // Apple requires Apple Developer account credentials
  // Amazon requires custom Cognito setup
  const providers = [
    {
      id: 'facebook',
      name: 'Facebook',
      icon: (
        <svg viewBox="0 0 24 24" style={{ width: '24px', height: '24px' }}>
          <path fill="currentColor" d="M12 2.04C6.5 2.04 2 6.53 2 12.06C2 17.06 5.66 21.21 10.44 21.96V14.96H7.9V12.06H10.44V9.85C10.44 7.34 11.93 5.96 14.22 5.96C15.31 5.96 16.45 6.15 16.45 6.15V8.62H15.19C13.95 8.62 13.56 9.39 13.56 10.18V12.06H16.34L15.89 14.96H13.56V21.96A10 10 0 0 0 22 12.06C22 6.53 17.5 2.04 12 2.04Z"/>
        </svg>
      ),
      color: '#FFFFFF',
      bgColor: '#1877F2'
    },
    {
      id: 'google',
      name: 'Google',
      icon: (
        <svg viewBox="0 0 24 24" style={{ width: '24px', height: '24px' }}>
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
      ),
      color: '#757575',
      bgColor: '#FFFFFF'
    }
  ];

  const isDisabled = loading || (mode === 'register' && (!termsAccepted || !privacyAccepted));

  return (
    <div>
      {/* Divider */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        margin: '1.5rem 0',
        gap: '1rem'
      }}>
        <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(255,255,255,0.2)' }} />
        <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem' }}>
          {t('login.continueWith')}
        </span>
        <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(255,255,255,0.2)' }} />
      </div>

      {/* Provider Icons */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '1rem',
        flexWrap: 'wrap'
      }}>
      {providers.map((provider) => {
          const isFacebookDisabled = provider.id === 'facebook';
          const isButtonDisabled = isDisabled || isFacebookDisabled;
          
          return (
            <button
              key={provider.id}
              onClick={() => handleProviderLogin(provider.id)}
              disabled={isButtonDisabled}
              title={isFacebookDisabled ? 'Facebook login not yet available' : `${mode === 'register' ? t('login.signUpWith') : t('login.signInWith')} ${provider.name}`}
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '12px',
                border: '2px solid rgba(255,255,255,0.1)',
                backgroundColor: isButtonDisabled ? '#666' : provider.bgColor,
                color: provider.color,
                cursor: isButtonDisabled ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s',
                opacity: isButtonDisabled ? 0.5 : 1,
                boxShadow: isButtonDisabled ? 'none' : '0 2px 8px rgba(0,0,0,0.2)'
              }}
              onMouseEnter={(e) => {
                if (!isButtonDisabled) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isButtonDisabled) {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
                }
              }}
            >
              {provider.icon}
            </button>
          );
        })}
      </div>

      {/* Helper text for register mode */}
      {mode === 'register' && (!termsAccepted || !privacyAccepted) && (
        <p style={{
          textAlign: 'center',
          fontSize: '0.75rem',
          color: 'rgba(255,255,255,0.6)',
          marginTop: '0.75rem',
          fontStyle: 'italic'
        }}>
          {t('login.acceptTermsToUseSocial')}
        </p>
      )}
    </div>
  );
}

export default SocialProviders;
