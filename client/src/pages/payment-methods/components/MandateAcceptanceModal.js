import React, { useState } from 'react';

/**
 * MandateAcceptanceModal
 * Displays the ACH debit mandate that customers must accept before debits can be made
 * Required by Nacha rules for ACH payments
 */
export default function MandateAcceptanceModal({
  bankName,
  accountLast4,
  onAccept,
  onCancel,
  loading,
}) {
  const [accepted, setAccepted] = useState(false);

  const handleAccept = () => {
    if (accepted) {
      onAccept();
    }
  };

  return (
    <div className="mandate-modal-overlay">
      <div className="mandate-modal-content">
        <h3>ACH Debit Authorization Agreement</h3>
        
        <div className="mandate-text">
          <p>
            <strong>Important: Please read this authorization agreement carefully</strong>
          </p>

          <div className="mandate-details">
            <h4>Account Authorization</h4>
            <p>
              By checking the box below, you authorize <strong>Starship Psychics</strong> to debit the bank account specified below 
              for any amount owed for charges arising from your use of Starship Psychics' services and/or purchase of products from 
              Starship Psychics, pursuant to Starship Psychics' website and terms, until this authorization is revoked.
            </p>

            <h4>Account Information</h4>
            <p>
              <strong>Bank:</strong> {bankName || 'Your Bank'}<br />
              <strong>Account:</strong> ●●●● {accountLast4}
            </p>

            <h4>Recurring Payments</h4>
            <p>
              If you use Starship Psychics' services or purchase additional products periodically pursuant to Starship Psychics' terms, 
              you authorize Starship Psychics to debit your bank account periodically for these charges. Payments that fall outside 
              of the regular debits authorized above will only be debited after your authorization is obtained.
            </p>

            <h4>Cancellation</h4>
            <p>
              You may amend or cancel this authorization at any time by providing notice to Starship Psychics with 30 (thirty) days notice.
            </p>

            <h4>Processing Time</h4>
            <p>
              ACH payments may take up to 4 business days to complete. You will be notified when the debit has been processed.
            </p>

            <h4>Disputes</h4>
            <p>
              If you believe an unauthorized debit has occurred, you may dispute the transaction with your bank. 
              Disputes must be initiated within 60 days of the debit on a personal account, or 2 business days for a business account.
            </p>
          </div>

          <div className="mandate-acceptance">
            <input
              type="checkbox"
              id="mandate-accept"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              className="mandate-checkbox"
            />
            <label htmlFor="mandate-accept">
              I authorize Starship Psychics to debit my bank account as described above
            </label>
          </div>
        </div>

        <div className="mandate-actions">
          <button
            className="btn-primary"
            onClick={handleAccept}
            disabled={!accepted || loading}
          >
            {loading ? 'Processing...' : 'Accept & Continue'}
          </button>
          <button
            className="btn-secondary"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </button>
        </div>

        <style>{`
          .mandate-modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
          }

          .mandate-modal-content {
            background: white;
            border-radius: 8px;
            padding: 30px;
            max-width: 600px;
            max-height: 80vh;
            overflow-y: auto;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }

          .mandate-modal-content h3 {
            margin: 0 0 20px 0;
            color: #333;
            font-size: 20px;
            border-bottom: 2px solid #f0f0f0;
            padding-bottom: 10px;
          }

          .mandate-text {
            margin-bottom: 20px;
            color: #555;
            line-height: 1.8;
            font-size: 14px;
          }

          .mandate-text p {
            margin: 10px 0;
          }

          .mandate-details {
            background-color: #f9f9f9;
            padding: 15px;
            border-radius: 4px;
            margin: 15px 0;
          }

          .mandate-details h4 {
            margin: 15px 0 8px 0;
            color: #333;
            font-size: 14px;
            font-weight: 600;
          }

          .mandate-details h4:first-child {
            margin-top: 0;
          }

          .mandate-details p {
            margin: 8px 0;
            font-size: 13px;
          }

          .mandate-acceptance {
            background-color: #f0f8ff;
            padding: 15px;
            border-radius: 4px;
            border-left: 4px solid #4caf50;
            margin: 20px 0;
            display: flex;
            align-items: flex-start;
            gap: 10px;
          }

          .mandate-checkbox {
            margin-top: 4px;
            cursor: pointer;
            width: 18px;
            height: 18px;
          }

          .mandate-acceptance label {
            margin: 0;
            cursor: pointer;
            font-weight: 500;
            color: #333;
            font-size: 14px;
          }

          .mandate-actions {
            display: flex;
            gap: 10px;
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid #eee;
          }

          .btn-primary, .btn-secondary {
            padding: 10px 20px;
            border: none;
            border-radius: 4px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            flex: 1;
          }

          .btn-primary {
            background-color: #4caf50;
            color: white;
          }

          .btn-primary:hover:not(:disabled) {
            background-color: #45a049;
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
        `}</style>
      </div>
    </div>
  );
}
