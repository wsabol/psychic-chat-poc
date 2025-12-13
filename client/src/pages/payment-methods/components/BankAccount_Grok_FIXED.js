import React, { useState } from 'react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

/**
 * BankAccount_Grok - Following Grok's recommended approach
 * Uses stripe.collectBankAccountForSetup() which handles:
 * - OAuth instant verification (Financial Connections)
 * - Manual entry with microdeposit fallback
 * - Everything automatically
 */
export default function BankAccount({
  setupIntentClientSecret,
  token,
  onSuccess,
  onError,
  onCancel,
  loading,
}) {
  const [collecting, setCollecting] = useState(false);
  const [error, setError] = useState(null);

  const handleAddBank = async () => {
    console.log('[BANK] setupIntentClientSecret:', setupIntentClientSecret);
    if (!setupIntentClientSecret) {
      setError('Setup intent not ready');
      return;
    }
    try {
      setCollecting(true);
      setError(null);

      console.log('[BANK] Getting Stripe instance...');
      if (!window.Stripe) {
        throw new Error('Stripe not initialized');
      }

      // Use publishable key from environment
      const stripe = window.Stripe(process.env.REACT_APP_STRIPE_PUBLIC_KEY);
      
      console.log('[BANK] Calling stripe.collectBankAccountForSetup...');
      console.log('[BANK] First param (object with clientSecret):', {
        clientSecret: setupIntentClientSecret,
      });
      
      // CORRECT: First parameter is an OBJECT with clientSecret inside
      const { error: collectError, setupIntent } = await stripe.collectBankAccountForSetup(
        {
          clientSecret: setupIntentClientSecret,
        },
        {
          fields: {
            billingDetails: {
              address: {
                country: 'us',
              },
            },
          },
        }
      );

      if (collectError) {
        throw new Error(collectError.message || 'Failed to collect bank account');
      }

      if (!setupIntent) {
        throw new Error('No setup intent returned');
      }

      console.log('[BANK] Setup intent result:', {
        id: setupIntent.id,
        status: setupIntent.status,
        paymentMethodId: setupIntent.payment_method,
      });

      // Optionally confirm server-side for added security
      if (setupIntent.status === 'requires_action') {
        console.log('[BANK] Requires action - might need microdeposit verification');
      }

      if (setupIntent.status === 'succeeded') {
        console.log('[BANK] Setup intent succeeded - bank account is ready');
      }

      setCollecting(false);
      onSuccess?.({
        setupIntentId: setupIntent.id,
        paymentMethodId: setupIntent.payment_method,
        status: setupIntent.status,
      });
    } catch (err) {
      console.error('[BANK] Error:', err);
      setError(err.message);
      onError?.(err);
      setCollecting(false);
    }
  };

  return (
    <div className="bank-account-container">
      <div className="bank-info">
        <h4>🏦 Connect Your Bank Account</h4>
        <p>
          Add your US bank account for ACH payments. You can either link via your bank 
          (instant verification) or enter your account details manually. Either way, it'll be ready to use!
        </p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <button
        onClick={handleAddBank}
        disabled={collecting || loading}
        className="btn-add-bank"
      >
        {collecting ? '🔄 Connecting Bank...' : '🏦 Add Bank Account'}
      </button>

      <button
        onClick={onCancel}
        disabled={collecting}
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
