import { useState } from 'react';
import { INITIAL_FORM_DATA } from '../../../utils/personalInfoUtils';
import { validatePersonalInfoForm } from '../../../utils/validatePersonalInfoForm';

/**
 * Custom hook for managing personal info form state
 * Handles form data, validation, errors, and field changes
 * @param {Function} t - Translation function
 * @param {boolean} isTemporaryAccount - Whether user is on temporary account
 * @returns {Object} Form state and handlers
 */
export function usePersonalInfoForm(t, isTemporaryAccount) {
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  /**
   * Handle form field changes
   */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear field error when user starts typing
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  /**
   * Validate all form fields
   * @returns {Object} Validation errors object
   */
  const validateFields = () => {
    const validation = validatePersonalInfoForm(formData, isTemporaryAccount, t);
    return validation.errors;
  };

  /**
   * Set form data (for initial load)
   */
  const setForm = (data) => {
    setFormData(data);
  };

  /**
   * Reset all state
   */
  const resetForm = () => {
    setFormData(INITIAL_FORM_DATA);
    setLoading(false);
    setError(null);
    setSuccess(false);
    setFieldErrors({});
  };

  return {
    formData,
    setFormData: setForm,
    loading,
    setLoading,
    error,
    setError,
    success,
    setSuccess,
    fieldErrors,
    setFieldErrors,
    handleChange,
    validateFields,
    resetForm
  };
}
