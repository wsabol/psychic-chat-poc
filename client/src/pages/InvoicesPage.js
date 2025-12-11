import React, { useState, useEffect } from 'react';
import { useBilling } from '../hooks/useBilling';
import './InvoicesPage.css';

/**
 * InvoicesPage - View and download invoices
 */
export default function InvoicesPage({ userId, token, auth }) {
  const billing = useBilling(token);
  const [filterStatus, setFilterStatus] = useState('all');

  // Load invoices on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    billing.fetchInvoices();
  }, []);

  const formatDate = (timestamp) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatAmount = (amount, currency) => {
    const value = (amount / 100).toFixed(2);
    return `${currency?.toUpperCase() || 'USD'} $${value}`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid':
        return 'success';
      case 'open':
        return 'warning';
      case 'draft':
        return 'info';
      case 'void':
      case 'uncollectible':
        return 'danger';
      default:
        return 'default';
    }
  };

  const filteredInvoices = billing.invoices.filter(invoice => {
    if (filterStatus === 'all') return true;
    return invoice.status === filterStatus;
  });

  return (
    <div className="invoices-page">
      {/* Header */}
      <div className="section-header">
        <h2>📄 Invoices</h2>
        <p>View and download your billing invoices</p>
      </div>

      {/* Filter */}
      {billing.invoices && billing.invoices.length > 0 && (
        <div className="filter-bar">
          <label htmlFor="status-filter">Filter by Status:</label>
          <select
            id="status-filter"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="form-select"
          >
            <option value="all">All Invoices</option>
            <option value="paid">Paid</option>
            <option value="open">Open</option>
            <option value="draft">Draft</option>
          </select>
        </div>
      )}

      {/* Invoices Table */}
      {filteredInvoices && filteredInvoices.length > 0 ? (
        <div className="invoices-table-container">
          <table className="invoices-table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Date</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Description</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.map(invoice => (
                <tr key={invoice.id} className="invoice-row">
                  <td className="invoice-number">
                    {invoice.number || invoice.id.substring(0, 12)}
                  </td>
                  <td className="invoice-date">
                    {formatDate(invoice.created)}
                  </td>
                  <td className="invoice-amount">
                    {formatAmount(invoice.amount_paid || invoice.amount_due, invoice.currency)}
                  </td>
                  <td className="invoice-status">
                    <span className={`status-badge status-${getStatusColor(invoice.status)}`}>
                      {invoice.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="invoice-description">
                    {invoice.description || 'Subscription billing'}
                  </td>
                  <td className="invoice-actions">
                    {invoice.pdf && (
                      <a
                        href={invoice.pdf}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-small btn-primary"
                        title="Download PDF"
                      >
                        📥 Download
                      </a>
                    )}
                    {invoice.hosted_invoice_url && (
                      <a
                        href={invoice.hosted_invoice_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-small btn-secondary"
                        title="View Invoice"
                      >
                        👁️ View
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state">
          <p>
            {billing.invoices && billing.invoices.length === 0
              ? 'No invoices yet. You will see them here when you make a payment.'
              : 'No invoices match the selected filter.'}
          </p>
        </div>
      )}

      {/* Invoice Details Info */}
      {filteredInvoices && filteredInvoices.length > 0 && (
        <div className="invoice-info-box">
          <h3>Invoice Information</h3>
          <ul>
            <li><strong>Invoice Number:</strong> Unique identifier for each invoice</li>
            <li><strong>Date:</strong> Date the invoice was issued</li>
            <li><strong>Amount:</strong> Total amount due or paid</li>
            <li><strong>Status:</strong> Current payment status (Paid, Open, Draft)</li>
            <li><strong>Download:</strong> Get a PDF copy of the invoice</li>
            <li><strong>View:</strong> Open invoice in your browser</li>
          </ul>
        </div>
      )}
    </div>
  );
}
