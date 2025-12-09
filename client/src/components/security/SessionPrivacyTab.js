import React, { useState, useEffect } from 'react';

/**
 * SessionPrivacyTab - Manage "Stay Logged In" preference
 * Reads/writes from: user_2fa_settings.persistent_session
 */
export default function SessionPrivacyTab({ userId, token, apiUrl }) {
  const [persistentSession, setPersistentSession] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    loadSessionPreference();
  }, [userId]);

  const loadSessionPreference = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${apiUrl}/security/2fa-settings/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setPersistentSession(data.settings.persistent_session || false);
      }
    } catch (err) {
      console.error('[SESSION] Error loading preference:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePersistentSession = async () => {
    try {
      setSaving(true);
      setError(null);

      const newValue = !persistentSession;

      const response = await fetch(`${apiUrl}/security/session-preference/${userId}`, {
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
        setError(err.error || 'Failed to save preference');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '2rem' }}>Loading session settings...</div>;
  }

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Session & Privacy</h2>
      <p style={{ color: '#666' }}>
        Control how long you stay logged in on this device.
      </p>

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
              {persistentSession ? '🟢 ON' : '🔴 OFF'}
            </p>
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '14px', color: '#666' }}>
              {persistentSession ? 'Stay logged in for 30 days' : 'Log out when browser closes'}
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
            title={persistentSession ? 'Turn off' : 'Turn on'}
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
              ✓ You will stay logged in for 30 days on this device.
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
              ⚠️ You will be logged out when you close your browser window.
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
            💡 Recommendation:
          </p>
          <ul style={{ margin: 0, paddingLeft: '1.5rem', fontSize: '13px', color: '#666' }}>
            <li style={{ marginBottom: '0.5rem' }}>
              <strong>ON:</strong> Use on your personal, private devices only
            </li>
            <li style={{ marginBottom: '0.5rem' }}>
              <strong>OFF:</strong> Use on shared or public computers (recommended for security)
            </li>
            <li>
              <strong>Expiry:</strong> Sessions auto-expire after 30 days regardless of setting
            </li>
          </ul>
        </div>

        {saving && <p style={{ color: '#999', fontSize: '13px', marginTop: '1rem' }}>Saving...</p>}
      </div>
    </div>
  );
}
