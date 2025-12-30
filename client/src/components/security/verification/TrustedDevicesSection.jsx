import React, { useState, useEffect, useCallback } from 'react';

/**
 * TrustedDevicesSection - Manage trusted devices
 * Shows list of devices that don't require 2FA
 */
export function TrustedDevicesSection({ userId, token, apiUrl }) {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadTrustedDevices();
  }, []);

  const loadTrustedDevices = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${apiUrl}/auth/trusted-devices/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setDevices(data.devices || []);
      } else if (response.status === 404) {
        setDevices([]);
      } else {
        setError('Failed to load trusted devices');
      }
    } catch (err) {
      console.error('[TRUSTED-DEVICES] Error:', err);
      setError('Error loading trusted devices');
    } finally {
      setLoading(false);
    }
  }, [userId, token, apiUrl]);

  const handleRevoke = async (deviceId) => {
    try {
      const response = await fetch(`${apiUrl}/auth/trusted-device/${userId}/${deviceId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        // Remove from UI
        setDevices(devices.filter(d => d.id !== deviceId));
      } else {
        setError('Failed to revoke device');
      }
    } catch (err) {
      console.error('[TRUSTED-DEVICES] Revoke error:', err);
      setError('Error revoking device');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const calculateDaysLeft = (expiryString) => {
    if (!expiryString) return 0;
    const expiry = new Date(expiryString);
    const today = new Date();
    const daysLeft = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
    return Math.max(0, daysLeft);
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '1rem' }}>Loading trusted devices...</div>;
  }

  return (
    <div style={{ padding: '1rem', backgroundColor: '#f9f9f9', borderRadius: '6px', marginTop: '1.5rem' }}>
      <h3 style={{ margin: '0 0 1rem 0', fontSize: '15px' }}>🔓 Trusted Devices</h3>
      
      {error && (
        <div style={{ color: '#d32f2f', fontSize: '12px', marginBottom: '1rem' }}>
          ⚠️ {error}
        </div>
      )}

      {devices.length === 0 ? (
        <p style={{ fontSize: '12px', color: '#666', margin: 0 }}>
          No trusted devices yet. Check "Trust this device for 30 days" when entering your 2FA code to add one.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {devices.map((device) => (
            <div
              key={device.id}
              style={{
                padding: '0.75rem',
                backgroundColor: 'white',
                border: '1px solid #e0e0e0',
                borderRadius: '4px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div style={{ fontSize: '12px', flex: 1 }}>
                <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>
                  {device.device_name}
                </div>
                <div style={{ color: '#666', fontSize: '11px' }}>
                  Added: {formatDate(device.created_at)}
                  <br />
                  Expires in: {calculateDaysLeft(device.trust_expiry)} days
                </div>
              </div>
              <button
                onClick={() => handleRevoke(device.id)}
                style={{
                  padding: '0.35rem 0.7rem',
                  backgroundColor: '#ffebee',
                  color: '#d32f2f',
                  border: '1px solid #ffcdd2',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: '600',
                  whiteSpace: 'nowrap',
                  marginLeft: '0.5rem'
                }}
              >
                Revoke
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
