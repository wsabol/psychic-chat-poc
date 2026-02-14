import { useState, useEffect } from 'react';
import { getAstrologyFromBirthDate, getZodiacSignFromDate } from '../../../utils/astroUtils';
import { parseDateForStorage } from '../../../utils/dateParser';
import { validatePersonalInfo, sanitizeFormData } from '../utils/validation';

/**
 * Custom hook to manage personal info form state and API interactions
 * Extracted from PersonalInfoModal for better separation of concerns
 */
export function usePersonalInfoForm(userId, token, isOpen, isTemporaryAccount) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    birthCountry: '',
    birthProvince: '',
    birthCity: '',
    birthDate: '',
    birthTime: '',
    birthTimezone: '',
    sex: '',
    addressPreference: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3000";

  // Fetch personal info when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchPersonalInfo();
      setSuccess(false);
    }
  }, [isOpen, userId, isTemporaryAccount]);

  const fetchPersonalInfo = async () => {
    try {
      const headers = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const response = await fetch(`${API_URL}/user-profile/${userId}`, { headers });
      if (!response.ok) throw new Error('Failed to fetch personal info');
      const data = await response.json();
      
      if (data && data.first_name) {
        setFormData({
          firstName: data.first_name || '',
          lastName: data.last_name || '',
          email: data.email || '',
          birthCountry: data.birth_country || '',
          birthProvince: data.birth_province || '',
          birthCity: data.birth_city || '',
          birthDate: formatDateForDisplay(data.birth_date) || '',
          birthTime: data.birth_time || '',
          birthTimezone: data.birth_timezone || '',
          sex: data.sex || '',
          addressPreference: data.address_preference || ''
        });
      }
      // Note: Leave email blank for temp accounts so user can enter real email
    } catch (err) {
      // Note: Leave email blank for temp accounts - don't pre-fill with temp email
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validate form data
    const validation = validatePersonalInfo(formData, isTemporaryAccount);
    if (!validation.isValid) {
      setError(validation.errors[0]); // Show first error
      setLoading(false);
      return;
    }

    try {
      // Parse and prepare data
      const storageBirthDate = parseDateForStorage(formData.birthDate);
      
      let astrologyData = null;
      let zodiacSign = null;
      if (storageBirthDate) {
        zodiacSign = getZodiacSignFromDate(storageBirthDate);
        astrologyData = getAstrologyFromBirthDate(storageBirthDate);
      }

      // Sanitize and prepare data to send
      const sanitizedData = sanitizeFormData(formData, isTemporaryAccount);
      const dataToSend = {
        ...sanitizedData,
        birthDate: storageBirthDate,
        zodiacSign: zodiacSign,
        astrologyData: astrologyData
      };

      // Send to API - use free trial endpoint for temp users (no auth required)
      const endpoint = isTemporaryAccount 
        ? `${API_URL}/free-trial/save-personal-info/${userId}`
        : `${API_URL}/user-profile/${userId}`;
      
      const headers = { 'Content-Type': 'application/json' };
      if (!isTemporaryAccount && token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(dataToSend)
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to save personal information');
      }
      
      // Clear horoscope cache
      clearHoroscopeCache(userId);
      
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  return {
    formData,
    loading,
    error,
    success,
    handleChange,
    handleSubmit
  };
}

// Helper function to format date for display
function formatDateForDisplay(dateString) {
  if (!dateString) return '';
  try {
    const parts = dateString.split('-');
    if (parts.length !== 3) return dateString;
    const year = parts[0];
    const monthIndex = parseInt(parts[1], 10) - 1;
    const day = String(parts[2]).padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[monthIndex];
    if (!month) return dateString;
    return `${day}-${month}-${year}`;
  } catch (e) {
    return dateString;
  }
}

// Helper function to clear horoscope cache
function clearHoroscopeCache(userId) {
  const today = new Date().toISOString().split('T')[0];
  localStorage.removeItem(`horoscope_${userId}_daily_${today}`);
  localStorage.removeItem(`horoscope_${userId}_weekly_${today}`);
  localStorage.removeItem(`horoscope_${userId}_monthly_${today}`);
}
