import React from 'react';
import { useBankAccountFlow } from '../hooks/useBankAccountFlow';
import MandateAcceptanceModal from './MandateAcceptanceModal';

/**
 * BankAccount Component - Simple, thin UI layer
 * All logic is abstracted into useBankAccountFlow hook
 */
export default function BankAccount({
  token,
  onSuccess,
  onError,
  onCancel,
  loading: externalLoading,
}) {
  const flow = useBankAccountFlow(token);

  const handleAddBank = async () => {
    try {
      await flow.startBankConnection();
    } catch (err) {
      onError?.(err);
    }
  };

  const handleMandateAccept = async () => {
    try {
      const result = await flow.confirmMandateAndComplete();
      flow.reset();
      onSuccess?.(result);
    } catch (err) {
      onError?.(err);
    }
  };

  const handleMandateCancel = () => {
    flow.reset();
    onCancel?.();
  };

  const isConnecting = flow.step === 'connecting';
  const showMandateModal = flow.step === 'mandate' && flow.mandateData;
  const isConfirming = flow.step === 'confirming';
  const isLoading = flow.isLoading || externalLoading;

  return (
    <>
      <div className="bank-account-container">
        <div className="bank-info">
          <h4>🏦 Connect Your Bank Account</h4>
          <p>
            Securely link your US bank account. You'll authenticate with your bank once,
            and your account will be verified instantly. No waiting, no manual verification needed.
          </p>
        </div>

        {flow.error && <div className="alert alert-error">{flow.error}</div>}

        <button
          onClick={handleAddBank}
          disabled={isConnecting || isLoading || isConfirming}
          className="btn-add-bank"
        >
          {isConnecting ? '🔄 Connecting to Bank...' : '🏦 Connect Bank Account'}
        </button>

        <button
          onClick={onCancel}
          disabled={isConnecting || isConfirming}
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

          .btn-add-bank,
          .btn-cancel-bank {
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

      {showMandateModal && (
        <MandateAcceptanceModal
          bankName={flow.mandateData.bankName}
          accountLast4={flow.mandateData.accountLast4}
          onAccept={handleMandateAccept}
          onCancel={handleMandateCancel}
          loading={isConfirming}
        />
      )}
    </>
  );
}
