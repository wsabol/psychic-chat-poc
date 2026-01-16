import { useState } from 'react';
import { useSetupIntent } from './useSetupIntent';
import { useFinancialConnections } from './useFinancialConnections';
import { useMandateConfirmation } from './useMandateConfirmation';
import { logErrorFromCatch } from '../../../shared/errorLogger.js';

/**
 * Master hook that orchestrates the entire bank account addition flow
 * Combines all sub-hooks into a clean, step-based flow
 */
export function useBankAccountFlow(token) {
  const [step, setStep] = useState('idle'); // idle, connecting, mandate, confirming, success, error
  const [mandateData, setMandateData] = useState(null);
  const [globalError, setGlobalError] = useState(null);

  const setupIntent = useSetupIntent(token);
  const financialConnections = useFinancialConnections(token);
  const mandateConfirmation = useMandateConfirmation(token);

  const isLoading =
    setupIntent.loading ||
    financialConnections.loading ||
    mandateConfirmation.loading;

  const startBankConnection = async () => {
    try {
      setStep('connecting');
      setGlobalError(null);

      // Step 1: Create SetupIntent
      const setupIntentData = await setupIntent.createSetupIntent();

      // Step 2: Create Financial Connections session
      const fcSessionData = await financialConnections.createSession();

      // Step 3: Collect accounts from Financial Connections
      const sessionId = await financialConnections.collectAccounts(fcSessionData.clientSecret);

      // Step 4: Fetch linked accounts
      const accountDetails = await financialConnections.fetchLinkedAccounts(sessionId);

      // Store mandate data and show modal
      setMandateData({
        setupIntentId: setupIntentData.setupIntentId,
        setupIntentClientSecret: setupIntentData.clientSecret,
        financialAccountId: accountDetails.id,
        bankName: accountDetails.bankName,
        accountLast4: accountDetails.accountLast4,
      });

      setStep('mandate');
    } catch (err) {
      const message = err.message || 'Failed to connect bank account';
      setGlobalError(message);
      setStep('error');
      logErrorFromCatch('[FLOW] Error in bank connection:', err);
    }
  };

  const confirmMandateAndComplete = async () => {
    try {
      setStep('confirming');
      setGlobalError(null);

      if (!mandateData) {
        throw new Error('Mandate data missing');
      }

      // Step 5: Create payment method
      const paymentMethodId = await mandateConfirmation.createPaymentMethod(
        mandateData.financialAccountId
      );

      // Step 6: Confirm SetupIntent with mandate
      const setupIntent = await mandateConfirmation.confirmWithMandate(
        mandateData.setupIntentId,
        paymentMethodId
      );

      setStep('success');

      return {
        success: true,
        paymentMethodId,
        setupIntentStatus: setupIntent.status,
      };
    } catch (err) {
      const message = err.message || 'Failed to confirm mandate';
      setGlobalError(message);
      setStep('error');
      logErrorFromCatch('[FLOW] Error in mandate confirmation:', err);
      throw err;
    }
  };

  const reset = () => {
    setStep('idle');
    setMandateData(null);
    setGlobalError(null);
  };

  return {
    // State
    step,
    mandateData,
    error: globalError,
    isLoading,

    // Actions
    startBankConnection,
    confirmMandateAndComplete,
    reset,
  };
}
