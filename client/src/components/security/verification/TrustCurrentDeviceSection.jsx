import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '../../../context/TranslationContext';
import { logErrorFromCatch } from '../../../shared/errorLogger.js';

/**
 * TrustCurrentDeviceSection - Trust the current device
 * Allows user to permanently trust their current device
 */
export function TrustCurrentDeviceSection({ userId, token, apiUrl, onDeviceTrusted, onDeviceRevoked }) {
  const { t } = useTranslation();
  const [isCurrentDeviceTrusted, setIsCurrentDeviceTrusted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

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
      logErrorFromCatch('[TRUST-DEVICE] Error checking trust status:', err);
    }
  }, [apiUrl, userId, token]);

  useEffect(() => {
    checkCurrentDeviceTrust();
  }, [checkCurrentDeviceTrust]);

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
        setSuccess(t('security.trustDevice.successTrusted'));
        setTimeout(() => setSuccess(null), 3000);
        onDeviceTrusted?.();
      } else {
        setError(data.error || t('security.trustDevice.errorTrust'));
      }
    } catch (err) {
      logErrorFromCatch('[TRUST-DEVICE] Error:', err);
      setError(t('security.trustDevice.errorTrust'));
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
        setSuccess(t('security.trustDevice.successRemoved'));
        setTimeout(() => setSuccess(null), 3000);
        // Notify parent so TrustedDevicesSection can refresh
        onDeviceRevoked?.();
      } else {
        setError(data.error || t('security.trustDevice.errorRevoke'));
      }
    } catch (err) {
      logErrorFromCatch('[TRUST-DEVICE] Error:', err);
      setError(t('security.trustDevice.errorRevoke'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '1rem', backgroundColor: '#f9f9f9', borderRadius: '6px', marginTop: '1.5rem' }}>
      {/* Header with title + trust status badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0, fontSize: '15px' }}>{t('security.trustDevice.heading')}</h3>
        <span style={{
          padding: '2px 10px',
          borderRadius: '10px',
          fontSize: '11px',
          fontWeight: '700',
          backgroundColor: isCurrentDeviceTrusted ? '#e8f5e9' : '#ffebee',
          color: isCurrentDeviceTrusted ? '#2e7d32' : '#d32f2f',
          border: `1px solid ${isCurrentDeviceTrusted ? '#c8e6c9' : '#ffcdd2'}`,
        }}>
          {isCurrentDeviceTrusted ? '✓ Trusted' : '✕ Not trusted'}
        </span>
      </div>
      
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
          {isCurrentDeviceTrusted ? t('security.trustDevice.infoTrusted') : t('security.trustDevice.infoUntrusted')}
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
        {loading ? t('security.trustDevice.processing') : (isCurrentDeviceTrusted ? t('security.trustDevice.removeButton') : t('security.trustDevice.trustButton'))}
      </button>
    </div>
  );
}
