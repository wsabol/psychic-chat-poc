import { useEffect } from 'react';
import { useTranslation } from '../../context/TranslationContext';
import { usePersonalInfoAPI } from '../../hooks/usePersonalInfoAPI';
import { useTempAccountConfig } from '../../hooks/useTempAccountConfig';
import { useAstrologyPolling } from '../../hooks/useAstrologyPolling';
import { useFreeTrial } from '../../hooks/useFreeTrial';
import { usePersonalInfoForm } from './hooks/usePersonalInfoForm';
import { usePersonalInfoNavigation } from './hooks/usePersonalInfoNavigation';
import { usePersonalInfoSubmit } from './hooks/usePersonalInfoSubmit';
import { PersonalInfoHeader } from './components/PersonalInfoHeader';
import { FormAlerts } from './components/FormAlerts';
import { BasicInfoSection } from './components/BasicInfoSection';
import { BirthDateSection } from './components/BirthDateSection';
import { BirthLocationSection } from './components/BirthLocationSection';
import { AdditionalInfoSection } from './components/AdditionalInfoSection';
import '../../styles/responsive.css';
import '../PersonalInfoPage.css';

export default function PersonalInfoPage({ userId, token, auth, onNavigateToPage, onboarding }) {
  const { t } = useTranslation();
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

  // ============================================================
  // CONFIGURATION
  // ============================================================
  const isTemporaryAccount = auth?.isTemporaryAccount;
  const tempAccountConfig = useTempAccountConfig(isTemporaryAccount);
  
  // ============================================================
  // HOOKS - API & DATA
  // ============================================================
  const { 
    fetchPersonalInfo: apiFetchPersonalInfo, 
    savePersonalInfo: apiSavePersonalInfo, 
    triggerAstrologySync 
  } = usePersonalInfoAPI(userId, token, isTemporaryAccount);
  
  const { pollForAstrology } = useAstrologyPolling();
  const { updateStep: updateFreeTrialStep } = useFreeTrial(auth?.isTemporaryAccount, userId);

  // ============================================================
  // HOOKS - FORM STATE
  // ============================================================
  const {
    formData,
    setFormData,
    loading,
    setLoading,
    error,
    setError,
    success,
    setSuccess,
    fieldErrors,
    setFieldErrors,
    handleChange,
    validateFields
  } = usePersonalInfoForm(t, isTemporaryAccount);

  // ============================================================
  // HOOKS - NAVIGATION
  // ============================================================
  const { navigateToTarget, shouldNavigateAfterSave } = usePersonalInfoNavigation({
    isTemporaryAccount,
    userId,
    token,
    API_URL,
    onNavigateToPage,
    pollForAstrology
  });

  // ============================================================
  // HOOKS - SUBMIT ORCHESTRATION
  // ============================================================
  const { handleSubmit } = usePersonalInfoSubmit({
    formData,
    validateFields,
    setLoading,
    setError,
    setSuccess,
    setFieldErrors,
    isTemporaryAccount,
    tempAccountConfig,
    apiSavePersonalInfo,
    triggerAstrologySync,
    auth,
    updateFreeTrialStep,
    onboarding,
    navigateToTarget,
    shouldNavigateAfterSave,
    t
  });

  // ============================================================
  // LIFECYCLE - SCROLL TO TOP ON MOUNT AND WHEN NAVIGATING DURING ONBOARDING
  // ============================================================
  useEffect(() => {
    // Scroll to top when component mounts or when navigating during onboarding
    // to ensure user sees header, logo, and legal statement
    // The scrollable container is '.pages-container' in MainContainer, not window
    const scrollToTop = () => {
      const pagesContainer = document.querySelector('.pages-container');
      if (pagesContainer) {
        pagesContainer.scrollTo({ top: 0, behavior: 'smooth' });
      }
      // Fallback to window scroll (for standalone pages)
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    
    // Use a small timeout to ensure DOM is ready after navigation animation
    const timeoutId = setTimeout(scrollToTop, 100);
    
    return () => clearTimeout(timeoutId);
  }, [onboarding?.onboardingStatus?.currentStep]); // Re-run when onboarding step changes (indicates navigation)

  // ============================================================
  // LIFECYCLE - LOAD DATA
  // ============================================================
  useEffect(() => {
    loadPersonalInfo();
  }, [userId, token]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadPersonalInfo = async () => {
    const result = await apiFetchPersonalInfo();
    if (result.success) {
      const data = result.data;
      
      // Leave email blank for temp accounts - don't pre-fill with temp email
      if (isTemporaryAccount && data.email && data.email.startsWith('temp_')) {
        data.email = '';
      }
      
      setFormData(data);
    }
  };

  // ============================================================
  // EVENT HANDLERS
  // ============================================================
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
      <PersonalInfoHeader t={t} />
      
      <FormAlerts error={error} success={success} t={t} />

      <form onSubmit={handleSubmit} className="info-form">
        <BasicInfoSection
          formData={formData}
          fieldErrors={fieldErrors}
          isTemporaryAccount={isTemporaryAccount}
          handleChange={handleChange}
          t={t}
        />

        <BirthDateSection
          formData={formData}
          fieldErrors={fieldErrors}
          handleChange={handleChange}
          t={t}
        />

        <BirthLocationSection
          formData={formData}
          handleChange={handleChange}
          t={t}
        />

        <AdditionalInfoSection
          formData={formData}
          fieldErrors={fieldErrors}
          isTemporaryAccount={isTemporaryAccount}
          handleChange={handleChange}
          onLastFieldKeyDown={handleLastFieldKeyDown}
          t={t}
        />
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
