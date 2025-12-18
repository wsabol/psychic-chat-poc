import React, { useState, useCallback, useEffect } from 'react';

/**
 * TwoFactorAuthTab - Manage 2FA on/off and method selection
 * Reads/writes from: user_2fa_settings table
 * 
 * CRITICAL: When user toggles 2FA OFF here, login flow automatically bypasses 2FA
 * because /check-2fa/:userId endpoint reads user_2fa_settings.enabled
 */
export default function TwoFactorAuthTab({ userId, token, apiUrl }) {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Form state
  const [enabled, setEnabled] = useState(true);
  const [method, setMethod] = useState('email');

  const loadTwoFASettings = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${apiUrl}/security/2fa-settings/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setSettings(data.settings);
        setEnabled(data.settings.enabled);
        setMethod(data.settings.method || 'email');
      }
    } catch (err) {
      console.error('[2FA] Error loading settings:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [apiUrl, userId, token]);

  useEffect(() => {
    loadTwoFASettings();
  }, [loadTwoFASettings]);

  const handleSaveTwoFA = async () => {
    try {
      setSaving(true);
      setError(null);

      const response = await fetch(`${apiUrl}/security/2fa-settings/${userId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ enabled, method })
      });

      if (response.ok) {
        const data = await response.json();
        setSettings(data.settings);
        setSuccess(data.message || '2FA settings updated');
        setEditMode(false);
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const err = await response.json();
        setError(err.error || 'Failed to save settings');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '2rem' }}>Loading 2FA settings...</div>;
  }

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Two-Factor Authentication</h2>

      {error && (
        <div style={{
          backgroundColor: '#ffebee',
          color: '#d32f2f',
          padding: '1rem',
          borderRadius: '4px',
          marginBottom: '1rem'
        }}>
          {error}
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

      {!editMode ? (
        <div>
          {/* Status Card */}
          <div style={{
            backgroundColor: enabled ? '#e8f5e9' : '#fff3e0',
            border: `2px solid ${enabled ? '#4caf50' : '#ff9800'}`,
            padding: '1.5rem',
            borderRadius: '8px',
            marginBottom: '1.5rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0 }}>Status</h3>
              <span style={{
                display: 'inline-block',
                backgroundColor: enabled ? '#4caf50' : '#ff9800',
                color: 'white',
                padding: '0.5rem 1rem',
                borderRadius: '20px',
                fontSize: '14px',
                fontWeight: 'bold'
              }}>
                {enabled ? '✓ Enabled' : '⚠️ Disabled'}
              </span>
            </div>

            {!enabled && (
              <div style={{
                backgroundColor: '#fff9c4',
                borderLeft: '4px solid #ff9800',
                padding: '1rem',
                borderRadius: '4px',
                marginBottom: '1rem'
              }}>
                <p style={{ margin: '0 0 0.5rem 0', fontWeight: 'bold', color: '#f57f17' }}>
                  ⚠️ 2FA is Recommended
                </p>
                <p style={{ margin: 0, fontSize: '14px', color: '#333' }}>
                  Two-factor authentication adds an extra layer of security to your account. We recommend enabling it.
                </p>
              </div>
            )}

            {enabled && (
              <div style={{ marginTop: '1rem' }}>
                <p style={{ margin: '0.5rem 0', fontSize: '14px' }}>
                  <strong>Method:</strong> {method === 'sms' ? 'Text Message (SMS)' : 'Email'}
                </p>
              </div>
            )}
          </div>

          <p style={{ color: '#666', lineHeight: '1.6', marginBottom: '1.5rem' }}>
            Two-factor authentication requires you to enter a code sent to your phone or email in addition to your password when logging in. This significantly increases your account security.
          </p>

          <button
            onClick={() => setEditMode(true)}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#7c63d8',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            ⚙️ {enabled ? 'Change Settings' : 'Enable 2FA'}
          </button>
        </div>
      ) : (
        <div style={{
          backgroundColor: 'white',
          padding: '1.5rem',
          borderRadius: '8px',
          border: '1px solid #e0e0e0'
        }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              cursor: 'pointer',
              fontSize: '16px'
            }}>
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                disabled={saving}
                style={{ cursor: 'pointer', width: '18px', height: '18px' }}
              />
              <span>Enable Two-Factor Authentication</span>
            </label>
          </div>

          {enabled && (
            <>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '1rem', fontWeight: 'bold', fontSize: '15px' }}>
                  Authentication Method
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    cursor: 'pointer'
                  }}>
                    <input
                      type="radio"
                      value="sms"
                      checked={method === 'sms'}
                      onChange={(e) => setMethod(e.target.value)}
                      disabled={saving}
                      style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                    />
                    <span>📱 Text Message (SMS)</span>
                  </label>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    cursor: 'pointer'
                  }}>
                    <input
                      type="radio"
                      value="email"
                      checked={method === 'email'}
                      onChange={(e) => setMethod(e.target.value)}
                      disabled={saving}
                      style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                    />
                    <span>📧 Email</span>
                  </label>
                </div>
              </div>

              <p style={{ fontSize: '13px', color: '#666', marginBottom: '1.5rem', fontStyle: 'italic' }}>
                You'll receive a code via your selected method when you log in.
              </p>
            </>
          )}

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              onClick={handleSaveTwoFA}
              disabled={saving}
              style={{
                flex: 1,
                padding: '0.75rem',
                backgroundColor: '#7c63d8',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: saving ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: 'bold'
              }}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              onClick={() => {
                setEditMode(false);
                setEnabled(settings.enabled);
                setMethod(settings.method || 'email');
              }}
              disabled={saving}
              style={{
                flex: 1,
                padding: '0.75rem',
                backgroundColor: '#f5f5f5',
                border: '1px solid #ccc',
                borderRadius: '4px',
                cursor: saving ? 'not-allowed' : 'pointer',
                fontSize: '14px'
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
