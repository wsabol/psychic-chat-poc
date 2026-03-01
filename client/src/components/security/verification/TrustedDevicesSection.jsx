import React, { useState } from 'react';
import { logErrorFromCatch } from '../../../shared/errorLogger.js';
import { formatDate } from './utils/dateUtils.js';

/**
 * TrustedDevicesSection – Display and revoke trusted devices.
 *
 * Receives `devices` and `loading` from VerificationAndTwoFATab (via
 * useTrustedDevices) so it shares the exact same data as
 * TrustCurrentDeviceSection — both sections always agree on device state.
 */
export function TrustedDevicesSection({ devices, loading, userId, token, apiUrl, onRevoked }) {
  const [error, setError] = useState(null);

  const handleRevoke = async (deviceId) => {
    try {
      setError(null);
      const response = await fetch(`${apiUrl}/auth/trusted-device/${userId}/${deviceId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        onRevoked?.();   // parent re-fetches the list (and updates the badge)
      } else {
        setError('Failed to revoke device');
      }
    } catch (err) {
      logErrorFromCatch('[TRUSTED-DEVICES] Revoke error:', err);
      setError('Error revoking device');
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '1rem' }}>Loading trusted devices...</div>;
  }

  return (
    <div style={{ padding: '1rem', backgroundColor: '#f9f9f9', borderRadius: '6px', marginTop: '1.5rem' }}>
      <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '15px' }}>🔓 Your Devices</h3>
      <p style={{ margin: '0 0 0.5rem 0', fontSize: '12px', color: '#555' }}>
        These devices skip the 2FA prompt when signing in.
      </p>
      <p style={{ margin: '0 0 1rem 0', fontSize: '12px', color: '#c62828' }}>
        ⚠️ If you see a device you do not recognize, remove it immediately and change your password.
      </p>

      {error && (
        <div style={{ color: '#d32f2f', fontSize: '12px', marginBottom: '1rem' }}>
          ⚠️ {error}
        </div>
      )}

      {devices.length === 0 ? (
        <p style={{ fontSize: '12px', color: '#666', margin: 0 }}>
          No trusted devices yet. Use "Trust This Device" above to add one.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {devices.map((device) => {
            const trusted = device.is_trusted !== false;
            return (
              <div
                key={device.id}
                style={{
                  padding: '0.75rem',
                  backgroundColor: 'white',
                  border: `1px solid ${trusted ? '#e0e0e0' : '#ffcdd2'}`,
                  borderRadius: '4px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div style={{ fontSize: '12px', flex: 1 }}>
                  <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>
                    {device.device_name}
                    {device.is_current_device && (
                      <span style={{ marginLeft: '6px', fontSize: '10px', color: '#1565c0', fontWeight: '400' }}>
                        (this device)
                      </span>
                    )}
                  </div>
                  <div style={{ color: '#666', fontSize: '11px' }}>
                    Added: {formatDate(device.created_at)}
                    <br />
                    <span style={{ color: trusted ? '#2e7d32' : '#d32f2f', fontWeight: '600' }}>
                      {trusted ? 'Trusted permanently' : '✕ Not trusted'}
                    </span>
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
            );
          })}
        </div>
      )}
    </div>
  );
}
