import React, { useState } from 'react';
import { fetchWithTokenRefresh } from '../../../utils/fetchWithTokenRefresh';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

/**
 * BankAccount - Complete working flow
 * 1. Create Financial Connections session
 * 2. User authenticates with bank
 * 3. Fetch linked accounts from session
 * 4. Create payment method from account
 * 5. Success - account appears in list
 */
export default function BankAccount({
  token,
  onSuccess,
  onError,
  onCancel,
  loading,
}) {
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(null);

  const handleAddBank = async () => {
    try {
      setConnecting(true);
      setError(null);

      // Step 1: Create Financial Connections session
      console.log('[BANK] Creating Financial Connections session...');
      const sessionRes = await fetchWithTokenRefresh(
        `${API_URL}/billing/financial-connections-session`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!sessionRes.ok) {
        throw new Error('Failed to create Financial Connections session');
      }

      const sessionData = await sessionRes.json();
      console.log('[BANK] Session created:', sessionData);

      // Step 2: Get Stripe instance
      if (!window.Stripe) {
        throw new Error('Stripe not initialized');
      }

      const stripe = window.Stripe(process.env.REACT_APP_STRIPE_PUBLIC_KEY);

      // Step 3: Collect bank accounts - user authenticates and selects
      console.log('[BANK] Calling stripe.collectFinancialConnectionsAccounts...');
      const result = await stripe.collectFinancialConnectionsAccounts({
        clientSecret: sessionData.clientSecret,
      });

      console.log('[BANK] Result:', result);

      if (result.error) {
        throw new Error(result.error.message || 'Financial Connections failed');
      }

      // Step 4: Get sessionId and fetch the linked accounts
      const sessionId = result.financialConnectionsSession?.id;
      console.log('[BANK] Session ID:', sessionId);

      if (!sessionId) {
        throw new Error('No session ID - user may have cancelled');
      }

      console.log('[BANK] Fetching linked accounts from session...');
      const accountsRes = await fetchWithTokenRefresh(
        `${API_URL}/billing/get-financial-accounts`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ sessionId }),
        }
      );

      if (!accountsRes.ok) {
        const err = await accountsRes.json();
        throw new Error(err.error || 'Failed to fetch accounts from session');
      }

      const accountsData = await accountsRes.json();
      const accounts = accountsData.accounts?.data || [];
      console.log('[BANK] Linked accounts:', accounts);

      if (!accounts || accounts.length === 0) {
        throw new Error('No bank accounts were selected');
      }

      // Step 5: Create payment method for the first account
      const accountId = accounts[0].id;
      console.log('[BANK] Creating payment method for account:', accountId);

      const pmRes = await fetchWithTokenRefresh(
        `${API_URL}/billing/create-bank-account-from-financial`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ financialAccountId: accountId }),
        }
      );

      if (!pmRes.ok) {
        const err = await pmRes.json();
        throw new Error(err.error || 'Failed to create payment method');
      }

      const pmData = await pmRes.json();
      console.log('[BANK] Payment method created successfully:', pmData);

      setConnecting(false);
      onSuccess?.({
        success: true,
        paymentMethodId: pmData.paymentMethodId,
        message: 'Bank account added successfully',
      });
    } catch (err) {
      console.error('[BANK] Error:', err);
      setError(err.message);
      onError?.(err);
      setConnecting(false);
    }
  };

  return (
    <div className="bank-account-container">
      <div className="bank-info">
        <h4>🏦 Connect Your Bank Account</h4>
        <p>
          Securely link your US bank account. You'll authenticate with your bank once,
          and your account will be verified instantly. No waiting, no manual verification needed.
        </p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <button
        onClick={handleAddBank}
        disabled={connecting || loading}
        className="btn-add-bank"
      >
        {connecting ? '🔄 Connecting to Bank...' : '🏦 Connect Bank Account'}
      </button>

      <button
        onClick={onCancel}
        disabled={connecting}
        className="btn-cancel-bank"
      >
        Cancel
      </button>

      <style>{`
        .bank-account-container {
          padding: 20px;
          background: #f9f9f9;
          border-radius: 8px;
          margin: 20px 0;
        }

        .bank-info {
          margin-bottom: 20px;
        }

        .bank-info h4 {
          margin: 0 0 10px 0;
          color: #333;
          font-size: 18px;
        }

        .bank-info p {
          margin: 0;
          color: #666;
          line-height: 1.6;
          font-size: 14px;
        }

        .btn-add-bank, .btn-cancel-bank {
          padding: 12px 20px;
          margin-right: 10px;
          margin-top: 15px;
          border: none;
          border-radius: 4px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-add-bank {
          background-color: #28a745;
          color: white;
        }

        .btn-add-bank:hover:not(:disabled) {
          background-color: #218838;
        }

        .btn-add-bank:disabled {
          background-color: #ccc;
          cursor: not-allowed;
        }

        .btn-cancel-bank {
          background-color: #e9ecef;
          color: #333;
        }

        .btn-cancel-bank:hover:not(:disabled) {
          background-color: #dee2e6;
        }

        .btn-cancel-bank:disabled {
          opacity: 0.6;
        }

        .alert {
          padding: 12px;
          border-radius: 4px;
          margin-bottom: 15px;
          font-size: 14px;
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


