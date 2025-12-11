import { useState, useRef } from 'react';

export function usePaymentForm() {
  const [showAddPaymentForm, setShowAddPaymentForm] = useState(false);
  const [paymentMethodType, setPaymentMethodType] = useState('card');
  const [setupIntent, setSetupIntent] = useState(null);
  const [cardError, setCardError] = useState(null);
  const [cardSuccess, setCardSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // Bank verification modal state
  const [showBankVerificationModal, setShowBankVerificationModal] = useState(false);
  const [pendingSetupIntent, setPendingSetupIntent] = useState(null);

  // Billing form state (used for both card and bank)
  const [billingForm, setBillingForm] = useState({
    cardholderName: '',
    billingAddress: '',
    billingCity: '',
    billingState: '',
    billingZip: '',
  });

  // Bank form state
  const [bankForm, setBankForm] = useState({
    accountHolderName: '',
    accountType: 'checking',
    routingNumber: '',
    accountNumber: '',
    billingAddress: '',
    billingCity: '',
    billingState: '',
    billingZip: '',
  });

  // Ref for storing card element from CardPaymentForm
  const cardElementRef = useRef(null);
  
  // Ref for storing Stripe instance from CardPaymentForm
  const stripeRef = useRef(null);

  const resetBillingForm = () => {
    setBillingForm({
      cardholderName: '',
      billingAddress: '',
      billingCity: '',
      billingState: '',
      billingZip: '',
    });
  };

  const resetBankForm = () => {
    setBankForm({
      accountHolderName: '',
      accountType: 'checking',
      routingNumber: '',
      accountNumber: '',
      billingAddress: '',
      billingCity: '',
      billingState: '',
      billingZip: '',
    });
  };

  const clearMessages = () => {
    setCardError(null);
    setCardSuccess(false);
  };

  return {
    showAddPaymentForm,
    setShowAddPaymentForm,
    paymentMethodType,
    setPaymentMethodType,
    setupIntent,
    setSetupIntent,
    cardError,
    setCardError,
    cardSuccess,
    setCardSuccess,
    loading,
    setLoading,
    billingForm,
    setBillingForm,
    bankForm,
    setBankForm,
    resetBillingForm,
    resetBankForm,
    clearMessages,
    cardElementRef,
    stripeRef,
    showBankVerificationModal,
    setShowBankVerificationModal,
    pendingSetupIntent,
    setPendingSetupIntent,
  };
}
