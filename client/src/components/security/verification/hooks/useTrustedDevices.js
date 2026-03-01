import { useState, useCallback, useEffect } from 'react';
import { logErrorFromCatch } from '../../../../shared/errorLogger.js';

/**
 * useTrustedDevices – Single source of truth for the trusted-device list.
 *
 * Both TrustCurrentDeviceSection and TrustedDevicesSection read their data
 * from this hook (lifted to VerificationAndTwoFATab) so the two sections can
 * never disagree about whether the current device is trusted.
 *
 * @param {string}  userId
 * @param {string}  token
 * @param {string}  apiUrl
 * @param {boolean} enabled – skips the fetch (and effect re-run) when 2FA is off
 */
export function useTrustedDevices(userId, token, apiUrl, enabled) {
  const [devices, setDevices] = useState([]);
  const [isCurrentDeviceTrusted, setIsCurrentDeviceTrusted] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadDevices = useCallback(async () => {
    if (!userId || !token) return;
    try {
      setLoading(true);
      const response = await fetch(`${apiUrl}/auth/trusted-devices/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        const list = data.devices || [];
        setDevices(list);
        // Derive current-device trust from the same row the table shows
        const currentRow = list.find(d => d.is_current_device);
        setIsCurrentDeviceTrusted(currentRow ? currentRow.is_trusted !== false : false);
      }
    } catch (err) {
      logErrorFromCatch('[DEVICE-LIST] Error loading devices:', err);
    } finally {
      setLoading(false);
    }
  }, [apiUrl, userId, token]);

  useEffect(() => {
    if (enabled) {
      loadDevices();
    }
  }, [enabled, loadDevices]);

  return { devices, isCurrentDeviceTrusted, loading, reload: loadDevices };
}
