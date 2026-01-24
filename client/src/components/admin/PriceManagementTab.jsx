/**
 * Price Management Tab - REDESIGNED
 * Automated price change workflow with auto-price creation
 */

import React, { useState } from 'react';
import usePriceManagement from './hooks/usePriceManagement';
import styles from './FreeTrialWhitelist.module.css'; // Reuse existing styles

export default function PriceManagementTab({ token }) {
  const {
    prices,
    monthlyCount,
    yearlyCount,
    monthlyStatus,
    yearlyStatus,
    loading,
    error,
    success,
    schedulePriceChange,
    refreshAll,
    clearMessages
  } = usePriceManagement(token);

  // Form state for price change scheduling
  const [priceChangeForm, setPriceChangeForm] = useState({
    monthlyOldPriceId: '',
    monthlyNewAmount: '',  // Dollar amount as string
    annualOldPriceId: '',
    annualNewAmount: ''    // Dollar amount as string
  });

  // Get monthly and annual prices separately
  const monthlyPrices = prices.filter(p => p.recurring?.interval === 'month');
  const annualPrices = prices.filter(p => p.recurring?.interval === 'year');

  const handleSchedulePriceChange = async (e) => {
    e.preventDefault();

    // Build monthly change object
    let monthly = null;
    if (priceChangeForm.monthlyOldPriceId && priceChangeForm.monthlyNewAmount) {
      const newAmountCents = Math.round(parseFloat(priceChangeForm.monthlyNewAmount) * 100);
      
      if (isNaN(newAmountCents) || newAmountCents <= 0) {
        alert('Please enter a valid monthly price amount');
        return;
      }

      monthly = {
        oldPriceId: priceChangeForm.monthlyOldPriceId,
        newAmount: newAmountCents
      };
    }

    // Build annual change object
    let annual = null;
    if (priceChangeForm.annualOldPriceId && priceChangeForm.annualNewAmount) {
      const newAmountCents = Math.round(parseFloat(priceChangeForm.annualNewAmount) * 100);
      
      if (isNaN(newAmountCents) || newAmountCents <= 0) {
        alert('Please enter a valid annual price amount');
        return;
      }

      annual = {
        oldPriceId: priceChangeForm.annualOldPriceId,
        newAmount: newAmountCents
      };
    }

    // Confirm with user
    const changes = [];
    if (monthly) {
      const oldPrice = prices.find(p => p.id === monthly.oldPriceId);
      changes.push(`Monthly: $${(oldPrice.unit_amount / 100).toFixed(2)} → $${(monthly.newAmount / 100).toFixed(2)} (${monthlyCount} subscribers)`);
    }
    if (annual) {
      const oldPrice = prices.find(p => p.id === annual.oldPriceId);
      changes.push(`Annual: $${(oldPrice.unit_amount / 100).toFixed(2)} → $${(annual.newAmount / 100).toFixed(2)} (${yearlyCount} subscribers)`);
    }

    if (changes.length === 0) {
      alert('Please configure at least one price change (monthly or annual)');
      return;
    }

    const totalSubscribers = (monthly ? monthlyCount : 0) + (annual ? yearlyCount : 0);
    const message = `Schedule Price Change?\n\n${changes.join('\n')}\n\nTotal: ${totalSubscribers} subscribers will be notified.\n\n✅ New prices will be created in Stripe with tax collection enabled\n✅ Notifications sent immediately\n✅ Automatic migration in 30 days`;

    if (!window.confirm(message)) {
      return;
    }

    await schedulePriceChange(monthly, annual);
    
    // Reset form on success
    if (!error) {
      setPriceChangeForm({
        monthlyOldPriceId: '',
        monthlyNewAmount: '',
        annualOldPriceId: '',
        annualNewAmount: ''
      });
    }
  };

  const formatAmount = (cents) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const formatPriceOption = (price) => {
    return `${formatAmount(price.unit_amount)} - ${price.id}`;
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <h2 className={styles.title}>💰 Automated Price Change Management</h2>
        <button 
          onClick={refreshAll} 
          disabled={loading} 
          className={styles.refreshButton}
        >
          {loading ? '⟳ Refreshing...' : '🔄 Refresh'}
        </button>
      </div>

      <p className={styles.description}>
        Schedule price changes with automatic Stripe price creation, 30-day notification, and migration. 
        System creates new prices with tax collection and handles everything automatically.
      </p>

      {/* Error Message */}
      {error && (
        <div className={styles.errorBox}>
          <p className={styles.errorText}>❌ {error}</p>
          <button onClick={clearMessages} className={styles.refreshButton}>Dismiss</button>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className={styles.successBox}>
          <p className={styles.successText}>{success}</p>
          <button onClick={clearMessages} className={styles.refreshButton}>Dismiss</button>
        </div>
      )}

      {/* Section 1: Active Prices Overview */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>📋 Active Stripe Prices</h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
          <div style={{ padding: '15px', backgroundColor: '#f0f8ff', borderRadius: '8px' }}>
            <h4 style={{ margin: '0 0 10px 0' }}>Monthly Subscribers: {monthlyCount}</h4>
            {monthlyPrices.length === 0 ? (
              <p style={{ color: '#666', fontSize: '0.9em' }}>No monthly prices found</p>
            ) : (
              <ul style={{ margin: '10px 0', paddingLeft: '20px', fontSize: '0.9em' }}>
                {monthlyPrices.map(price => (
                  <li key={price.id}>
                    {formatAmount(price.unit_amount)}/month ({price.subscriberCount || 0} subs)
                  </li>
                ))}
              </ul>
            )}
          </div>
          
          <div style={{ padding: '15px', backgroundColor: '#f0fff0', borderRadius: '8px' }}>
            <h4 style={{ margin: '0 0 10px 0' }}>Annual Subscribers: {yearlyCount}</h4>
            {annualPrices.length === 0 ? (
              <p style={{ color: '#666', fontSize: '0.9em' }}>No annual prices found</p>
            ) : (
              <ul style={{ margin: '10px 0', paddingLeft: '20px', fontSize: '0.9em' }}>
                {annualPrices.map(price => (
                  <li key={price.id}>
                    {formatAmount(price.unit_amount)}/year ({price.subscriberCount || 0} subs)
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {prices.length > 0 && (
          <details style={{ marginTop: '15px' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 'bold', padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
              View All Price Details
            </summary>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f5f5f5', borderBottom: '2px solid #ddd' }}>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Product</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Amount</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Interval</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Subscribers</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Price ID</th>
                </tr>
              </thead>
              <tbody>
                {prices.map((price, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '10px' }}>{price.productName || 'N/A'}</td>
                    <td style={{ padding: '10px' }}>{formatAmount(price.unit_amount)}</td>
                    <td style={{ padding: '10px' }}>{price.recurring?.interval || 'N/A'}</td>
                    <td style={{ padding: '10px' }}>{price.subscriberCount || 0}</td>
                    <td style={{ padding: '10px', fontFamily: 'monospace', fontSize: '0.85em' }}>
                      {price.id}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        )}
      </div>

      {/* Section 2: Schedule Price Change */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>🚀 Schedule Price Change (Automated)</h3>
        
        <div style={{ padding: '15px', backgroundColor: '#e8f4fd', borderRadius: '8px', marginBottom: '20px' }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#0066cc' }}>How It Works:</h4>
          <ol style={{ margin: '0', paddingLeft: '20px', lineHeight: '1.6' }}>
            <li>Select which price to migrate from (current price)</li>
            <li>Enter the new price amount (system creates price in Stripe with tax collection)</li>
            <li>Click "Schedule Price Change" - system sends notifications to all affected subscribers</li>
            <li>System automatically migrates subscriptions after 30 days</li>
            <li>No manual intervention required!</li>
          </ol>
        </div>

        <form onSubmit={handleSchedulePriceChange} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Monthly Price Change */}
          <div style={{ padding: '15px', border: '2px solid #4a90e2', borderRadius: '8px', backgroundColor: '#f8fbff' }}>
            <h4 style={{ margin: '0 0 15px 0', color: '#4a90e2' }}>📅 Monthly Subscription ({monthlyCount} subscribers)</h4>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '15px', alignItems: 'center' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Current Price:</label>
                <select
                  value={priceChangeForm.monthlyOldPriceId}
                  onChange={(e) => setPriceChangeForm({ ...priceChangeForm, monthlyOldPriceId: e.target.value })}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                >
                  <option value="">-- Select Current Price --</option>
                  {monthlyPrices.map(price => (
                    <option key={price.id} value={price.id}>
                      {formatPriceOption(price)}
                    </option>
                  ))}
                </select>
              </div>
              
              <div style={{ fontSize: '1.5em', color: '#4a90e2', fontWeight: 'bold' }}>→</div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>New Price ($):</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="9.99"
                  value={priceChangeForm.monthlyNewAmount}
                  onChange={(e) => setPriceChangeForm({ ...priceChangeForm, monthlyNewAmount: e.target.value })}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                />
                <small style={{ color: '#666', display: 'block', marginTop: '4px' }}>
                  System will create new Stripe price with tax collection
                </small>
              </div>
            </div>
            
            {priceChangeForm.monthlyOldPriceId && priceChangeForm.monthlyNewAmount && (
              <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#fff', borderRadius: '4px', fontSize: '0.9em' }}>
                <strong>Preview:</strong> {monthlyCount} subscribers will be notified of price change from{' '}
                {formatAmount(prices.find(p => p.id === priceChangeForm.monthlyOldPriceId)?.unit_amount || 0)} to{' '}
                ${parseFloat(priceChangeForm.monthlyNewAmount).toFixed(2)} per month
              </div>
            )}
          </div>

          {/* Annual Price Change */}
          <div style={{ padding: '15px', border: '2px solid #52c41a', borderRadius: '8px', backgroundColor: '#f6fff6' }}>
            <h4 style={{ margin: '0 0 15px 0', color: '#52c41a' }}>📆 Annual Subscription ({yearlyCount} subscribers)</h4>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '15px', alignItems: 'center' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Current Price:</label>
                <select
                  value={priceChangeForm.annualOldPriceId}
                  onChange={(e) => setPriceChangeForm({ ...priceChangeForm, annualOldPriceId: e.target.value })}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                >
                  <option value="">-- Select Current Price --</option>
                  {annualPrices.map(price => (
                    <option key={price.id} value={price.id}>
                      {formatPriceOption(price)}
                    </option>
                  ))}
                </select>
              </div>
              
              <div style={{ fontSize: '1.5em', color: '#52c41a', fontWeight: 'bold' }}>→</div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>New Price ($):</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="99.99"
                  value={priceChangeForm.annualNewAmount}
                  onChange={(e) => setPriceChangeForm({ ...priceChangeForm, annualNewAmount: e.target.value })}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                />
                <small style={{ color: '#666', display: 'block', marginTop: '4px' }}>
                  System will create new Stripe price with tax collection
                </small>
              </div>
            </div>
            
            {priceChangeForm.annualOldPriceId && priceChangeForm.annualNewAmount && (
              <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#fff', borderRadius: '4px', fontSize: '0.9em' }}>
                <strong>Preview:</strong> {yearlyCount} subscribers will be notified of price change from{' '}
                {formatAmount(prices.find(p => p.id === priceChangeForm.annualOldPriceId)?.unit_amount || 0)} to{' '}
                ${parseFloat(priceChangeForm.annualNewAmount).toFixed(2)} per year
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button 
            type="submit" 
            disabled={loading || (!priceChangeForm.monthlyNewAmount && !priceChangeForm.annualNewAmount)}
            style={{
              padding: '15px 30px',
              fontSize: '1.1em',
              fontWeight: 'bold',
              color: 'white',
              backgroundColor: loading ? '#ccc' : '#28a745',
              border: 'none',
              borderRadius: '8px',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => !loading && (e.target.style.backgroundColor = '#218838')}
            onMouseOut={(e) => !loading && (e.target.style.backgroundColor = '#28a745')}
          >
            {loading ? '⟳ Processing...' : '🚀 Schedule Price Change (30-Day Notice)'}
          </button>
        </form>
      </div>

      {/* Section 3: Migration Status */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>📊 Scheduled Migrations Status</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div style={{ padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
            <h4 style={{ margin: '0 0 10px 0' }}>Monthly Migrations</h4>
            {monthlyStatus ? (
              <div style={{ lineHeight: '1.8' }}>
                <p>📧 Total Notified: <strong>{monthlyStatus.total_notified || 0}</strong></p>
                <p>✅ Completed: <strong>{monthlyStatus.migration_completed || 0}</strong></p>
                <p>⏳ Pending: <strong>{monthlyStatus.pending || 0}</strong></p>
              </div>
            ) : (
              <p style={{ color: '#666' }}>No scheduled migrations</p>
            )}
          </div>
          <div style={{ padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
            <h4 style={{ margin: '0 0 10px 0' }}>Annual Migrations</h4>
            {yearlyStatus ? (
              <div style={{ lineHeight: '1.8' }}>
                <p>📧 Total Notified: <strong>{yearlyStatus.total_notified || 0}</strong></p>
                <p>✅ Completed: <strong>{yearlyStatus.migration_completed || 0}</strong></p>
                <p>⏳ Pending: <strong>{yearlyStatus.pending || 0}</strong></p>
              </div>
            ) : (
              <p style={{ color: '#666' }}>No scheduled migrations</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
