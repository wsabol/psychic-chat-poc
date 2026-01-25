import React, { useState, useEffect } from 'react';
import { useTranslation } from '../context/TranslationContext';
import PaymentMethodPage from './PaymentMethodPage';
import SubscriptionsPage from './SubscriptionsPage';
import InvoicesPage from './InvoicesPage';
import PaymentsPage from './PaymentsPage';
import './BillingPage.css';

/**
 * BillingPage - Main billing container with tabs for different sections
 * Displays: Payment Methods, Subscriptions, Invoices, Payments
 */
export default function BillingPage({ userId, token, auth, onboarding, defaultTab = 'payment-methods' }) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState(defaultTab);

  // Update active tab when defaultTab prop changes
  useEffect(() => {
    if (defaultTab) {
      setActiveTab(defaultTab);
    }
  }, [defaultTab]);

  const tabs = [
    { id: 'payment-methods', label: t('paymentMethods.title'), icon: '\uD83D\uDCB3' },
    { id: 'subscriptions', label: t('subscriptions.title'), icon: '\uD83D\uDCCB' },
    { id: 'invoices', label: t('invoices.title'), icon: '\uD83D\uDCC4' },
    { id: 'payments', label: t('paymentHistory.title'), icon: '\uD83D\uDCB0' },
  ];

  return (
    <div className="page-safe-area billing-page">
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <h2 className="heading-primary">{'\uD83D\uDCB3'} {t('billing.title')}</h2>
          <p style={{ color: '#666', marginBottom: 0 }}>
            {t('billing.title')}
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="billing-tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`billing-tab ${activeTab === tab.id ? 'active' : ''}`}
            >
              <span className="tab-icon">{tab.icon}</span>
              <span className="tab-label">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="billing-content">
          {activeTab === 'payment-methods' && (
            <PaymentMethodPage userId={userId} token={token} auth={auth} onboarding={onboarding} />
          )}
          {activeTab === 'subscriptions' && (
            <SubscriptionsPage userId={userId} token={token} auth={auth} onboarding={onboarding} />
          )}
          {activeTab === 'invoices' && (
            <InvoicesPage userId={userId} token={token} auth={auth} />
          )}
          {activeTab === 'payments' && (
            <PaymentsPage userId={userId} token={token} auth={auth} />
          )}
        </div>
      </div>
    </div>
  );
}
