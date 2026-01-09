import { useCallback } from 'react';

/**
 * Custom hook for temporary account configuration
 * Centralizes all temp account specific logic and conditions
 * @param {boolean} isTemporaryAccount - Whether user is on temporary account
 * @returns {Object} Configuration object for temp account behavior
 */
export function useTempAccountConfig(isTemporaryAccount) {
  /**
   * Get field visibility and requirements based on account type
   */
  const getFieldConfig = useCallback(() => {
    return {
      // Name fields hidden for temp accounts
      showNameFields: !isTemporaryAccount,
      // Gender field required for regular accounts only
      genderRequired: !isTemporaryAccount,
      // Email is special for temp accounts
      emailValue: isTemporaryAccount ? 'tempuser@example.com' : '',
      emailPlaceholder: isTemporaryAccount ? 'Temporary account email' : 'you@example.com',
      emailReadOnly: isTemporaryAccount
    };
  }, [isTemporaryAccount]);

  /**
   * Get required field names based on account type
   */
  const getRequiredFields = useCallback(() => {
    const always = ['email', 'birthDate'];
    const forRegularAccounts = ['firstName', 'lastName', 'sex'];

    return isTemporaryAccount ? always : [...always, ...forRegularAccounts];
  }, [isTemporaryAccount]);

  /**
   * Get default values for data preparation
   */
  const getDefaultValues = useCallback(() => {
    return {
      firstName: isTemporaryAccount ? 'Seeker' : undefined,
      lastName: isTemporaryAccount ? 'Soul' : undefined,
      sex: isTemporaryAccount ? 'Unspecified' : undefined
    };
  }, [isTemporaryAccount]);

  /**
   * Determine post-save navigation action
   */
  const getPostSaveAction = useCallback(() => {
    return {
      shouldPollForAstrology: isTemporaryAccount,
      shouldNavigate: isTemporaryAccount,
      navigationTarget: 5, // horoscope page
      showSuccessNotification: true
    };
  }, [isTemporaryAccount]);

  /**
   * Check if all data needed for astrology sync is present
   */
  const hasCompleteAstrologyData = useCallback((formData) => {
    if (!isTemporaryAccount) {
      return false; // Don't auto-sync for regular accounts
    }
    return !!(
      formData.birthCountry &&
      formData.birthProvince &&
      formData.birthCity &&
      formData.birthTime
    );
  }, [isTemporaryAccount]);

  return {
    isTemporaryAccount,
    getFieldConfig,
    getRequiredFields,
    getDefaultValues,
    getPostSaveAction,
    hasCompleteAstrologyData
  };
}
