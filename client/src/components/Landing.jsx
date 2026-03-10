import React from 'react';
import { useTranslation } from '../context/TranslationContext';
// import { LanguageSwitcher } from './LanguageSwitcher';

/**
 * Landing page — shown to unauthenticated visitors.
 *
 * Scroll / layout strategy (cross-browser):
 *   OUTER div — position:fixed fills the VISIBLE viewport on every mobile
 *     browser (Firefox for Android, Brave, Samsung Internet).
 *     overflow-y:auto + WebkitOverflowScrolling:touch enables scrolling when
 *     content is taller than the screen.  html/body/#root all have
 *     overflow:hidden, so without an explicit scroll container Firefox for
 *     Android clips the landing content on small phones and scrolling is
 *     impossible.
 *   INNER div — minHeight:100% + justify-content:center centres the content
 *     vertically when it fits on screen; when it overflows the inner div grows
 *     past 100% and the outer div scrolls instead.
 */
export function Landing({ onTryFree, onCreateAccount, onSignIn }) {
  const { t } = useTranslation();

  const outerStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    // Use the real visible-viewport height (set by JS in index.jsx) so that
    // Samsung Internet's bottom navigation bar — which sits *inside* the layout
    // viewport — does not overlap the landing-page content.
    // bottom:0 would extend into the toolbar area; height:--real-100vh stops
    // exactly at the top of the toolbar.
    height: 'var(--real-100vh, 100dvh)',
    overflowY: 'auto',
    WebkitOverflowScrolling: 'touch',
    backgroundColor: 'transparent',
    color: 'white',
  };

  const innerStyle = {
    minHeight: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    padding: '2rem',
    /* Extra bottom padding clears the iPhone home indicator and the bottom
       navigation bar on Brave / Samsung Internet. */
    paddingBottom: 'max(2rem, calc(env(safe-area-inset-bottom, 0px) + 2rem))',
    position: 'relative',
  };

  return (
    <div style={outerStyle}>
      <div style={innerStyle}>

        {/* Language switcher — currently disabled
        <div style={{ position: 'absolute', top: '1rem', right: '1rem' }}>
          <LanguageSwitcher compact={true} />
        </div>
        */}

        <div style={{
          maxWidth: '600px',
          animation: 'fadeIn 1s ease-in'
        }}>

          <h1 style={{
            fontSize: '3rem',
            marginBottom: '1rem',
            textShadow: '0 0 20px rgba(100, 150, 255, 0.5)',
            fontWeight: 'bold'
          }}>
            {t('landing.title')}
          </h1>

          <p style={{
            fontSize: '1.2rem',
            marginBottom: '2rem',
            lineHeight: '1.6',
            color: '#b0b0ff'
          }}>
            {t('landing.subtitle')}
          </p>

          <div style={{
            backgroundColor: 'rgba(30, 30, 60, 0.8)',
            padding: '2rem',
            borderRadius: '10px',
            marginBottom: '2rem',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
            border: '1px solid rgba(100, 150, 255, 0.3)'
          }}>
            <p style={{
              fontSize: '1rem',
              marginBottom: '1.5rem',
              color: '#d0d0ff'
            }}>
              {t('landing.description')}
            </p>

            <div style={{
              display: 'flex',
              gap: '1rem',
              flexDirection: 'column'
            }}>
              <button
                onClick={onTryFree}
                style={{
                  padding: '0.85rem 2rem',
                  fontSize: '1.1rem',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#7c63d8',
                  color: 'white',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 15px rgba(124, 99, 216, 0.4)',
                  lineHeight: 1.3,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#9b84e8';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(124, 99, 216, 0.6)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#7c63d8';
                  e.currentTarget.style.boxShadow = '0 4px 15px rgba(124, 99, 216, 0.4)';
                }}
              >
                <span style={{ display: 'block' }}>{t('landing.buttons.tryFree')}</span>
                <span style={{
                  display: 'block',
                  fontSize: '0.75rem',
                  fontWeight: 'normal',
                  opacity: 0.85,
                  marginTop: '0.2rem',
                  letterSpacing: '0.02em',
                }}>
                  {t('landing.buttons.tryFreeSubtitle')}
                </span>
              </button>

              <button
                onClick={onCreateAccount}
                style={{
                  padding: '1rem 2rem',
                  fontSize: '1.1rem',
                  borderRadius: '8px',
                  border: '2px solid #7c63d8',
                  backgroundColor: 'transparent',
                  color: '#7c63d8',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = 'rgba(124, 99, 216, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'transparent';
                }}
              >
                {t('landing.buttons.createAccount')}
              </button>
            </div>
          </div>

          <p style={{
            fontSize: '0.85rem',
            color: '#808080',
            marginTop: '2rem'
          }}>
            {t('landing.footer')}
          </p>

        </div>

        <style>{`
          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}</style>

      </div>
    </div>
  );
}
