import { useHoroscopePreferences } from '../../../hooks/useHoroscopePreferences';

/**
 * useMoonPhasePreferences Hook
 * Wrapper around useHoroscopePreferences for moon phase page
 * (Moon phase and horoscope share the same user preferences)
 */
export function useMoonPhasePreferences(userId, token, apiUrl) {
  return useHoroscopePreferences(userId, token, apiUrl);
}
