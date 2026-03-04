import React, { useEffect, useState } from 'react';

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Returns true when the app is already running as an installed PWA */
function isRunningStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true // iOS Safari
  );
}

/** Returns true on iPhone / iPad */
function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

/**
 * Returns true when the browser is Safari (and NOT Chrome / Firefox / Edge /
 * any other browser that injects their own UA on top of WebKit).
 */
function isIOSSafari() {
  const ua = navigator.userAgent;
  return (
    isIOS() &&
    /safari/i.test(ua) &&
    !/crios|fxios|opios|mercury|edgios|chrome/i.test(ua)
  );
}

const DISMISSED_KEY = 'pwa_install_dismissed';

// ─── Styles ─────────────────────────────────────────────────────────────────

const bannerStyle = {
  position: 'fixed',
  bottom: '16px',
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: 9999,
  width: 'calc(100% - 32px)',
  maxWidth: '480px',
  background: 'rgba(20, 14, 45, 0.88)',
  backdropFilter: 'blur(14px)',
  WebkitBackdropFilter: 'blur(14px)',
  border: '1px solid rgba(102, 126, 234, 0.45)',
  borderRadius: '16px',
  padding: '16px 18px',
  boxShadow: '0 8px 32px rgba(102, 126, 234, 0.25)',
  color: '#e8e0ff',
  fontFamily: 'inherit',
  animation: 'pwa-slide-up 0.4s cubic-bezier(0.22, 1, 0.36, 1) both',
};

const rowStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
};

const iconStyle = {
  fontSize: '28px',
  flexShrink: 0,
  lineHeight: 1,
};

const textWrapStyle = {
  flex: 1,
  minWidth: 0,
};

const titleStyle = {
  margin: 0,
  fontSize: '14px',
  fontWeight: 700,
  color: '#c4b5fd',
  letterSpacing: '0.02em',
};

const subtitleStyle = {
  margin: '3px 0 0',
  fontSize: '13px',
  color: '#b8aed4',
  lineHeight: 1.4,
};

const installBtnStyle = {
  flexShrink: 0,
  padding: '8px 16px',
  borderRadius: '10px',
  border: 'none',
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  color: '#fff',
  fontWeight: 700,
  fontSize: '13px',
  cursor: 'pointer',
  letterSpacing: '0.02em',
  boxShadow: '0 2px 10px rgba(102, 126, 234, 0.45)',
  transition: 'opacity 0.15s',
};

const dismissBtnStyle = {
  position: 'absolute',
  top: '10px',
  right: '12px',
  background: 'transparent',
  border: 'none',
  color: '#8877aa',
  fontSize: '18px',
  cursor: 'pointer',
  lineHeight: 1,
  padding: '2px 4px',
};

const keyframesStyle = `
@keyframes pwa-slide-up {
  from { opacity: 0; transform: translateX(-50%) translateY(24px); }
  to   { opacity: 1; transform: translateX(-50%) translateY(0);    }
}
`;

// ─── Component ───────────────────────────────────────────────────────────────

export default function InstallPromptBanner() {
  const [mode, setMode] = useState(null); // null | 'android' | 'ios'
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    // Never show if already installed
    if (isRunningStandalone()) return;

    // Never show if dismissed in this session
    if (sessionStorage.getItem(DISMISSED_KEY)) return;

    // ── iOS Safari path ────────────────────────────────────────────────────
    if (isIOSSafari()) {
      const timer = setTimeout(() => setMode('ios'), 3000);
      return () => clearTimeout(timer);
    }

    // ── Android / Chrome / Edge path ───────────────────────────────────────
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      const timer = setTimeout(() => setMode('android'), 2000);
      // Store timer cleanup reference on the event object isn't ideal,
      // so we use a local variable captured by closure – if component
      // unmounts the timeout will simply fire into a no-op setState.
      return () => clearTimeout(timer);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // Nothing to show
  if (!mode) return null;

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        await deferredPrompt.userChoice;
      } catch (_) {
        // Ignore – user may have dismissed native dialog
      }
    }
    handleDismiss();
  };

  const handleDismiss = () => {
    sessionStorage.setItem(DISMISSED_KEY, '1');
    setMode(null);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{keyframesStyle}</style>

      <div style={{ ...bannerStyle, position: 'fixed' }} role="banner" aria-label="Install app">
        <button
          style={dismissBtnStyle}
          onClick={handleDismiss}
          aria-label="Dismiss install prompt"
        >
          ✕
        </button>

        <div style={rowStyle}>
          <span style={iconStyle} aria-hidden="true">🔮</span>

          <div style={textWrapStyle}>
            <p style={titleStyle}>Starship Psychics</p>

            {mode === 'ios' ? (
              <p style={subtitleStyle}>
                Tap&nbsp;<strong style={{ color: '#c4b5fd' }}>Share&nbsp;↑</strong> then&nbsp;
                <strong style={{ color: '#c4b5fd' }}>Add to Home&nbsp;Screen</strong> to install
              </p>
            ) : (
              <p style={subtitleStyle}>Install the app for a better experience</p>
            )}
          </div>

          {mode === 'android' && (
            <button
              style={installBtnStyle}
              onClick={handleInstallClick}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >
              Install
            </button>
          )}
        </div>
      </div>
    </>
  );
}
