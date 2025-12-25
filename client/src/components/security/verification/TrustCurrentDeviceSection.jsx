import React, { useState, useEffect, useCallback } from 'react';

/**
 * TrustCurrentDeviceSection - Trust the current device
 * Allows user to trust their current device for 30 days
 */
export function TrustCurrentDeviceSection({ userId, token, apiUrl }) {
  const [isCurrentDeviceTrusted, setIsCurrentDeviceTrusted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    checkCurrentDeviceTrust();
  }, [checkCurrentDeviceTrust]);

  const checkCurrentDeviceTrust = useCallback(async () => {
    try {
      const response = await fetch(`${apiUrl}/auth/check-current-device-trust/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setIsCurrentDeviceTrusted(data.isTrusted || false);
      }
    } catch (err) {
      console.error('[TRUST-DEVICE] Error checking trust status:', err);
    }
  }, [apiUrl, userId, token]);

  const handleTrustDevice = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const response = await fetch(`${apiUrl}/auth/trust-current-device/${userId}`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (response.ok) {
        setIsCurrentDeviceTrusted(true);
        setSuccess('Device trusted for 30 days');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(data.error || 'Failed to trust device');
      }
    } catch (err) {
      console.error('[TRUST-DEVICE] Error:', err);
      setError('Error trusting device');
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeTrust = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const response = await fetch(`${apiUrl}/auth/revoke-current-device-trust/${userId}`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (response.ok) {
        setIsCurrentDeviceTrusted(false);
        setSuccess('Device trust removed');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(data.error || 'Failed to revoke device trust');
      }
    } catch (err) {
      console.error('[TRUST-DEVICE] Error:', err);
      setError('Error revoking device trust');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '1rem', backgroundColor: '#f9f9f9', borderRadius: '6px', marginTop: '1.5rem' }}>
      <h3 style={{ margin: '0 0 1rem 0', fontSize: '15px' }}>🔒 Trust This Device</h3>
      
      {error && (
        <div style={{ color: '#d32f2f', fontSize: '12px', marginBottom: '0.75rem' }}>
          ⚠️ {error}
        </div>
      )}

      {success && (
        <div style={{ color: '#2e7d32', fontSize: '12px', marginBottom: '0.75rem' }}>
          ✓ {success}
        </div>
      )}

      <div style={{ fontSize: '12px', marginBottom: '1rem', color: '#666' }}>
        <p style={{ margin: '0 0 0.5rem 0' }}>
          {isCurrentDeviceTrusted 
            ? '✓ This device is trusted for 30 days. You will not need to enter a 2FA code when logging in.'
            : 'Trust this device to skip 2FA for 30 days. You will not need to enter a verification code when logging in from this device.'}
        </p>
      </div>

      <button
        onClick={isCurrentDeviceTrusted ? handleRevokeTrust : handleTrustDevice}
        disabled={loading}
        style={{
          padding: '0.5rem 1rem',
          backgroundColor: isCurrentDeviceTrusted ? '#ffebee' : '#e8f5e9',
          color: isCurrentDeviceTrusted ? '#d32f2f' : '#2e7d32',
          border: `1px solid ${isCurrentDeviceTrusted ? '#ffcdd2' : '#c8e6c9'}`,
          borderRadius: '4px',
          cursor: loading ? 'not-allowed' : 'pointer',
          fontSize: '13px',
          fontWeight: '600',
          opacity: loading ? 0.6 : 1
        }}
      >
        {loading ? 'Processing...' : (isCurrentDeviceTrusted ? 'Remove Trust' : 'Trust This Device')}
      </button>
    </div>
  );
}

