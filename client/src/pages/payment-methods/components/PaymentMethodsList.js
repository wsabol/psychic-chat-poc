import React from 'react';
import { useTranslation } from '../../../context/TranslationContext';

export default function PaymentMethodsList({
  paymentMethods,
  defaultPaymentMethodId,
  onSetDefault,
  onDelete,
  onVerify,
}) {
  const { t } = useTranslation();
  return (
    <>
      {paymentMethods?.cards && paymentMethods.cards.length > 0 && (
        <div className="payment-methods-list">
          <h3>💳 {t('paymentMethods.savedCards')}</h3>
          <div className="methods-grid">
            {paymentMethods.cards.map((card) => {
              const isDefault = card.id === defaultPaymentMethodId;
              return (
                <div key={card.id} className="payment-method-card" style={isDefault ? { border: '2px solid #4caf50' } : {}}>
                  <div className="card-header">
                    <span className="card-brand">{card.card?.brand?.toUpperCase()}</span>
                    <span className="card-last4">●●●● {card.card?.last4}</span>
                    {isDefault && <span className="default-badge">⭐ {t('billing.default')}</span>}
                  </div>
                  <div className="card-expiry">
                    {t('paymentMethods.expires')} {card.card?.exp_month}/{card.card?.exp_year}
                  </div>
                  <div className="card-actions">
                    {!isDefault && (
                      <button className="btn-link" onClick={() => onSetDefault(card.id)}>
                        {t('paymentMethods.setAsDefault')}
                      </button>
                    )}
                    <button className="btn-danger" onClick={() => onDelete(card.id)}>
                      {t('paymentMethods.delete')}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {paymentMethods?.bankAccounts && paymentMethods.bankAccounts.length > 0 && (
        <div className="payment-methods-list">
          <h3>💰 {t('paymentMethods.savedBankAccounts')}</h3>
          <div className="methods-grid">
            {paymentMethods.bankAccounts.map((bank) => {
              // Get verification status
              const status = bank.us_bank_account?.verification_status;
              const isPending = status === 'pending_verification';
              const isDefault = bank.id === defaultPaymentMethodId;
              
              // Display status badge
              let statusDisplay = '✓ Verified';
              let statusColor = '#4caf50';
              
              if (isPending) {
                statusDisplay = '⏳ Pending Verification';
                statusColor = '#ff9800';
              }
              
              return (
                <div key={bank.id} className="payment-method-card" style={isDefault ? { border: '2px solid #4caf50' } : {}}>
                  <div className="card-header">
                    <span className="card-brand">{t('paymentMethods.bankAccount')}</span>
                    <span className="card-last4">●●●● {bank.us_bank_account?.last4}</span>
                    {isDefault && <span className="default-badge">⭐ {t('billing.default')}</span>}
                  </div>
                  <div className="card-expiry">
                    {bank.us_bank_account?.bank_name}
                  </div>
                  <div className="card-status" style={{ 
                    color: statusColor,
                    marginBottom: '10px',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}>
                    {statusDisplay}
                  </div>
                  <div className="card-actions">
                    {isPending && onVerify && (
                      <button 
                        className="btn-warning"
                        onClick={() => onVerify(bank)}
                        title={t('paymentMethods.enterMicrodeposit')}
                      >
                        🔐 {t('paymentMethods.verify')}
                      </button>
                    )}
                    {!isDefault && (
                      <button className="btn-link" onClick={() => onSetDefault(bank.id)}>
                        {t('paymentMethods.setAsDefault')}
                      </button>
                    )}
                    <button 
                      className="btn-danger" 
                      onClick={() => {
                        if (window.confirm(t('paymentMethods.deleteBankAccountConfirm'))) {
                          onDelete(bank.id);
                        }
                      }}
                                          >
                        {t('paymentMethods.delete')}
                      </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <style>{`
        .default-badge {
          background-color: #4caf50;
          color: white;
          padding: 4px 8px;
          border-radius: 3px;
          font-size: 11px;
          font-weight: 600;
          margin-left: auto;
        }

        .btn-warning {
          background-color: #ff9800;
          color: white;
          padding: 8px 12px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 600;
          margin-right: 8px;
          transition: all 0.2s;
        }

        .btn-warning:hover {
          background-color: #f57c00;
        }
      `}</style>
    </>
  );
}
