/**
 * Legal Data Requests Dashboard
 * For retrieving user data for legal/compliance purposes
 */

import React, { useState } from 'react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

export default function LegalDataRequests({ token }) {
  const [email, setEmail] = useState('');
  const [userId, setUserId] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  const [requestedBy, setRequestedBy] = useState('');
  const [requestReason, setRequestReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [dataPackage, setDataPackage] = useState(null);

  // Step 1: Find user by email
  const handleFindUser = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    setUserInfo(null);
    setUserId(null);

    try {
      const response = await fetch(`${API_URL}/admin/legal-data-requests/find-user`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to find user');
      }

      setUserInfo(data.user);
      setUserId(data.user.user_id);
      setSuccess(`✅ User found: ${data.user.email}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Generate complete legal data package
  const handleGeneratePackage = async (e) => {
    e.preventDefault();
    
    if (!requestedBy || !requestReason) {
      setError('Please provide both "Requested By" and "Request Reason"');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);
    setDataPackage(null);

    try {
      const response = await fetch(`${API_URL}/admin/legal-data-requests/complete-package`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          emailOrUserId: userId || email,
          requestedBy,
          requestReason
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate data package');
      }

      setDataPackage(data.dataPackage);
      setSuccess('✅ Legal data package generated successfully!');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Download JSON file
  const handleDownload = () => {
    if (!dataPackage) return;

    const jsonStr = JSON.stringify(dataPackage, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `legal-request_${dataPackage.request_metadata.user_id.substring(0, 8)}_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    setEmail('');
    setUserId(null);
    setUserInfo(null);
    setRequestedBy('');
    setRequestReason('');
    setError(null);
    setSuccess(null);
    setDataPackage(null);
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>⚖️ Legal Data Requests</h2>
          <p style={styles.subtitle}>Retrieve user data for legal/compliance purposes</p>
        </div>
      </div>

      {/* Warning Box */}
      <div style={styles.warningBox}>
        <h4 style={styles.warningTitle}>⚠️ Important Legal Notice</h4>
        <ul style={styles.warningList}>
          <li>Only use this tool for legitimate legal requests (subpoenas, court orders, etc.)</li>
          <li>All requests are logged to the audit trail for chain of custody</li>
          <li>Downloaded data contains sensitive personal information - handle securely</li>
          <li>Maintain documentation of legal authorization for each request</li>
        </ul>
      </div>

      {/* Status Messages */}
      {error && (
        <div style={styles.error}>
          ⚠️ {error}
        </div>
      )}

      {success && (
        <div style={styles.success}>
          {success}
        </div>
      )}

      {/* Step 1: Find User */}
      <div style={styles.card}>
        <h3 style={styles.cardTitle}>Step 1: Find User by Email</h3>
        <form onSubmit={handleFindUser} style={styles.form}>
          <div style={styles.formGroup}>
            <label style={styles.label}>User Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              required
              style={styles.input}
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || !email}
            style={{
              ...styles.button,
              ...styles.primaryButton,
              opacity: (isLoading || !email) ? 0.6 : 1,
              cursor: (isLoading || !email) ? 'not-allowed' : 'pointer'
            }}
          >
            {isLoading ? '🔍 Searching...' : '🔍 Find User'}
          </button>
        </form>

        {/* User Info Display */}
        {userInfo && (
          <div style={styles.userInfoBox}>
            <h4 style={styles.userInfoTitle}>User Information</h4>
            <div style={styles.infoGrid}>
              <div style={styles.infoRow}>
                <span style={styles.infoLabel}>User ID:</span>
                <span style={styles.infoValue}>{userInfo.user_id}</span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.infoLabel}>Email:</span>
                <span style={styles.infoValue}>{userInfo.email}</span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.infoLabel}>Name:</span>
                <span style={styles.infoValue}>{userInfo.first_name} {userInfo.last_name}</span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.infoLabel}>Subscription:</span>
                <span style={styles.infoValue}>{userInfo.subscription_status || 'N/A'}</span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.infoLabel}>Suspended:</span>
                <span style={styles.infoValue}>{userInfo.is_suspended ? 'Yes' : 'No'}</span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.infoLabel}>Created:</span>
                <span style={styles.infoValue}>{new Date(userInfo.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Step 2: Generate Legal Package */}
      {userInfo && (
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Step 2: Generate Legal Data Package</h3>
          <form onSubmit={handleGeneratePackage} style={styles.form}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Requested By (Your Name)</label>
              <input
                type="text"
                value={requestedBy}
                onChange={(e) => setRequestedBy(e.target.value)}
                placeholder="Admin Name"
                required
                style={styles.input}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Request Reason (Legal Basis)</label>
              <textarea
                value={requestReason}
                onChange={(e) => setRequestReason(e.target.value)}
                placeholder="e.g., Subpoena #12345, Court Order #67890, Legal Discovery Case #XYZ"
                required
                rows={3}
                style={{...styles.input, resize: 'vertical'}}
              />
            </div>

            <div style={styles.buttonGroup}>
              <button
                type="submit"
                disabled={isLoading || !requestedBy || !requestReason}
                style={{
                  ...styles.button,
                  ...styles.primaryButton,
                  opacity: (isLoading || !requestedBy || !requestReason) ? 0.6 : 1,
                  cursor: (isLoading || !requestedBy || !requestReason) ? 'not-allowed' : 'pointer'
                }}
              >
                {isLoading ? '⏳ Generating...' : '📦 Generate Data Package'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Step 3: Download Results */}
      {dataPackage && (
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Step 3: Download Data Package</h3>
          
          <div style={styles.statsGrid}>
            <div style={styles.statBox}>
              <div style={styles.statLabel}>Total Messages</div>
              <div style={styles.statValue}>{dataPackage.statistics.total_messages}</div>
            </div>
            <div style={styles.statBox}>
              <div style={styles.statLabel}>Audit Events</div>
              <div style={styles.statValue}>{dataPackage.statistics.total_audit_events}</div>
            </div>
            <div style={styles.statBox}>
              <div style={styles.statLabel}>Violations</div>
              <div style={styles.statValue}>{dataPackage.statistics.total_violations}</div>
            </div>
            <div style={styles.statBox}>
              <div style={styles.statLabel}>Account Status</div>
              <div style={styles.statValue}>{dataPackage.statistics.account_status}</div>
            </div>
          </div>

          <div style={styles.buttonGroup}>
            <button
              onClick={handleDownload}
              style={{
                ...styles.button,
                ...styles.successButton
              }}
            >
              💾 Download JSON File
            </button>
            <button
              onClick={handleReset}
              style={{
                ...styles.button,
                ...styles.secondaryButton
              }}
            >
              🔄 New Request
            </button>
          </div>

          <div style={styles.infoBox}>
            <h4 style={styles.infoTitle}>📋 Package Contents</h4>
            <ul style={styles.infoList}>
              <li>Complete user profile and personal information</li>
              <li>All messages (user inputs and oracle responses)</li>
              <li>Complete audit trail (login history, actions, IP addresses)</li>
              <li>Violation history (if any)</li>
              <li>Request metadata (who requested, when, why)</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    padding: '20px',
    maxWidth: '1000px',
    margin: '0 auto'
  },
  header: {
    marginBottom: '20px'
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#1a1a1a',
    margin: '0 0 5px 0'
  },
  subtitle: {
    fontSize: '14px',
    color: '#666',
    margin: 0
  },
  warningBox: {
    backgroundColor: '#fef3c7',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '20px',
    border: '2px solid #fbbf24'
  },
  warningTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#92400e',
    marginTop: 0,
    marginBottom: '10px'
  },
  warningList: {
    margin: 0,
    paddingLeft: '20px',
    color: '#92400e',
    fontSize: '14px',
    lineHeight: '1.8'
  },
  error: {
    padding: '15px',
    backgroundColor: '#fee',
    color: '#c00',
    borderRadius: '8px',
    marginBottom: '20px',
    border: '1px solid #fcc'
  },
  success: {
    padding: '15px',
    backgroundColor: '#d1fae5',
    color: '#059669',
    borderRadius: '8px',
    marginBottom: '20px',
    border: '1px solid #6ee7b7'
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    border: '1px solid #e5e7eb'
  },
  cardTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1a1a1a',
    marginTop: 0,
    marginBottom: '15px'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  label: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151'
  },
  input: {
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    fontFamily: 'inherit'
  },
  button: {
    padding: '12px 24px',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'background-color 0.2s'
  },
  primaryButton: {
    backgroundColor: '#3b82f6',
    color: 'white'
  },
  secondaryButton: {
    backgroundColor: '#6b7280',
    color: 'white'
  },
  successButton: {
    backgroundColor: '#10b981',
    color: 'white'
  },
  buttonGroup: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap'
  },
  userInfoBox: {
    marginTop: '20px',
    padding: '15px',
    backgroundColor: '#f9fafb',
    borderRadius: '6px',
    border: '1px solid #e5e7eb'
  },
  userInfoTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151',
    marginTop: 0,
    marginBottom: '12px'
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '10px'
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    borderBottom: '1px solid #e5e7eb'
  },
  infoLabel: {
    fontSize: '13px',
    color: '#6b7280',
    fontWeight: '500'
  },
  infoValue: {
    fontSize: '13px',
    color: '#1f2937',
    fontWeight: '400'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '15px',
    marginBottom: '20px'
  },
  statBox: {
    backgroundColor: '#f9fafb',
    padding: '15px',
    borderRadius: '6px',
    textAlign: 'center',
    border: '1px solid #e5e7eb'
  },
  statLabel: {
    fontSize: '12px',
    color: '#6b7280',
    marginBottom: '5px'
  },
  statValue: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#1f2937'
  },
  infoBox: {
    backgroundColor: '#eff6ff',
    borderRadius: '8px',
    padding: '15px',
    marginTop: '15px',
    border: '1px solid #bfdbfe'
  },
  infoTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1e40af',
    marginTop: 0,
    marginBottom: '10px'
  },
  infoList: {
    margin: 0,
    paddingLeft: '20px',
    color: '#1e40af',
    fontSize: '13px',
    lineHeight: '1.8'
  }
};
