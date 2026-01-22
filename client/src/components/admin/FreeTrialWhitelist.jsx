/**
 * Free Trial Whitelist Tab
 * Manage IP addresses that can access unlimited free trials
 * FIX: Use fetchWithTokenRefresh to handle expired tokens
 */

import React, { useState, useEffect, useCallback } from 'react';
import { fetchWithTokenRefresh } from '../../utils/fetchWithTokenRefresh';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

export default function FreeTrialWhitelist({ token }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [whitelist, setWhitelist] = useState([]);
  const [currentIp, setCurrentIp] = useState(null);
  const [manualIp, setManualIp] = useState('');
  const [manualDescription, setManualDescription] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchWhitelist = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchWithTokenRefresh(`${API_URL}/admin/whitelist`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setWhitelist(data.whitelist || []);
      setLastUpdated(new Date().toLocaleString());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const fetchCurrentIp = useCallback(async () => {
    try {
      const response = await fetchWithTokenRefresh(`${API_URL}/admin/whitelist/current-ip`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setCurrentIp(data);
    } catch (err) {
      console.error('Error fetching current IP:', err);
    }
  }, [token]);

  const handleWhitelistCurrentIp = async () => {
    if (!currentIp?.ipAddress) {
      setError('Unable to determine current IP address');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetchWithTokenRefresh(`${API_URL}/admin/whitelist/add`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ipAddress: currentIp.ipAddress,
          description: 'Admin current IP'
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      setSuccess('✅ Current IP address whitelisted successfully');
      await fetchWhitelist();
      await fetchCurrentIp();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleWhitelistManualIp = async (e) => {
    e.preventDefault();

    if (!manualIp.trim()) {
      setError('Please enter an IP address');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetchWithTokenRefresh(`${API_URL}/admin/whitelist/add`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ipAddress: manualIp.trim(),
          description: manualDescription.trim() || 'Manually added'
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      setSuccess(`✅ IP ${manualIp} whitelisted successfully`);
      setManualIp('');
      setManualDescription('');
      await fetchWhitelist();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFromWhitelist = async (id) => {
    if (!window.confirm('Are you sure you want to remove this IP from the whitelist?')) {
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetchWithTokenRefresh(`${API_URL}/admin/whitelist/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      setSuccess('✅ IP address removed from whitelist');
      await fetchWhitelist();
      await fetchCurrentIp();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch on mount
  useEffect(() => {
    fetchWhitelist();
    fetchCurrentIp();
  }, [fetchWhitelist, fetchCurrentIp]);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>🔓 Free Trial Whitelist</h2>
        <button onClick={fetchWhitelist} disabled={loading} style={styles.refreshButton}>
          {loading ? '⟳ Refreshing...' : '🔄 Refresh'}
        </button>
      </div>

      <p style={styles.description}>
        Whitelisted IP addresses can test the free trial unlimited times.
      </p>

      {lastUpdated && (
        <p style={styles.timestamp}>Last updated: {lastUpdated}</p>
      )}

      {error && (
        <div style={styles.errorBox}>
          <p style={styles.errorText}>❌ {error}</p>
        </div>
      )}

      {success && (
        <div style={styles.successBox}>
          <p style={styles.successText}>{success}</p>
        </div>
      )}

      {/* Current IP Section */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>📍 Your Current IP</h3>
        {currentIp ? (
          <div style={styles.currentIpBox}>
            <div style={styles.ipInfo}>
              <p style={styles.ipLabel}>IP Address:</p>
              <p style={styles.ipValue}>{currentIp.ipAddress}</p>
            </div>
            <div style={styles.ipInfo}>
              <p style={styles.ipLabel}>Status:</p>
              <p style={{...styles.ipValue, color: currentIp.isWhitelisted ? '#2ecc71' : '#e74c3c'}}>
                {currentIp.isWhitelisted ? '✅ Whitelisted' : '❌ Not Whitelisted'}
              </p>
            </div>
            {!currentIp.isWhitelisted && (
              <button
                onClick={handleWhitelistCurrentIp}
                disabled={loading}
                style={styles.whitelistButton}
              >
                ✅ Whitelist Current IP
              </button>
            )}
          </div>
        ) : (
          <p style={styles.loadingText}>Loading current IP...</p>
        )}
      </div>

      {/* Manual IP Entry Section */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>➕ Add IP Manually</h3>
        <form onSubmit={handleWhitelistManualIp} style={styles.form}>
          <div style={styles.formGroup}>
            <label style={styles.label}>IP Address:</label>
            <input
              type="text"
              value={manualIp}
              onChange={(e) => setManualIp(e.target.value)}
              placeholder="e.g., 192.168.1.1"
              style={styles.input}
              disabled={loading}
            />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Description (optional):</label>
            <input
              type="text"
              value={manualDescription}
              onChange={(e) => setManualDescription(e.target.value)}
              placeholder="e.g., Office IP"
              style={styles.input}
              disabled={loading}
            />
          </div>
          <button type="submit" disabled={loading} style={styles.addButton}>
            {loading ? '⟳ Adding...' : '➕ Add to Whitelist'}
          </button>
        </form>
      </div>

      {/* Whitelist Table */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>📋 Whitelisted IPs ({whitelist.length})</h3>
        {whitelist.length === 0 ? (
          <p style={styles.emptyMessage}>No IPs whitelisted yet.</p>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr style={styles.tableHeader}>
                <th style={styles.th}>IP Hash</th>
                <th style={styles.th}>Device</th>
                <th style={styles.th}>Browser</th>
                <th style={styles.th}>Added</th>
                <th style={styles.th}>Last Used</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {whitelist.map((entry) => (
                <tr key={entry.id} style={styles.tableRow}>
                  <td style={styles.td}>{entry.ip_address_hash.substring(0, 16)}...</td>
                  <td style={styles.td}>{entry.device_name || 'Unknown'}</td>
                  <td style={styles.td} title={entry.browser_info}>
                    {entry.browser_info ? entry.browser_info.substring(0, 30) + '...' : 'Unknown'}
                  </td>
                  <td style={styles.td}>{new Date(entry.added_at).toLocaleDateString()}</td>
                  <td style={styles.td}>{new Date(entry.last_used_at).toLocaleDateString()}</td>
                  <td style={styles.td}>
                    <button
                      onClick={() => handleRemoveFromWhitelist(entry.id)}
                      disabled={loading}
                      style={styles.removeButton}
                    >
                      🗑️ Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// Styles
const styles = {
  container: {
    padding: '20px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    marginBottom: '20px'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px'
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#333',
    margin: 0
  },
  description: {
    fontSize: '14px',
    color: '#666',
    marginBottom: '16px'
  },
  refreshButton: {
    padding: '8px 16px',
    backgroundColor: '#3498db',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
    transition: 'background-color 0.2s'
  },
  timestamp: {
    fontSize: '12px',
    color: '#666',
    marginBottom: '16px'
  },
  errorBox: {
    padding: '16px',
    backgroundColor: '#ffe6e6',
    border: '1px solid #e74c3c',
    borderRadius: '4px',
    marginBottom: '20px'
  },
  errorText: {
    color: '#c0392b',
    margin: 0
  },
  successBox: {
    padding: '16px',
    backgroundColor: '#d4edda',
    border: '1px solid #2ecc71',
    borderRadius: '4px',
    marginBottom: '20px'
  },
  successText: {
    color: '#155724',
    margin: 0
  },
  section: {
    backgroundColor: 'white',
    padding: '16px',
    borderRadius: '4px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    marginBottom: '20px'
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '16px',
    paddingBottom: '8px',
    borderBottom: '2px solid #3498db'
  },
  currentIpBox: {
    padding: '12px',
    backgroundColor: '#ecf0f1',
    borderRadius: '4px'
  },
  ipInfo: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '8px'
  },
  ipLabel: {
    fontWeight: 'bold',
    marginRight: '8px',
    marginBottom: 0,
    fontSize: '14px'
  },
  ipValue: {
    margin: 0,
    fontSize: '14px',
    fontFamily: 'monospace'
  },
  whitelistButton: {
    marginTop: '12px',
    padding: '10px 20px',
    backgroundColor: '#2ecc71',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold'
  },
  loadingText: {
    color: '#666',
    fontStyle: 'italic'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  label: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#333'
  },
  input: {
    padding: '8px 12px',
    fontSize: '14px',
    border: '1px solid #ccc',
    borderRadius: '4px',
    fontFamily: 'monospace'
  },
  addButton: {
    padding: '10px 20px',
    backgroundColor: '#3498db',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
    alignSelf: 'flex-start'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px'
  },
  tableHeader: {
    backgroundColor: '#ecf0f1',
    borderBottom: '2px solid #bdc3c7'
  },
  th: {
    padding: '12px',
    textAlign: 'left',
    fontWeight: 'bold',
    color: '#333'
  },
  tableRow: {
    borderBottom: '1px solid #ecf0f1',
    backgroundColor: '#fff'
  },
  td: {
    padding: '12px',
    color: '#555'
  },
  removeButton: {
    padding: '6px 12px',
    backgroundColor: '#e74c3c',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 'bold'
  },
  emptyMessage: {
    padding: '20px',
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic'
  }
};
