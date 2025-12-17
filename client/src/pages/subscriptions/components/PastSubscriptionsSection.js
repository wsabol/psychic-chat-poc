/**
 * PastSubscriptionsSection Component
 * Display canceled subscriptions - one line each in a simple table
 */

import React from 'react';

export default function PastSubscriptionsSection({ subscriptions }) {
  const pastSubs = subscriptions.filter(sub => sub.status === 'canceled');

  if (pastSubs.length === 0) {
    return null;
  }

  return (
    <div style={styles.container}>
      <h3 style={styles.heading}>Past Subscriptions</h3>
      <table style={styles.table}>
        <thead>
          <tr style={styles.headerRow}>
            <th style={styles.th}>Plan</th>
            <th style={styles.th}>Price</th>
            <th style={styles.th}>Ended</th>
          </tr>
        </thead>
        <tbody>
          {pastSubs.map(subscription => (
            <tr key={subscription.id} style={styles.bodyRow}>
              <td style={styles.td}>
                {subscription.items?.data?.[0]?.price?.product?.name || 'Subscription'}
              </td>
              <td style={styles.td}>
                ${(subscription.items?.data?.[0]?.price?.unit_amount / 100 || 0).toFixed(2)}
                {subscription.items?.data?.[0]?.price?.recurring?.interval === 'month' ? '/mo' : '/yr'}
              </td>
              <td style={styles.td}>
                {subscription.ended_at ? new Date(subscription.ended_at * 1000).toLocaleDateString() : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const styles = {
  container: {
    marginTop: '3rem',
    padding: '1.5rem',
    background: '#f9f9f9',
    borderRadius: '8px',
    border: '1px solid #e0e0e0',
  },
  heading: {
    margin: '0 0 1rem 0',
    fontSize: '1.1rem',
    color: '#333',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '0.9rem',
  },
  headerRow: {
    backgroundColor: '#e8e8e8',
  },
  bodyRow: {
    borderBottom: '1px solid #ddd',
  },
  th: {
    padding: '0.75rem 1rem',
    textAlign: 'left',
    fontWeight: '600',
    color: '#333',
  },
  td: {
    padding: '0.75rem 1rem',
    color: '#666',
  },
};
