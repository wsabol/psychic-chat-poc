import { useState, useEffect } from 'react';
import { getZodiacSignFromDate } from '../../../utils/astroUtils';
import { fetchWithTokenRefresh } from '../../../utils/fetchWithTokenRefresh';
import { loadZodiacSignsForLanguage } from '../../../data/zodiac/index.js';
import { logErrorFromCatch } from '../../../shared/errorLogger.js';

/**
 * Custom hook to manage astrology data fetching and state
 * Extracted from MySignModal for better separation of concerns
 */
export function useMySignModal(userId, token, isOpen) {
  const [astroData, setAstroData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [zodiacSigns, setZodiacSigns] = useState(null);

  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3000";

  // Load zodiac signs for current language
  useEffect(() => {
    const loadZodiacData = async () => {
      try {
        const signs = await loadZodiacSignsForLanguage('en-US');
        setZodiacSigns(signs);
      } catch (err) {
        logErrorFromCatch('Failed to load zodiac signs:', err);
      }
    };
    loadZodiacData();
  }, []);

  // Load astrology data when modal opens
  useEffect(() => {
    if (isOpen && userId && token) {
      loadAndStoreAstrologyData();
    }
  }, [isOpen, userId, token]);

  const loadAndStoreAstrologyData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Try to fetch calculated astrology data from database
      const calculatedData = await fetchCalculatedData();
      if (calculatedData) {
        setAstroData(calculatedData);
        setLoading(false);
        return;
      }

      // Fall back to local zodiac sign data
      const localData = await fetchLocalZodiacData();
      setAstroData(localData);
    } catch (err) {
      logErrorFromCatch('Error loading astrology data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchCalculatedData = async () => {
    try {
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const response = await fetchWithTokenRefresh(
        `${API_URL}/user-astrology/${userId}`,
        { headers }
      );

      if (!response.ok) return null;

      const dbAstroData = await response.json();
      let astroDataObj = typeof dbAstroData.astrology_data === 'string'
        ? JSON.parse(dbAstroData.astrology_data)
        : dbAstroData.astrology_data;

      if (!astroDataObj || (!astroDataObj.sun_sign && !astroDataObj.rising_sign && !astroDataObj.moon_sign)) {
        return null;
      }

      // Merge with zodiac sign data if available
      const sunSignKey = astroDataObj.sun_sign?.toLowerCase();
      const zodiacSignData = zodiacSigns?.[sunSignKey];
      const mergedData = zodiacSignData
        ? { ...zodiacSignData, ...astroDataObj }
        : astroDataObj;

      return {
        ...dbAstroData,
        astrology_data: mergedData
      };
    } catch (e) {
      return null;
    }
  };

  const fetchLocalZodiacData = async () => {
    // Get birth date
    const birthDateToUse = await getBirthDate();
    if (!birthDateToUse) {
      throw new Error('No birth date found. Please enter your birth date in Personal Information first.');
    }

    // Calculate zodiac sign
    const zodiacSign = getZodiacSignFromDate(birthDateToUse);
    if (!zodiacSign) {
      throw new Error('Invalid birth date. Please check your Personal Information.');
    }

    // Get zodiac sign data
    if (!zodiacSigns) {
      throw new Error('Astrology data not loaded. Please refresh the page.');
    }

    const astrologyData = zodiacSigns[zodiacSign];
    if (!astrologyData) {
      throw new Error('Could not retrieve astrology data for your sign.');
    }

    return {
      zodiac_sign: zodiacSign,
      astrology_data: astrologyData
    };
  };

  const getBirthDate = async () => {
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
    const response = await fetchWithTokenRefresh(
      `${API_URL}/user-profile/${userId}`,
      { headers }
    );

    if (!response.ok) {
      throw new Error('Could not find your personal information. Please enter your birth date first.');
    }

    const personalInfo = await response.json();
    return personalInfo.birth_date;
  };

  return {
    astroData,
    loading,
    error,
    refetch: loadAndStoreAstrologyData
  };
}
