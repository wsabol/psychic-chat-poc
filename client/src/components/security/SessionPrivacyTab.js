import React, { useState, useCallback, useEffect } from 'react';
import { useTranslation } from '../../context/TranslationContext';
import { logErrorFromCatch } from '../../shared/errorLogger.js';
import { fetchWithTokenRefresh } from '../../utils/fetchWithTokenRefresh';

/**
 * SessionPrivacyTab - Manage "Stay Logged In" preference
 * Reads/writes from: user_2fa_settings.persistent_session
 */
export default function SessionPrivacyTab({ userId, token, apiUrl }) {
  const { t } = useTranslation();
  const [persistentSession, setPersistentSession] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const loadSessionPreference = useCallback(async () => {
    try {
      setLoading(true);
      // Use the dedicated session-preference endpoint — lighter than the full
      // 2fa-settings response and avoids an unnecessary join with 2FA data.
      //
      // fetchWithTokenRefresh is used instead of plain fetch so that an expired
      // Firebase ID token is transparently refreshed and the request retried.
      // This prevents the "loading flashes forever" bug in production where:
      //   1. A plain fetch with a stale token would get a 401/403
      //   2. The 401 would trigger an auth-state refresh in useAuth
      //   3. The new token prop would recreate this callback (token was a dep)
      //   4. The useEffect would re-fire → setLoading(true) → repeat (loop)
      //
      // By using fetchWithTokenRefresh the token is refreshed internally on
      // 401/403 without updating the token prop, so no re-fetch loop occurs.
      //
      // NOTE: `token` is intentionally NOT in the dependency array.
      // fetchWithTokenRefresh fetches a fresh token from Firebase automatically
      // when the initial one is stale, so the callback only needs to be created
      // once per (apiUrl, userId) combination.
      const response = await fetchWithTokenRefresh(
        `${apiUrl}/security/session-preference/${userId}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      if (response.ok) {
        const data = await response.json();
        setPersistentSession(data.persistent_session || false);
      } else {
        // Non-ok response (e.g. 500) that wasn't a token issue
        setError('security.session.errorLoading');
      }
    } catch (err) {
      logErrorFromCatch('[SESSION] Error loading preference:', err);
      // Store the translation key; the rendered output resolves it via t()
      // so that `t` does NOT need to be in this callback's dep array.
      setError('security.session.errorLoading');
    } finally {
      setLoading(false);
    }
    // NOTE: `token` intentionally omitted — fetchWithTokenRefresh handles
    // token refresh internally, so changing the token prop must NOT re-trigger
    // a data fetch (that was the root cause of the production loading loop).
    // `t` is also omitted — it is a UI lookup helper, not a data dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiUrl, userId]);

  useEffect(() => {
    loadSessionPreference();
  }, [loadSessionPreference]);

  const handleTogglePersistentSession = async () => {
    try {
      setSaving(true);
      setError(null);

      const newValue = !persistentSession;

      const response = await fetchWithTokenRefresh(`${apiUrl}/security/session-preference/${userId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ persistentSession: newValue })
      });

      if (response.ok) {
        const data = await response.json();
        setPersistentSession(newValue);
        setSuccess(data.message);
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const err = await response.json();
        setError(err.error || t('security.session.errorSaving'));
      }
    } catch (err) {
      setError(t('security.session.errorSaving'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '2rem' }}>{t('security.session.loading')}</div>;
  }

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>{t('security.session.title')}</h2>
      <p style={{ color: '#666' }}>
        {t('security.session.subtitle')}
      </p>

      {error && (
        <div style={{
          backgroundColor: '#ffebee',
          color: '#d32f2f',
          padding: '1rem',
          borderRadius: '4px',
          marginBottom: '1rem'
        }}>
          {/* t(error) translates when error is a key; returns as-is for raw server messages */}
          {t(error)}
        </div>
      )}

      {success && (
        <div style={{
          backgroundColor: '#e8f5e9',
          color: '#2e7d32',
          padding: '1rem',
          borderRadius: '4px',
          marginBottom: '1rem'
        }}>
          ✓ {success}
        </div>
      )}

      <div style={{
        backgroundColor: 'white',
        padding: '2rem',
        borderRadius: '8px',
        border: '1px solid #e0e0e0'
      }}>
        <h3 style={{ marginTop: 0 }}>Stay Logged In</h3>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.5rem'
        }}>
          <div>
            <p style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>
              {persistentSession ? t('security.session.statusOn') : t('security.session.statusOff')}
            </p>
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '14px', color: '#666' }}>
              {persistentSession ? t('security.session.statusLoggedInDays') : t('security.session.statusLogoutOnClose')}
            </p>
          </div>

          {/* Toggle Switch */}
          <button
            onClick={handleTogglePersistentSession}
            disabled={saving}
            style={{
              width: '60px',
              height: '34px',
              borderRadius: '17px',
              border: 'none',
              backgroundColor: persistentSession ? '#4caf50' : '#ccc',
              cursor: saving ? 'not-allowed' : 'pointer',
              position: 'relative',
              transition: 'background-color 0.3s ease',
              padding: 0,
              outline: 'none'
            }}
            title={t('security.session.toggleTooltip')}
          >
            <div style={{
              position: 'absolute',
              top: '2px',
              left: persistentSession ? '32px' : '2px',
              width: '30px',
              height: '30px',
              borderRadius: '50%',
              backgroundColor: 'white',
              transition: 'left 0.3s ease',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }} />
          </button>
        </div>

        {persistentSession ? (
          <div style={{
            backgroundColor: '#e8f5e9',
            borderLeft: '4px solid #4caf50',
            padding: '1rem',
            borderRadius: '4px',
            marginBottom: '1.5rem'
          }}>
            <p style={{ margin: 0, fontSize: '14px', color: '#2e7d32' }}>
              {t('security.session.warningOn')}
            </p>
          </div>
        ) : (
          <div style={{
            backgroundColor: '#fff3e0',
            borderLeft: '4px solid #ff9800',
            padding: '1rem',
            borderRadius: '4px',
            marginBottom: '1.5rem'
          }}>
            <p style={{ margin: 0, fontSize: '14px', color: '#e65100' }}>
              {t('security.session.warningOff')}
            </p>
          </div>
        )}

        <div style={{
          backgroundColor: '#f5f5f5',
          padding: '1rem',
          borderRadius: '4px',
          marginBottom: '1rem'
        }}>
          <p style={{ margin: '0 0 0.5rem 0', fontSize: '13px', fontWeight: 'bold', color: '#333' }}>
            {t('security.session.recommendationHeader')}
          </p>
          <ul style={{ margin: 0, paddingLeft: '1.5rem', fontSize: '13px', color: '#666' }}>
            <li style={{ marginBottom: '0.5rem' }}>
              {t('security.session.recommendationPersonal')}
            </li>
            <li style={{ marginBottom: '0.5rem' }}>
              {t('security.session.recommendationPublic')}
            </li>
            <li>
              {t('security.session.recommendationExpiry')}
            </li>
          </ul>
        </div>

        {saving && <p style={{ color: '#999', fontSize: '13px', marginTop: '1rem' }}>{t('security.session.saving')}</p>}
      </div>
    </div>
  );
}
