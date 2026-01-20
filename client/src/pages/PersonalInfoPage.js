import { useState, useEffect } from 'react';
import { useTranslation } from '../context/TranslationContext';
import { COUNTRIES } from '../data/countries';
import { FormInput } from '../components/forms/FormInput';
import { FormSelect } from '../components/forms/FormSelect';
import { FormSection } from '../components/forms/FormSection';
import { parseDateForStorage } from '../utils/dateFormatting';
import {
  preparePersonalInfoData,
  INITIAL_FORM_DATA,
  SEX_OPTIONS,
  TIMING
} from '../utils/personalInfoUtils';
import { validatePersonalInfoForm } from '../utils/validatePersonalInfoForm';
import { usePersonalInfoAPI } from '../hooks/usePersonalInfoAPI';
import { useTempAccountConfig } from '../hooks/useTempAccountConfig';
import { useAstrologyPolling } from '../hooks/useAstrologyPolling';
import { useFreeTrial } from '../hooks/useFreeTrial';
import { logErrorFromCatch } from '../shared/errorLogger.js';
import '../styles/responsive.css';
import './PersonalInfoPage.css';

export default function PersonalInfoPage({ userId, token, auth, onNavigateToPage, onboarding }) {
  const { t } = useTranslation();
  const { pollForAstrology } = useAstrologyPolling();
  const { updateStep: updateFreeTrialStep } = useFreeTrial(auth?.isTemporaryAccount, userId);

  // ============================================================
  // STATE
  // ============================================================
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  // ============================================================
  // CONFIG & HOOKS
  // ============================================================
  const isTemporaryAccount = auth?.isTemporaryAccount;
  const tempAccountConfig = useTempAccountConfig(isTemporaryAccount);
  const { fetchPersonalInfo: apiFetchPersonalInfo, savePersonalInfo: apiSavePersonalInfo, triggerAstrologySync } = usePersonalInfoAPI(userId, token);
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

  // ============================================================
  // LIFECYCLE
  // ============================================================
  useEffect(() => {
    loadPersonalInfo();
  }, [userId, token]); // eslint-disable-line react-hooks/exhaustive-deps

  // ============================================================
  // API HANDLERS
  // ============================================================
  const loadPersonalInfo = async () => {
    const result = await apiFetchPersonalInfo();
    if (result.success) {
      setFormData(result.data);
    } else if (isTemporaryAccount) {
      setFormData((prev) => ({ ...prev, email: 'tempuser@example.com' }));
    }
  };

  const handleSavePersonalInfo = async (dataToSend) => {
    const result = await apiSavePersonalInfo(dataToSend);
    if (!result.success) {
      throw new Error(result.error || 'Failed to save personal information');
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

            // Save personal info FIRST and wait for completion
      await handleSavePersonalInfo(dataToSend);

                  // SKIP astrology sync for temp accounts - they don't have auth tokens
      // Worker will calculate astrology in background when they reach horoscope page
      if (!isTemporaryAccount && tempAccountConfig.hasCompleteAstrologyData(formData)) {
        // Wait a moment to ensure database persistence
        await new Promise(resolve => setTimeout(resolve, 500));
        // NOW trigger astrology calculation
        const syncResult = await triggerAstrologySync();
        if (!syncResult?.success) {
          logErrorFromCatch('[PERSONAL-INFO] Astrology sync may have failed, continuing anyway');
        }
      }

            setSuccess(true);

      // Update free trial progress (if temp account)
      if (auth?.isTemporaryAccount) {
        try {
          await updateFreeTrialStep('personal_info');
        } catch (err) {
          logErrorFromCatch('[PERSONAL-INFO] Failed to update free trial:', err);
        }
      }

            // Update onboarding (NOT for temp accounts - they don't use onboarding flow)
      if (!isTemporaryAccount && onboarding?.updateOnboardingStep) {
        try {
          await onboarding.updateOnboardingStep('personal_info');
        } catch (err) {
          logErrorFromCatch('[PERSONAL-INFO] Failed to update onboarding:', err);
        }
      }

      // Navigate or show success
      // CRITICAL: For onboarding users (NOT temp), ALWAYS navigate to Chat (0) for welcome modal
      const isOnboarding = !isTemporaryAccount;
      const postSaveAction = tempAccountConfig.getPostSaveAction();
      const shouldNavigate = isOnboarding || postSaveAction.shouldNavigate;
      const targetPage = isOnboarding ? 0 : postSaveAction.navigationTarget; // 0 = Chat
      
      if (shouldNavigate && onNavigateToPage) {
                // For ALL accounts: poll for astrology data to be saved before navigating
        const pollAttempts = isTemporaryAccount ? 60 : TIMING.ASTROLOGY_POLL_MAX_ATTEMPTS;
        const pollInterval = isTemporaryAccount ? 200 : TIMING.ASTROLOGY_POLL_INTERVAL_MS;
        
        await pollForAstrology(userId, token, API_URL, {
            maxAttempts: pollAttempts,
            intervalMs: pollInterval,
            onReady: () => {
              onNavigateToPage(targetPage);
            },
                        onTimeout: () => {
              onNavigateToPage(targetPage);
            }
          });
      } else {
        setTimeout(() => setSuccess(false), TIMING.SUCCESS_DISPLAY_MS);
      }
    } catch (err) {
      logErrorFromCatch('[PERSONAL-INFO] Submission error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // VALIDATION
  // ============================================================
    const validateFields = () => {
    const validation = validatePersonalInfoForm(formData, isTemporaryAccount, t);
    return validation.errors;
  };

  const handleLastFieldKeyDown = (e) => {
    // Only submit on Enter key on the last field (addressPreference)
    if (e.key === 'Enter' && !loading) {
      e.preventDefault();
      handleSubmit(e);
    }
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
              hint={t('personalInfo.birthDateHint')}
            />
            <FormInput
              label={t('personalInfo.birthTime')}
              name="birthTime"
              type="time"
              value={formData.birthTime}
              onChange={handleChange}
              optional
              hint={t('personalInfo.birthTimeHint')}
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
              hint={t('personalInfo.birthCountryHint')}
            />
            <FormInput
              label={t('personalInfo.birthProvince')}
              name="birthProvince"
              value={formData.birthProvince}
              onChange={handleChange}
              optional
              placeholder="e.g., California"
              hint={t('personalInfo.birthProvinceHint')}
            />
          </div>
          <FormInput
            label={t('personalInfo.birthCity')}
            name="birthCity"
            value={formData.birthCity}
            onChange={handleChange}
            optional
            placeholder="e.g., New York"
            hint={t('personalInfo.birthCityHint')}
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
              onKeyDown={handleLastFieldKeyDown}
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

