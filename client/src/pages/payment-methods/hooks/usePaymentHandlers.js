import { useCallback } from 'react';

/**
 * Payment handlers - Card only (ACH removed)
 */
export function usePaymentHandlers({
  billing,
  setCardError,
  setCardSuccess,
  setLoading,
  setShowAddPaymentForm,
}) {
  const handleAddPaymentMethod = useCallback(async () => {
    try {
      setCardError(null);
      const intent = await billing.createSetupIntent();
      setShowAddPaymentForm(true);
      return intent;
    } catch (err) {
      setCardError(err.message || 'Failed to prepare payment form');
      return null;
    }
  }, [billing, setCardError, setShowAddPaymentForm]);

  const handleDeletePaymentMethod = useCallback(async (paymentMethodId) => {
    if (!window.confirm('Are you sure you want to delete this payment method?')) {
      return;
    }

    try {
      await billing.deletePaymentMethod(paymentMethodId);
      await billing.fetchPaymentMethods();
      setCardSuccess(true);
      setTimeout(() => setCardSuccess(false), 3000);
    } catch (err) {
      setCardError(err.message || 'Failed to delete payment method');
    }
  }, [billing, setCardError, setCardSuccess]);

  const handleSetDefault = useCallback(async (paymentMethodId) => {
    try {
      await billing.setDefaultPaymentMethod(paymentMethodId);
      await billing.fetchPaymentMethods();
      setCardSuccess(true);
      setTimeout(() => setCardSuccess(false), 3000);
    } catch (err) {
      setCardError(err.message || 'Failed to set default payment method');
    }
  }, [billing, setCardError, setCardSuccess]);

  return {
    handleAddPaymentMethod,
    handleDeletePaymentMethod,
    handleSetDefault,
  };
}
