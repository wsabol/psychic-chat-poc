import React, { useState, useEffect } from 'react';

/**
 * VerificationMethodsTab - Combine phone + email in single view
 * Reads/writes to: security table (phone, recovery_email) + user_2fa_settings (synced)
 */
export default function VerificationMethodsTab({ userId, token, apiUrl, userEmail }) {
  const [methods, setMethods] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [phoneNumber, setPhoneNumber] = useState('');
  const [recoveryPhone, setRecoveryPhone] = useState('');
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [showVerification, setShowVerification] = useState(false);
  const [verificationType, setVerificationType] = useState(null);

  useEffect(() => {
    loadVerificationMethods();
  }, [userId]);

  const loadVerificationMethods = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${apiUrl}/security/verification-methods/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setMethods(data.methods);
        setPhoneNumber(data.methods.phoneNumber || '');
        setRecoveryPhone(data.methods.recoveryPhone || '');
        setRecoveryEmail(data.methods.recoveryEmail || '');
      }
    } catch (err) {
      console.error('[VERIFICATION] Error loading methods:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveVerificationMethods = async () => {
    try {
      setSaving(true);
      setError(null);

      // Save phone (both primary and recovery)
      if (phoneNumber !== methods.phoneNumber || recoveryPhone !== methods.recoveryPhone) {
        const phoneRes = await fetch(`${apiUrl}/security/phone/${userId}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ phoneNumber, recoveryPhone })
        });

        if (!phoneRes.ok) throw new Error('Failed to save phone number');
        setShowVerification(true);
        setVerificationType('phone');
        setVerificationCode('');
        return;
      }

      // Save recovery email
      if (recoveryEmail !== methods.recoveryEmail) {
        const emailRes = await fetch(`${apiUrl}/security/email/${userId}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ recoveryEmail })
        });

        if (!emailRes.ok) throw new Error('Failed to save recovery email');
        setShowVerification(true);
        setVerificationType('email');
        setVerificationCode('');
        return;
      }

      setSuccess('Verification methods updated');
      setEditMode(false);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode.trim()) {
      setError('Please enter verification code');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      let endpoint = '';
      if (verificationType === 'phone') {
        endpoint = `${apiUrl}/security/phone/${userId}/verify`;
      } else if (verificationType === 'email') {
        endpoint = `${apiUrl}/security/email/${userId}/verify`;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ code: verificationCode })
      });

      if (!response.ok) throw new Error('Invalid verification code');

      setSuccess('Verification successful!');
      setShowVerification(false);
      setEditMode(false);
      setVerificationCode('');
      loadVerificationMethods();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '2rem' }}>Loading verification methods...</div>;
  }

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Verification Methods</h2>
      <p style={{ color: '#666' }}>
        Add phone and email for account recovery and two-factor authentication.
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
          {/* Primary Email */}
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
              fontWeight: 'bold'
            }}>
              ✓ Verified
            </span>
          </div>

          {/* Phone Number */}
          <div style={{
            backgroundColor: 'white',
            padding: '1.5rem',
            borderRadius: '8px',
            border: '1px solid #e0e0e0'
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '0.5rem' }}>Phone Number</h3>
            <p style={{ margin: '0.5rem 0', fontSize: '14px', color: '#666' }}>
              {phoneNumber || 'Not set'}
            </p>
            {methods?.phoneVerified && (
              <span style={{
                display: 'inline-block',
                backgroundColor: '#e8f5e9',
                color: '#2e7d32',
                padding: '0.25rem 0.75rem',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: 'bold'
              }}>
                ✓ Verified
              </span>
            )}
          </div>

          {/* Recovery Phone */}
          <div style={{
            backgroundColor: 'white',
            padding: '1.5rem',
            borderRadius: '8px',
            border: '1px solid #e0e0e0'
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '0.5rem' }}>Recovery Phone (Backup)</h3>
            <p style={{ margin: '0.5rem 0', fontSize: '14px', color: '#666' }}>
              {recoveryPhone || 'Not set'}
            </p>
          </div>

          {/* Recovery Email */}
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
            {methods?.recoveryEmailVerified && (
              <span style={{
                display: 'inline-block',
                backgroundColor: '#e8f5e9',
                color: '#2e7d32',
                padding: '0.25rem 0.75rem',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: 'bold'
              }}>
                ✓ Verified
              </span>
            )}
          </div>

          <button
            onClick={() => setEditMode(true)}
            style={{
              alignSelf: 'flex-start',
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
            ✏️ Edit Verification Methods
          </button>
        </div>
      ) : !showVerification ? (
        <div style={{
          backgroundColor: 'white',
          padding: '1.5rem',
          borderRadius: '8px',
          border: '1px solid #e0e0e0'
        }}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              Phone Number
            </label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+1 (555) 000-0000"
              disabled={saving}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '4px',
                border: '1px solid #ccc',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              Recovery Phone (Optional)
            </label>
            <input
              type="tel"
              value={recoveryPhone}
              onChange={(e) => setRecoveryPhone(e.target.value)}
              placeholder="+1 (555) 000-0000"
              disabled={saving}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '4px',
                border: '1px solid #ccc',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              Recovery Email
            </label>
            <input
              type="email"
              value={recoveryEmail}
              onChange={(e) => setRecoveryEmail(e.target.value)}
              placeholder="recovery@example.com"
              disabled={saving}
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
              onClick={handleSaveVerificationMethods}
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
                loadVerificationMethods();
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
      ) : (
        <div style={{
          backgroundColor: 'white',
          padding: '1.5rem',
          borderRadius: '8px',
          border: '1px solid #e0e0e0'
        }}>
          <h3 style={{ marginTop: 0 }}>Verify Your {verificationType === 'phone' ? 'Phone' : 'Email'}</h3>
          <p style={{ color: '#666' }}>
            Enter the 6-digit code sent to {verificationType === 'phone' ? phoneNumber : recoveryEmail}
          </p>

          <div style={{ marginBottom: '1rem' }}>
            <input
              type="text"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.slice(0, 6))}
              placeholder="000000"
              maxLength="6"
              disabled={saving}
              style={{
                width: '100%',
                padding: '0.75rem',
                fontSize: '24px',
                textAlign: 'center',
                letterSpacing: '0.5rem',
                borderRadius: '4px',
                border: '1px solid #ccc',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              onClick={handleVerifyCode}
              disabled={saving || verificationCode.length !== 6}
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
              {saving ? 'Verifying...' : 'Verify Code'}
            </button>
            <button
              onClick={() => setShowVerification(false)}
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
              Back
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
