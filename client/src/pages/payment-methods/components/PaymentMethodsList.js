import React from 'react';

export default function PaymentMethodsList({
  paymentMethods,
  onSetDefault,
  onDelete,
}) {
  return (
    <>
      {paymentMethods?.cards && paymentMethods.cards.length > 0 && (
        <div className="payment-methods-list">
          <h3>💳 Saved Cards</h3>
          <div className="methods-grid">
            {paymentMethods.cards.map((card) => (
              <div key={card.id} className="payment-method-card">
                <div className="card-header">
                  <span className="card-brand">{card.card?.brand?.toUpperCase()}</span>
                  <span className="card-last4">●●●● {card.card?.last4}</span>
                </div>
                <div className="card-expiry">
                  Expires {card.card?.exp_month}/{card.card?.exp_year}
                </div>
                <div className="card-actions">
                  <button className="btn-link" onClick={() => onSetDefault(card.id)}>
                    Set as Default
                  </button>
                  <button className="btn-danger" onClick={() => onDelete(card.id)}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {paymentMethods?.bankAccounts && paymentMethods.bankAccounts.length > 0 && (
        <div className="payment-methods-list">
          <h3>🏦 Saved Bank Accounts</h3>
          <div className="methods-grid">
            {paymentMethods.bankAccounts.map((bank) => (
              <div key={bank.id} className="payment-method-card">
                <div className="card-header">
                  <span className="card-brand">Bank Account</span>
                  <span className="card-last4">●●●● {bank.us_bank_account?.last4}</span>
                </div>
                <div className="card-expiry">
                  {bank.us_bank_account?.bank_name}
                </div>
                <div className="card-actions">
                  <button className="btn-link" onClick={() => onSetDefault(bank.id)}>
                    Set as Default
                  </button>
                  <button className="btn-danger" onClick={() => onDelete(bank.id)}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
