import React, { useState, useRef } from 'react';
import { fetchWithTokenRefresh } from '../../../utils/fetchWithTokenRefresh';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

/**
 * BankAccountWithFinancialConnections
 * Modern Stripe recommended approach using Plaid financial connections
 * User authenticates with bank, account is instantly verified
 */
export default function BankAccountWithFinancialConnections({
  stripeRef,
  onSuccess,
  onError,
  loading,
  onCancel,
  token,
}) {
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(null);

  const handleAddBankAccount = async () => {
    try {
      setConnecting(true);
      setError(null);

      if (!stripeRef.current) {
        throw new Error('Stripe not initialized');
      }

      const stripe = stripeRef.current;

      // Step 1: Create a Financial Connections session
      console.log('[FC] Creating Financial Connections session...');
      const sessionResponse = await fetchWithTokenRefresh(`${API_URL}/billing/financial-connections-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!sessionResponse.ok) {
        const errData = await sessionResponse.json();
        throw new Error(errData.error || 'Failed to create Financial Connections session');
      }

      const sessionData = await sessionResponse.json();
      console.log('[FC] Session created:', sessionData.sessionId);

      // Step 2: Collect bank account using Financial Connections
      console.log('[FC] Opening Financial Connections UI...');
      const { financialConnectionAccount, error: fcError } = await stripe.collectFinancialConnectionsAccounts({
        clientSecret: sessionData.clientSecret,
      });

      if (fcError) {
        throw new Error(fcError.message || 'Financial Connections failed');
      }

      if (!financialConnectionAccount) {
        throw new Error('No account selected');
      }

      console.log('[FC] Account selected:', financialConnectionAccount.id);

      // Step 3: Create payment method from financial account
      console.log('[FC] Creating payment method...');
      const pmResponse = await fetchWithTokenRefresh(`${API_URL}/billing/create-bank-account-from-financial`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          financialAccountId: financialConnectionAccount.id,
        }),
      });

      if (!pmResponse.ok) {
        const errData = await pmResponse.json();
        throw new Error(errData.error || 'Failed to create payment method');
      }

      const pmData = await pmResponse.json();
      console.log('[FC] Payment method created:', pmData.paymentMethodId);
      console.log('[FC] Verification status:', pmData.verificationStatus);

      setConnecting(false);
      onSuccess?.({
        paymentMethodId: pmData.paymentMethodId,
        verificationStatus: pmData.verificationStatus,
      });
    } catch (err) {
      console.error('[FC] Error:', err);
      setError(err.message || 'Failed to add bank account');
      onError?.(err);
      setConnecting(false);
    }
  };

  return (
    <div className="bank-account-fc">
      <div className="fc-description">
        <h4>🔐 Secure Bank Connection</h4>
        <p>
          Connect your bank account securely. Your bank will ask you to sign in and verify the connection.
          Once verified, the account is immediately ready to use.
        </p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="fc-actions">
        <button
          onClick={handleAddBankAccount}
          disabled={connecting || loading}
          className="btn-primary"
        >
          {connecting ? '🔄 Connecting...' : '🏦 Connect Bank Account'}
        </button>
        <button
          onClick={onCancel}
          disabled={connecting}
          className="btn-secondary"
        >
          Cancel
        </button>
      </div>

      <style>{`
        .bank-account-fc {
          padding: 20px;
          background: #f9f9f9;
          border-radius: 8px;
          margin: 20px 0;
        }

        .fc-description {
          margin-bottom: 20px;
        }

        .fc-description h4 {
          margin-top: 0;
          color: #333;
        }

        .fc-description p {
          color: #666;
          line-height: 1.6;
          margin: 10px 0 0 0;
        }

        .fc-actions {
          display: flex;
          gap: 10px;
        }

        .btn-primary, .btn-secondary {
          padding: 12px 20px;
          border: none;
          border-radius: 4px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-primary {
          background-color: #007bff;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background-color: #0056b3;
        }

        .btn-primary:disabled {
          background-color: #ccc;
          cursor: not-allowed;
        }

        .btn-secondary {
          background-color: #e9ecef;
          color: #333;
        }

        .btn-secondary:hover:not(:disabled) {
          background-color: #dee2e6;
        }

        .btn-secondary:disabled {
          opacity: 0.6;
        }

        .alert {
          padding: 12px;
          border-radius: 4px;
          margin-bottom: 15px;
        }

        .alert-error {
          background-color: #f8d7da;
          border: 1px solid #f5c6cb;
          color: #721c24;
        }
      `}</style>
    </div>
  );
}
