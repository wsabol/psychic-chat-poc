import { useCallback } from 'react';

export function usePaymentHandlers({
  billing,
  setupIntent,
  billingForm,
  auth,
  setCardError,
  setCardSuccess,
  setLoading,
  setShowAddPaymentForm,
  resetBillingForm,
  resetBankForm,
  stripeRef,
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

  const handleCardSubmit = useCallback(async (cardElement) => {
    if (!setupIntent || !stripeRef.current) {
      setCardError('Payment system not ready');
      return;
    }

    if (!billingForm.cardholderName) {
      setCardError('Please enter cardholder name');
      return;
    }

    try {
      setLoading(true);
      setCardError(null);
      
      const stripe = stripeRef.current;

      const billingDetails = {
        name: billingForm.cardholderName,
        email: auth?.authEmail,
      };

      const paymentMethodResponse = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
        billing_details: billingDetails,
      });

      if (paymentMethodResponse.error) {
        setCardError(paymentMethodResponse.error.message || 'Failed to create payment method');
        setLoading(false);
        return;
      }

      const response = await stripe.confirmCardSetup(
        setupIntent.clientSecret,
        {
          payment_method: paymentMethodResponse.paymentMethod.id,
        }
      );

      if (response.error) {
        setCardError(response.error.message || 'Stripe error occurred');
        setLoading(false);
        return;
      }

      const result = response.setupIntent;
      if (result && result.status === 'succeeded') {
        setCardSuccess(true);
        setShowAddPaymentForm(false);
        resetBillingForm();
        await billing.fetchPaymentMethods();
        setTimeout(() => setCardSuccess(false), 3000);
      } else {
        setCardError('Failed to confirm payment method. Status: ' + (result?.status || 'unknown'));
      }
    } catch (err) {
      setCardError(err.message || 'Payment method setup failed');
    } finally {
      setLoading(false);
    }
  }, [setupIntent, billingForm, auth, setCardError, setCardSuccess, setLoading, setShowAddPaymentForm, resetBillingForm, billing, stripeRef]);

  const handleBankSubmit = useCallback(async (formData) => {
    try {
      setLoading(true);
      setCardError(null);

      if (!setupIntent || !stripeRef.current) {
        throw new Error('Payment system not ready');
      }

      const stripe = stripeRef.current;

      console.log('[BANK] Creating payment method...');
      
      const paymentMethodResponse = await stripe.createPaymentMethod({
        type: 'us_bank_account',
        us_bank_account: {
          account_holder_type: 'individual',
          account_number: formData.accountNumber,
          routing_number: formData.routingNumber,
          account_type: formData.accountType,
        },
        billing_details: {
          name: formData.accountHolderName,
          email: auth?.authEmail,
        },
      });

      if (paymentMethodResponse.error) {
        throw new Error(paymentMethodResponse.error.message || 'Failed to create bank account');
      }

      const paymentMethodId = paymentMethodResponse.paymentMethod.id;
      console.log('[BANK] Payment method created:', paymentMethodId);

      console.log('[BANK] Confirming setup intent...');
      
      const response = await stripe.confirmUsBankAccountSetup(
        setupIntent.clientSecret,
        {
          payment_method: paymentMethodId,
          mandate_data: {
            customer_acceptance: {
              type: 'online',
              accepted_at: Math.floor(Date.now() / 1000),
            },
          },
        }
      );

      if (response.error) {
        throw new Error(response.error.message || 'Stripe error occurred');
      }

      console.log('[BANK] Setup intent status:', response.setupIntent?.status);
      
      // Success - account added (Stripe will handle verification automatically)
      setCardSuccess(true);
      setShowAddPaymentForm(false);
      resetBankForm();
      await billing.fetchPaymentMethods();
      setTimeout(() => setCardSuccess(false), 3000);
    } catch (err) {
      console.error('[BANK] Error:', err);
      setCardError(err.message || 'Failed to add bank account');
    } finally {
      setLoading(false);
    }
  }, [setupIntent, auth, setCardError, setCardSuccess, setLoading, setShowAddPaymentForm, resetBankForm, billing, stripeRef]);

  return {
    handleAddPaymentMethod,
    handleDeletePaymentMethod,
    handleSetDefault,
    handleCardSubmit,
    handleBankSubmit,
  };
}

