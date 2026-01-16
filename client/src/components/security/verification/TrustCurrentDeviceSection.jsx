import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '../../../context/TranslationContext';
import { logErrorFromCatch } from '../../../shared/errorLogger.js';

/**
 * TrustCurrentDeviceSection - Trust the current device
 * Allows user to trust their current device for 30 days
 */
export function TrustCurrentDeviceSection({ userId, token, apiUrl }) {
  const { t } = useTranslation();
  const [isCurrentDeviceTrusted, setIsCurrentDeviceTrusted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    checkCurrentDeviceTrust();
  }, []);

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
      <h3 style={{ margin: '0 0 1rem 0', fontSize: '15px' }}>{t('security.trustDevice.heading')}</h3>
      
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
