import React, { useState, useCallback, useEffect } from 'react';
import { useTranslation } from '../../context/TranslationContext';

/**
 * DevicesTab - Show all logged-in devices and allow logout from specific device
 */
export default function DevicesTab({ userId, token, apiUrl }) {
  const { t } = useTranslation();
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [loggingOut, setLoggingOut] = useState(null);

  const loadDevices = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${apiUrl}/security/devices/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to load devices');
      
      const data = await response.json();
      setDevices(data.devices || []);
    } catch (err) {
      console.error('[DEVICES] Error loading devices:', err);
      setError(t('security.devices.errorLoading'));
    } finally {
      setLoading(false);
    }
  }, [apiUrl, userId, token]);

  useEffect(() => {
    loadDevices();
  }, [loadDevices]);

  const handleLogoutDevice = async (deviceId) => {
    if (!window.confirm(t('security.devices.logoutConfirm'))) {
      return;
    }

    try {
      setLoggingOut(deviceId);
      const response = await fetch(`${apiUrl}/security/devices/${userId}/${deviceId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to logout device');
      
      setDevices(devices.filter(d => d.id !== deviceId));
    } catch (err) {
      console.error('[DEVICES] Error logging out device:', err);
      setError(t('security.devices.errorLogout'));
    } finally {
      setLoggingOut(null);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '2rem' }}>{t('security.devices.loadingDevices')}</div>;
  }

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>{t('security.devices.title')}</h2>
      <p style={{ color: '#666' }}>
        {t('security.devices.subtitle')}
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

      {devices.length === 0 ? (
        <p style={{ color: '#999', textAlign: 'center', padding: '2rem' }}>
          {t('security.devices.noDevices')}
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {devices.map(device => (
            <div
              key={device.id}
              style={{
                backgroundColor: 'white',
                padding: '1.5rem',
                borderRadius: '8px',
                border: '1px solid #e0e0e0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div>
                <h3 style={{ marginTop: 0, marginBottom: '0.5rem' }}>
                  📍 {device.deviceName}
                </h3>
                <p style={{ margin: '0.25rem 0', fontSize: '14px', color: '#666' }}>
                  <strong>{t('security.devices.ipLabel')}:</strong> {device.ipAddress}
                </p>
                <p style={{ margin: '0.25rem 0', fontSize: '14px', color: '#666' }}>
                  <strong>{t('security.devices.lastActiveLabel')}:</strong> {new Date(device.lastLogin).toLocaleString()}
                </p>
                {device.deviceName === (navigator.userAgent ? 'Current Device' : '') && (
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
                    {t('security.devices.currentDeviceBadge')}
                  </span>
                )}
              </div>

              {device.isCurrent ? (
                <span style={{ color: '#999', fontSize: '14px' }}>Current</span>
              ) : (
                <button
                  onClick={() => handleLogoutDevice(device.id)}
                  disabled={loggingOut === device.id}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#f44336',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: loggingOut === device.id ? 'not-allowed' : 'pointer',
                    fontSize: '14px'
                  }}
                >
                  {loggingOut === device.id ? t('security.devices.loggingOut') : t('security.devices.logOut')}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
