import React, { useState, useEffect } from 'react';

/**
 * EmailTab - Manage primary and recovery email
 */
export default function EmailTab({ userEmail, userId, token, apiUrl }) {
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [showVerification, setShowVerification] = useState(false);

  useEffect(() => {
    loadEmailData();
  }, [userId]);

  const loadEmailData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${apiUrl}/security/email/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setRecoveryEmail(data.recoveryEmail || '');
      }
    } catch (err) {
      console.error('[EMAIL] Error loading email data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEmail = async () => {
    if (!recoveryEmail.trim()) {
      setError('Please enter a recovery email');
      return;
    }

    if (recoveryEmail === userEmail) {
      setError('Recovery email must be different from your primary email');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const response = await fetch(`${apiUrl}/security/email/${userId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ recoveryEmail })
      });

      if (!response.ok) throw new Error('Failed to save recovery email');

      console.log('[EMAIL] ✓ Recovery email saved');
      setSuccess('Recovery email saved. A verification code will be sent.');
      setShowVerification(true);
      setEditMode(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleVerifyEmail = async () => {
    if (!verificationCode.trim()) {
      setError('Please enter the verification code');
      return;
    }

    try {
      setVerifying(true);
      setError(null);

      const response = await fetch(`${apiUrl}/security/email/${userId}/verify`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ code: verificationCode })
      });

      if (!response.ok) throw new Error('Invalid verification code');

      console.log('[EMAIL] ✓ Email verified');
      setSuccess('Recovery email verified successfully!');
      setShowVerification(false);
      setVerificationCode('');
      setEditMode(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setVerifying(false);
    }
  };

  const handleRemoveRecoveryEmail = async () => {
    if (!window.confirm('Remove recovery email? You may need it to recover your account.')) {
      return;
    }

    try {
      const response = await fetch(`${apiUrl}/security/email/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to remove recovery email');

      console.log('[EMAIL] ✓ Recovery email removed');
      setRecoveryEmail('');
      setSuccess('Recovery email removed');
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '2rem' }}>Loading email settings...</div>;
  }

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Email Address</h2>
      <p style={{ color: '#666' }}>
        Your primary email is used for account access. Add a recovery email to keep your account secure.
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

      {!editMode && !showVerification ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{
            backgroundColor: 'white',
            padding: '1.5rem',
            borderRadius: '8px',
            border: '1px solid #e0e0e0'
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '0.5rem' }}>Primary Email</h3>
            <p style={{ margin: '0.5rem 0', fontSize: '14px', color: '#666' }}>
              {userEmail}
            </p>
            <span style={{
              display: 'inline-block',
              backgroundColor: '#e8f5e9',
              color: '#2e7d32',
              padding: '0.25rem 0.75rem',
              borderRadius: '12px',
              fontSize: '12px',
              marginTop: '0.5rem',
              fontWeight: 'bold'
            }}>
              ✓ Verified
            </span>
          </div>

          <div style={{
            backgroundColor: 'white',
            padding: '1.5rem',
            borderRadius: '8px',
            border: '1px solid #e0e0e0'
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '0.5rem' }}>Recovery Email</h3>
            <p style={{ margin: '0.5rem 0', fontSize: '14px', color: '#666' }}>
              {recoveryEmail || 'Not set'}
            </p>
            {recoveryEmail && (
              <span style={{
                display: 'inline-block',
                backgroundColor: '#e8f5e9',
                color: '#2e7d32',
                padding: '0.25rem 0.75rem',
                borderRadius: '12px',
                fontSize: '12px',
                marginTop: '0.5rem',
                fontWeight: 'bold'
              }}>
                ✓ Verified
              </span>
            )}
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
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
              ✏️ {recoveryEmail ? 'Change' : 'Add'} Recovery Email
            </button>
            {recoveryEmail && (
              <button
                onClick={handleRemoveRecoveryEmail}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#f44336',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Remove
              </button>
            )}
          </div>
        </div>
      ) : !showVerification ? (
        <div style={{
          backgroundColor: 'white',
          padding: '1.5rem',
          borderRadius: '8px',
          border: '1px solid #e0e0e0'
        }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: 'bold'
            }}>
              Recovery Email Address
            </label>
            <input
              type="email"
              value={recoveryEmail}
              onChange={(e) => setRecoveryEmail(e.target.value)}
              placeholder="recovery@example.com"
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '4px',
                border: '1px solid #ccc',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              onClick={handleSaveEmail}
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
              {saving ? 'Saving...' : 'Save & Verify'}
            </button>
            <button
              onClick={() => {
                setEditMode(false);
                loadEmailData();
              }}
              style={{
                flex: 1,
                padding: '0.75rem',
                backgroundColor: '#f5f5f5',
                border: '1px solid #ccc',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div style={{
          backgroundColor: 'white',
          padding: '1.5rem',
          borderRadius: '8px',
          border: '1px solid #e0e0e0'
        }}>
          <h3 style={{ marginTop: 0 }}>Verify Your Email</h3>
          <p style={{ color: '#666' }}>
            Check {recoveryEmail} for a verification code
          </p>

          <div style={{ marginBottom: '1rem' }}>
            <input
              type="text"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              placeholder="Enter verification code"
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '4px',
                border: '1px solid #ccc',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              onClick={handleVerifyEmail}
              disabled={verifying || !verificationCode.trim()}
              style={{
                flex: 1,
                padding: '0.75rem',
                backgroundColor: '#7c63d8',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: verifying ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: 'bold'
              }}
            >
              {verifying ? 'Verifying...' : 'Verify Email'}
            </button>
            <button
              onClick={() => setShowVerification(false)}
              style={{
                flex: 1,
                padding: '0.75rem',
                backgroundColor: '#f5f5f5',
                border: '1px solid #ccc',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Back
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
