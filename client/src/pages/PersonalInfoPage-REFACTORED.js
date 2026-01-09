import { useState, useEffect } from 'react';
import { useTranslation } from '../context/TranslationContext';
import { COUNTRIES } from '../data/countries';
import { fetchWithTokenRefresh } from '../utils/fetchWithTokenRefresh';
import { validateBirthDate } from '../utils/dateValidator';
import { FormInput } from '../components/forms/FormInput';
import { FormSelect } from '../components/forms/FormSelect';
import { FormSection } from '../components/forms/FormSection';
import { formatDateForDisplay, parseDateForStorage } from '../utils/dateFormatting';
import {
  preparePersonalInfoData,
  hasBirthLocationData,
  INITIAL_FORM_DATA,
  SEX_OPTIONS,
  TIMING
} from '../utils/personalInfoUtils';
import { useAstrologyPolling } from '../hooks/useAstrologyPolling';
import '../styles/responsive.css';
import './PersonalInfoPage.css';

export default function PersonalInfoPage({ userId, token, auth, onNavigateToPage, onboarding }) {
  const { t } = useTranslation();
  const { pollForAstrology } = useAstrologyPolling();

  // ============================================================
  // STATE
  // ============================================================
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  // CONFIG
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';
  const isTemporaryAccount = auth?.isTemporaryAccount;

  // ============================================================
  // LIFECYCLE
  // ============================================================
  useEffect(() => {
    fetchPersonalInfo();
  }, [userId, token]); // eslint-disable-line react-hooks/exhaustive-deps

  // ============================================================
  // API CALLS
  // ============================================================
  const fetchPersonalInfo = async () => {
    try {
      const response = await fetchWithTokenRefresh(`${API_URL}/user-profile/${userId}`, {
        headers: { 'Authorization': token ? `Bearer ${token}` : '' }
      });

      if (!response.ok) throw new Error('Failed to fetch personal info');

      const data = await response.json();
      if (data?.first_name) {
        setFormData({
          firstName: data.first_name || '',
          lastName: data.last_name || '',
          email: data.email || (isTemporaryAccount ? 'tempuser@example.com' : ''),
          birthCountry: data.birth_country || '',
          birthProvince: data.birth_province || '',
          birthCity: data.birth_city || '',
          birthDate: formatDateForDisplay(data.birth_date) || '',
          birthTime: data.birth_time || '',
          sex: data.sex || '',
          addressPreference: data.address_preference || ''
        });
      } else if (isTemporaryAccount) {
        setFormData((prev) => ({ ...prev, email: 'tempuser@example.com' }));
      }
    } catch (err) {
      console.error('[PERSONAL-INFO] Error fetching data:', err);
      if (isTemporaryAccount) {
        setFormData((prev) => ({ ...prev, email: 'tempuser@example.com' }));
      }
    }
  };

  const savePersonalInfo = async (dataToSend) => {
    const response = await fetchWithTokenRefresh(`${API_URL}/user-profile/${userId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      },
      body: JSON.stringify(dataToSend)
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error || 'Failed to save personal information');
    }
  };

  // ============================================================
  // EVENT HANDLERS
  // ============================================================
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear field error when user starts typing
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Validate
    const errors = validateFields();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setError(t('personalInfo.errors.missingRequired'));
      return;
    }

    setLoading(true);
    setFieldErrors({});

    try {
      const storageBirthDate = parseDateForStorage(formData.birthDate);
      const dataToSend = preparePersonalInfoData(formData, isTemporaryAccount, storageBirthDate);

      // Save personal info
      await savePersonalInfo(dataToSend);

      // Trigger astrology calculation for temp users with location data
      if (isTemporaryAccount && hasBirthLocationData(formData)) {
        console.log('[PERSONAL-INFO] Temp user with birth location - triggering sync-calculate');
        try {
          const astrResponse = await fetchWithTokenRefresh(
            `${API_URL}/user-astrology/sync-calculate/${userId}`,
            { method: 'POST', headers: { 'Authorization': token ? `Bearer ${token}` : '' } }
          );

          if (astrResponse.ok) {
            console.log('[PERSONAL-INFO] ✓ Sync-calculate endpoint called');
          } else {
            console.warn('[PERSONAL-INFO] Sync-calculate returned:', astrResponse.status);
          }
        } catch (err) {
          console.error('[PERSONAL-INFO] Sync-calculate error:', err);
        }
      }

      setSuccess(true);

      // Update onboarding
      if (onboarding?.updateOnboardingStep) {
        try {
          await onboarding.updateOnboardingStep('personal_info');
        } catch (err) {
          console.error('[PERSONAL-INFO] Failed to update onboarding:', err);
        }
      }

      // Navigate or show success
      if (isTemporaryAccount && onNavigateToPage) {
        // Poll for astrology completion before navigating
        await pollForAstrology(userId, token, API_URL, {
          maxAttempts: TIMING.ASTROLOGY_POLL_MAX_ATTEMPTS,
          intervalMs: TIMING.ASTROLOGY_POLL_INTERVAL_MS,
          onReady: () => {
            console.log('[PERSONAL-INFO] Astrology ready, navigating to horoscope');
            onNavigateToPage(5);
          },
          onTimeout: () => {
            console.warn('[PERSONAL-INFO] Astrology timeout, navigating anyway');
            onNavigateToPage(5);
          }
        });
      } else {
        setTimeout(() => setSuccess(false), TIMING.SUCCESS_DISPLAY_MS);
      }
    } catch (err) {
      console.error('[PERSONAL-INFO] Submission error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // VALIDATION
  // ============================================================
  const validateFields = () => {
    const errors = {};

    if (!isTemporaryAccount) {
      if (!formData.firstName.trim()) {
        errors.firstName = t('personalInfo.errors.missingRequired');
      }
      if (!formData.lastName.trim()) {
        errors.lastName = t('personalInfo.errors.missingRequired');
      }
      if (!formData.sex) {
        errors.sex = t('personalInfo.errors.missingRequired');
      }
    }

    if (!formData.email.trim()) {
      errors.email = t('personalInfo.errors.missingRequired');
    }
    if (!formData.birthDate) {
      errors.birthDate = t('personalInfo.errors.invalidBirthDate');
    } else {
      const dateValidation = validateBirthDate(formData.birthDate);
      if (!dateValidation.isValid) {
        errors.birthDate = dateValidation.error;
      } else if (!dateValidation.isAdult) {
        errors.birthDate = dateValidation.error;
      }
    }

    return errors;
  };

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="page-safe-area personal-info-page">
      <div className="info-header">
        <h2 className="heading-primary">👤 {t('personalInfo.title')}</h2>
        <p className="info-subtitle">{t('personalInfo.title')}</p>
      </div>

      {error && <div className="form-error-alert">{error}</div>}
      {success && <div className="form-success-alert">✓ {t('common.saved')}</div>}

      <form onSubmit={handleSubmit} className="info-form">
        {/* Basic Information */}
        <FormSection title={t('personalInfo.title')}>
          <div className="form-grid">
            {!isTemporaryAccount && (
              <>
                <FormInput
                  label={t('personalInfo.firstName')}
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                  error={fieldErrors.firstName}
                  placeholder="John"
                />
                <FormInput
                  label={t('personalInfo.lastName')}
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                  error={fieldErrors.lastName}
                  placeholder="Doe"
                />
              </>
            )}
            <FormInput
              label={t('personalInfo.email')}
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              required
              error={fieldErrors.email}
              placeholder="you@example.com"
              hint={isTemporaryAccount ? t('personalInfo.title') : null}
            />
          </div>
        </FormSection>

        {/* Date & Time of Birth */}
        <FormSection title={t('personalInfo.birthDate')} icon="⏰">
          <div className="form-grid">
            <FormInput
              label={t('personalInfo.birthDate')}
              name="birthDate"
              value={formData.birthDate}
              onChange={handleChange}
              required
              error={fieldErrors.birthDate}
              placeholder="dd-mmm-yyyy (e.g., 09-Feb-1956)"
            />
            <FormInput
              label={t('personalInfo.birthTime')}
              name="birthTime"
              type="time"
              value={formData.birthTime}
              onChange={handleChange}
              optional
            />
          </div>
        </FormSection>

        {/* Place of Birth */}
        <FormSection title={t('personalInfo.birthLocation')} icon="📍">
          <div className="form-grid">
            <FormSelect
              label={t('personalInfo.birthCountry')}
              name="birthCountry"
              value={formData.birthCountry}
              onChange={handleChange}
              options={COUNTRIES}
              optional
              placeholder="-- Select Country --"
            />
            <FormInput
              label={t('personalInfo.birthProvince')}
              name="birthProvince"
              value={formData.birthProvince}
              onChange={handleChange}
              optional
              placeholder="e.g., California"
            />
          </div>
          <FormInput
            label={t('personalInfo.birthCity')}
            name="birthCity"
            value={formData.birthCity}
            onChange={handleChange}
            optional
            placeholder="e.g., New York"
          />
        </FormSection>

        {/* Additional Information */}
        <FormSection title={t('personalInfo.title')} icon="✨">
          <div className="form-grid">
            <FormSelect
              label={t('personalInfo.gender')}
              name="sex"
              value={formData.sex}
              onChange={handleChange}
              options={SEX_OPTIONS}
              required={!isTemporaryAccount}
              optional={isTemporaryAccount}
              error={fieldErrors.sex}
            />
            <FormInput
              label="How should the oracle address you?"
              name="addressPreference"
              value={formData.addressPreference}
              onChange={handleChange}
              optional
              placeholder="e.g., Alex, Sarah"
            />
          </div>
        </FormSection>
      </form>

      {/* Floating Save Button */}
      <button
        type="submit"
        onClick={handleSubmit}
        disabled={loading}
        className="floating-save-button"
        title={loading ? 'Processing...' : 'Save Information'}
      >
        <span className="bubble-icon">{loading ? '⏳' : '💾'}</span>
        <span className="bubble-text">{loading ? t('common.saving') : t('common.save')}</span>
      </button>

      {/* Floating Success Bubble */}
      {success && (
        <div className="floating-feedback-bubble floating-success">
          ✓ {t('common.saved')}
        </div>
      )}
    </div>
  );
}
