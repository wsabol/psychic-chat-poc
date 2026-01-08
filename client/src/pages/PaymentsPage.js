import React, { useState, useEffect } from 'react';
import { useTranslation } from '../context/TranslationContext';
import { useBilling } from '../hooks/useBilling';
import './PaymentsPage.css';

/**
 * PaymentsPage - View payment transaction history
 */
export default function PaymentsPage({ userId, token, auth }) {
  const { t } = useTranslation();
  const billing = useBilling(token);
  const [filterStatus, setFilterStatus] = useState('all');
  const [dateRange, setDateRange] = useState('all');

  // Load payments on mount
  useEffect(() => {
    billing.fetchPayments();
  }, [billing]);

  const formatDate = (timestamp) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatAmount = (amount, currency) => {
    const value = (amount / 100).toFixed(2);
    return `${currency?.toUpperCase() || 'USD'} $${value}`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'succeeded':
        return 'success';
      case 'pending':
        return 'warning';
      case 'failed':
      case 'declined':
        return 'danger';
      default:
        return 'default';
    }
  };

  const getPaymentMethod = (charge) => {
    if (charge.payment_method_details?.card) {
      const card = charge.payment_method_details.card;
      return `${card.brand?.toUpperCase()} ●●●● ${card.last4}`;
    }
    if (charge.payment_method_details?.us_bank_account) {
      const bank = charge.payment_method_details.us_bank_account;
      return `${t('paymentHistory.bank')} ●●●● ${bank.last4}`;
    }
    return charge.payment_method_details?.type?.toUpperCase() || t('paymentHistory.unknown');
  };

  const filterPaymentsByDate = () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    return billing.payments.filter(payment => {
      const paymentDate = new Date(payment.created * 1000);
      
      switch (dateRange) {
        case '30days':
          return paymentDate >= thirtyDaysAgo;
        case 'month':
          return paymentDate >= startOfMonth;
        case 'year':
          return paymentDate >= startOfYear;
        default:
          return true;
      }
    });
  };

  const filteredPayments = filterPaymentsByDate().filter(payment => {
    if (filterStatus === 'all') return true;
    return payment.status === filterStatus;
  });

  const totalAmount = filteredPayments
    .filter(p => p.status === 'succeeded')
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="payments-page">
      {/* Header */}
      <div className="section-header">
        <h2>💰 {t('paymentHistory.title')}</h2>
        <p>{t('paymentHistory.trackPayments')}</p>
      </div>

      {/* Summary Cards */}
      {filteredPayments.length > 0 && (
        <div className="summary-cards">
          <div className="summary-card">
            <div className="summary-label">{t('paymentHistory.totalPayments')}</div>
            <div className="summary-value">{filteredPayments.length}</div>
          </div>
          <div className="summary-card">
            <div className="summary-label">{t('paymentHistory.totalAmount')}</div>
            <div className="summary-value">{formatAmount(totalAmount, 'USD')}</div>
          </div>
          <div className="summary-card">
            <div className="summary-label">{t('paymentHistory.successful')}</div>
            <div className="summary-value">
              {filteredPayments.filter(p => p.status === 'succeeded').length}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      {billing.payments && billing.payments.length > 0 && (
        <div className="filters-bar">
          <div className="filter-group">
            <label htmlFor="status-filter">{t('paymentHistory.filterStatus')}</label>
            <select
              id="status-filter"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="form-select"
            >
              <option value="all">{t('paymentHistory.all')}</option>
              <option value="succeeded">{t('paymentHistory.succeeded')}</option>
              <option value="pending">{t('paymentHistory.pending')}</option>
              <option value="failed">{t('paymentHistory.failed')}</option>
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="date-filter">{t('paymentHistory.dateRange')}:</label>
            <select
              id="date-filter"
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="form-select"
            >
              <option value="all">{t('paymentHistory.allTime')}</option>
              <option value="30days">{t('paymentHistory.last30Days')}</option>
              <option value="month">{t('paymentHistory.thisMonth')}</option>
              <option value="year">{t('paymentHistory.thisYear')}</option>
            </select>
          </div>
        </div>
      )}

      {/* Payments Table */}
      {filteredPayments && filteredPayments.length > 0 ? (
        <div className="payments-table-container">
          <table className="payments-table">
            <thead>
              <tr>
                <th>{t('paymentHistory.date')}</th>
                <th>{t('paymentHistory.amount')}</th>
                <th>{t('paymentHistory.status')}</th>
                <th>{t('paymentHistory.paymentMethod')}</th>
                <th>{t('paymentHistory.reference')}</th>
                <th>{t('paymentHistory.description')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.map(payment => (
                <tr key={payment.id} className="payment-row">
                  <td className="payment-date">
                    {formatDate(payment.created)}
                  </td>
                  <td className="payment-amount">
                    {formatAmount(payment.amount, payment.currency)}
                  </td>
                  <td className="payment-status">
                    <span className={`status-badge status-${getStatusColor(payment.status)}`}>
                      {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                    </span>
                  </td>
                  <td className="payment-method">
                    {getPaymentMethod(payment)}
                  </td>
                  <td className="payment-reference">
                    <code>{payment.id.substring(0, 12)}...</code>
                  </td>
                  <td className="payment-description">
                    {payment.description || payment.statement_descriptor || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state">
          <p>
            {billing.payments && billing.payments.length === 0
              ? t('paymentHistory.noPayments')
              : t('paymentHistory.noPaymentsFiltered')}
          </p>
        </div>
      )}

      {/* Export Info */}
      {filteredPayments && filteredPayments.length > 0 && (
        <div className="payments-info-box">
          <h3>💡 {t('paymentHistory.aboutPayments')}</h3>
          <ul>
            <li><strong>{t('paymentHistory.statusLabel')}</strong> {t('paymentHistory.statusExplained')}</li>
            <li><strong>{t('paymentHistory.paymentMethod')}:</strong> {t('paymentHistory.paymentMethodExplained')}</li>
            <li><strong>{t('paymentHistory.reference')}:</strong> {t('paymentHistory.referenceExplained')}</li>
            <li><strong>{t('paymentHistory.date')}:</strong> {t('paymentHistory.dateExplained')}</li>
            <li>{t('paymentHistory.moreDetails')}</li>
          </ul>
        </div>
      )}
    </div>
  );
}
