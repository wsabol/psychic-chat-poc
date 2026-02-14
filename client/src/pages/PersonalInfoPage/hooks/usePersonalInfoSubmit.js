import { parseDateForStorage } from '../../../utils/dateFormatting';
import { preparePersonalInfoData, TIMING } from '../../../utils/personalInfoUtils';
import { logErrorFromCatch } from '../../../shared/errorLogger.js';

/**
 * Custom hook for orchestrating the personal info submission workflow
 * Handles: validation → save → astrology sync → progress tracking → navigation
 * @param {Object} params - Configuration parameters
 * @returns {Object} Submit handler
 */
export function usePersonalInfoSubmit({
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
}) {
  /**
   * Main submit handler - orchestrates entire workflow
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Step 1: Validate form
    const errors = validateFields();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setError(t('personalInfo.errors.missingRequired'));
      return;
    }

    setLoading(true);
    setFieldErrors({});

    try {
      // Step 2: Prepare data for submission
      const storageBirthDate = parseDateForStorage(formData.birthDate);
      const dataToSend = preparePersonalInfoData(formData, isTemporaryAccount, storageBirthDate);

      // Step 3: Save personal info and wait for completion
      await savePersonalInfo(dataToSend);

      // Step 4: Trigger astrology calculation (for non-temp accounts with complete data)
      await handleAstrologySyncIfNeeded();

      // Step 5: Show success
      setSuccess(true);

      // Step 6: Update progress tracking
      await updateProgressTracking();

      // Step 7: Navigate to next page
      await handleNavigation();

    } catch (err) {
      logErrorFromCatch('[PERSONAL-INFO] Submission error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Save personal info to server
   */
  const savePersonalInfo = async (dataToSend) => {
    const result = await apiSavePersonalInfo(dataToSend);
    if (!result.success) {
      throw new Error(result.error || 'Failed to save personal information');
    }
  };

  /**
   * Trigger astrology sync if conditions are met
   */
  const handleAstrologySyncIfNeeded = async () => {
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
  };

  /**
   * Update free trial or onboarding progress
   */
  const updateProgressTracking = async () => {
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
  };

  /**
   * Handle post-save navigation
   */
  const handleNavigation = async () => {
    const shouldNav = shouldNavigateAfterSave();
    
    if (shouldNav) {
      // Navigate with astrology polling
      await navigateToTarget(true);
    } else {
      // Just show success message temporarily
      setTimeout(() => setSuccess(false), TIMING.SUCCESS_DISPLAY_MS);
    }
  };

  return {
    handleSubmit
  };
}
