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
    { id: 'payment-methods', label: t('paymentMethods.title'), icon: '💳' },
    { id: 'subscriptions', label: t('subscriptions.title'), icon: '📋' },
    { id: 'invoices', label: t('invoices.title'), icon: '📄' },
    { id: 'payments', label: 'Payments', icon: '💰' },
  ];

  return (
    <div className="page-safe-area billing-page">
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        {/* Header */}
                <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ marginTop: 0, marginBottom: '0.5rem' }}>💳 {t('billing.title')}</h1>
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
            <SubscriptionsPage userId={userId} token={token} auth={auth} />
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
