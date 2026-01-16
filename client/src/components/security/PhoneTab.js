import React, { useState, useEffect } from 'react';
import { logErrorFromCatch } from '../../shared/errorLogger.js';

/**
 * PhoneTab - Manage phone number and recovery phone
 */
export default function PhoneTab({ userId, token, apiUrl }) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [recoveryPhone, setRecoveryPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [showVerification, setShowVerification] = useState(false);

  useEffect(() => {
    loadPhoneData();
  }, [userId]);

  const loadPhoneData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${apiUrl}/security/phone/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setPhoneNumber(data.phoneNumber || '');
        setRecoveryPhone(data.recoveryPhone || '');
      }
    } catch (err) {
      logErrorFromCatch('[PHONE] Error loading phone data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePhone = async () => {
    if (!phoneNumber.trim() && !recoveryPhone.trim()) {
      setError('Please enter at least one phone number');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const response = await fetch(`${apiUrl}/security/phone/${userId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          phoneNumber,
          recoveryPhone
        })
      });

      if (!response.ok) throw new Error('Failed to save phone number');
      setSuccess('Phone number saved successfully. A verification code will be sent.');
      setShowVerification(true);
      setEditMode(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode.trim()) {
      setError('Please enter the verification code');
      return;
    }

    try {
      setVerifying(true);
      setError(null);

      const response = await fetch(`${apiUrl}/security/phone/${userId}/verify`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ code: verificationCode })
      });

      if (!response.ok) throw new Error('Invalid verification code');
      setSuccess('Phone number verified successfully!');
      setShowVerification(false);
      setVerificationCode('');
      setEditMode(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '2rem' }}>Loading phone settings...</div>;
  }

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Phone Number</h2>
      <p style={{ color: '#666' }}>
        Add your phone number for account recovery and two-factor authentication.
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
            <h3 style={{ marginTop: 0, marginBottom: '0.5rem' }}>Primary Phone</h3>
            <p style={{ margin: '0.5rem 0', fontSize: '14px', color: '#666' }}>
              {phoneNumber || 'Not set'}
            </p>
          </div>

          <div style={{
            backgroundColor: 'white',
            padding: '1.5rem',
            borderRadius: '8px',
            border: '1px solid #e0e0e0'
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '0.5rem' }}>Recovery Phone</h3>
            <p style={{ margin: '0.5rem 0', fontSize: '14px', color: '#666' }}>
              {recoveryPhone || 'Not set'}
            </p>
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
            ✏️ Edit Phone Numbers
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
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: 'bold'
            }}>
              Primary Phone Number
            </label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+1 (555) 000-0000"
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
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: 'bold'
            }}>
              Recovery Phone Number (Optional)
            </label>
            <input
              type="tel"
              value={recoveryPhone}
              onChange={(e) => setRecoveryPhone(e.target.value)}
              placeholder="+1 (555) 000-0000"
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
              onClick={handleSavePhone}
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
                loadPhoneData();
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
          <h3 style={{ marginTop: 0 }}>Verify Your Phone</h3>
          <p style={{ color: '#666' }}>
            Enter the 6-digit code sent to {phoneNumber}
          </p>

          <div style={{ marginBottom: '1rem' }}>
            <input
              type="text"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.slice(0, 6))}
              placeholder="000000"
              maxLength="6"
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
              disabled={verifying || verificationCode.length !== 6}
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
              {verifying ? 'Verifying...' : 'Verify Code'}
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
