import { useCallback } from 'react';

export function usePaymentHandlers({
  billing,
  setupIntent,
  billingForm,
  bankForm,
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
      
      // Use the same Stripe instance that created the Elements
      const stripe = stripeRef.current;

      // Build billing details - only include address if all fields are provided
      const billingDetails = {
        name: billingForm.cardholderName,
        email: auth?.authEmail,
      };

      // Only add address if all required fields are filled
      if (billingForm.billingAddress && billingForm.billingCity && billingForm.billingState && billingForm.billingZip) {
        billingDetails.address = {
          line1: billingForm.billingAddress,
          city: billingForm.billingCity,
          state: billingForm.billingState,
          postal_code: billingForm.billingZip,
        };
      }

      console.log('[CARD] Creating payment method with:', billingDetails);

      // Step 1: Create PaymentMethod from card element using the SAME Stripe instance
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

      console.log('[CARD] PaymentMethod created:', paymentMethodResponse.paymentMethod.id);

      // Step 2: Confirm SetupIntent with PaymentMethod
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

  const handleBankSubmit = useCallback(async (e) => {
    e.preventDefault();

    if (!bankForm.routingNumber || !bankForm.accountNumber) {
      setCardError('Please fill in routing and account numbers');
      return;
    }

    if (!setupIntent || !stripeRef.current) {
      setCardError('Payment system not ready');
      return;
    }

    try {
      setLoading(true);
      setCardError(null);
      const stripe = stripeRef.current;

      // Build billing details - only include address if all fields are provided
      const billingDetails = {
        name: bankForm.accountHolderName,
        email: auth?.authEmail,
      };

      if (bankForm.billingAddress && bankForm.billingCity && bankForm.billingState && bankForm.billingZip) {
        billingDetails.address = {
          line1: bankForm.billingAddress,
          city: bankForm.billingCity,
          state: bankForm.billingState,
          postal_code: bankForm.billingZip,
        };
      }

      console.log('[BANK] Creating payment method with:', billingDetails);

      // Step 1: Create a payment method from bank details
      const paymentMethodResponse = await stripe.createPaymentMethod({
        type: 'us_bank_account',
        us_bank_account: {
          account_holder_type: 'individual',
          account_number: bankForm.accountNumber,
          routing_number: bankForm.routingNumber,
          account_type: bankForm.accountType,
        },
        billing_details: billingDetails,
      });

      if (paymentMethodResponse.error) {
        setCardError(paymentMethodResponse.error.message || 'Failed to create bank account');
        setLoading(false);
        return;
      }

      console.log('[BANK] PaymentMethod created:', paymentMethodResponse.paymentMethod.id);

      // Step 2: Confirm setup intent with the payment method ID
      const response = await stripe.confirmUsBankAccountSetup(
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
      
      // For bank accounts, both 'succeeded' and 'requires_action' are valid
      // 'requires_action' means the bank account was created but needs verification
      // 'succeeded' means it's ready to use immediately
      if (result && (result.status === 'succeeded' || result.status === 'requires_action')) {
        setCardSuccess(true);
        setShowAddPaymentForm(false);
        resetBankForm();
        await billing.fetchPaymentMethods();
        
        // Show appropriate message based on status
        let message = 'Bank account added successfully!';
        if (result.status === 'requires_action') {
          message = 'Bank account added! Verification may be required by your bank.';
          console.log('[BANK] Setup intent requires action:', result.status);
        }
        
        setTimeout(() => setCardSuccess(false), 3000);
      } else {
        setCardError('Failed to confirm bank account. Status: ' + (result?.status || 'unknown'));
      }
    } catch (err) {
      setCardError(err.message || 'Bank account setup failed');
    } finally {
      setLoading(false);
    }
  }, [setupIntent, bankForm, auth, setCardError, setCardSuccess, setLoading, setShowAddPaymentForm, resetBankForm, billing, stripeRef]);

  return {
    handleAddPaymentMethod,
    handleDeletePaymentMethod,
    handleSetDefault,
    handleCardSubmit,
    handleBankSubmit,
  };
}
