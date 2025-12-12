import React, { useState, useEffect } from 'react';
import { useBilling } from '../hooks/useBilling';
import './PaymentsPage.css';

/**
 * PaymentsPage - View payment transaction history
 */
export default function PaymentsPage({ userId, token, auth }) {
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
      return `Bank ●●●● ${bank.last4}`;
    }
    return charge.payment_method_details?.type?.toUpperCase() || 'Unknown';
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
        <h2>💰 Payment History</h2>
        <p>Track all your transactions and payments</p>
      </div>

      {/* Summary Cards */}
      {filteredPayments.length > 0 && (
        <div className="summary-cards">
          <div className="summary-card">
            <div className="summary-label">Total Payments</div>
            <div className="summary-value">{filteredPayments.length}</div>
          </div>
          <div className="summary-card">
            <div className="summary-label">Total Amount</div>
            <div className="summary-value">{formatAmount(totalAmount, 'USD')}</div>
          </div>
          <div className="summary-card">
            <div className="summary-label">Successful</div>
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
            <label htmlFor="status-filter">Status:</label>
            <select
              id="status-filter"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="form-select"
            >
              <option value="all">All</option>
              <option value="succeeded">Succeeded</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="date-filter">Date Range:</label>
            <select
              id="date-filter"
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="form-select"
            >
              <option value="all">All Time</option>
              <option value="30days">Last 30 Days</option>
              <option value="month">This Month</option>
              <option value="year">This Year</option>
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
                <th>Date</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Payment Method</th>
                <th>Reference</th>
                <th>Description</th>
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
              ? 'No payments yet. Your transactions will appear here.'
              : 'No payments match the selected filters.'}
          </p>
        </div>
      )}

      {/* Export Info */}
      {filteredPayments && filteredPayments.length > 0 && (
        <div className="payments-info-box">
          <h3>💡 About Your Payments</h3>
          <ul>
            <li><strong>Status:</strong> Succeeded (completed), Pending (processing), or Failed (unsuccessful)</li>
            <li><strong>Payment Method:</strong> The card or bank account used for the payment</li>
            <li><strong>Reference:</strong> Transaction ID for support inquiries</li>
            <li><strong>Date:</strong> When the payment was processed</li>
            <li>For more details, check your email receipts or invoice section</li>
          </ul>
        </div>
      )}
    </div>
  );
}
