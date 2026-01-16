import React, { useState, useEffect } from 'react';

/**
 * ErrorLogsReport - Display error logs from database
 * Shows:
 * - Critical Errors (unresolved, last 24hrs)
 * - Error Summary (7-day rollup by service/severity)
 * - Error Count Trend
 */
export default function ErrorLogsReport({ token, apiUrl }) {
  const [activeTab, setActiveTab] = useState('critical');
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch error logs on mount
  useEffect(() => {
    fetchErrorLogs();
  }, []);

  const fetchErrorLogs = async () => {
    setIsLoading(true);
    setError('');

    try {
      const endpoints = {
        critical: '/admin/errors/errors/critical',
        summary: '/admin/errors/errors/summary'
      };

      const response = await fetch(`${apiUrl}${endpoints[activeTab]}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch error logs (${response.status})`);
      }

      const result = await response.json();
      setData(result.data || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch error logs');
      setData([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchErrorLogs();
  };

  const handleMarkResolved = async (errorId) => {
    try {
      const response = await fetch(`${apiUrl}/admin/errors/errors/${errorId}/resolve`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_resolved: true }),
      });

      if (!response.ok) {
        throw new Error('Failed to mark error as resolved');
      }

      // Refresh the data
      fetchErrorLogs();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div style={{ marginTop: '1.5rem' }}>
      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        marginBottom: '1rem',
        borderBottom: '2px solid #e0e0e0',
      }}>
        <TabButton
          label="🚨 Critical Errors (24h)"
          isActive={activeTab === 'critical'}
          onClick={() => {
            setActiveTab('critical');
            fetchErrorLogs();
          }}
        />
        <TabButton
          label="📊 Error Summary (7d)"
          isActive={activeTab === 'summary'}
          onClick={() => {
            setActiveTab('summary');
            fetchErrorLogs();
          }}
        />
      </div>

      {/* Header with refresh button */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1rem',
      }}>
        <h3 style={{ margin: 0, fontSize: '16px', color: 'white' }}>
          {activeTab === 'critical' ? '🚨 Unresolved Critical Errors' : '📊 Error Summary (Last 7 Days)'}
        </h3>
        <button
          onClick={handleRefresh}
          disabled={isLoading}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#7c63d8',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            fontSize: '12px',
            opacity: isLoading ? 0.6 : 1,
          }}
        >
          🔄 Refresh
        </button>
      </div>

      {/* Error message */}
      {error && (
        <div style={{
          backgroundColor: '#ffebee',
          border: '1px solid #ef5350',
          borderRadius: '4px',
          padding: '0.75rem',
          marginBottom: '1rem',
          color: '#c62828',
          fontSize: '12px',
        }}>
          {error}
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div style={{
          textAlign: 'center',
          padding: '2rem',
          color: '#999',
        }}>
          Loading...
        </div>
      )}

      {/* Critical Errors Tab */}
      {activeTab === 'critical' && !isLoading && (
        <>
          {data && data.length > 0 ? (
            <div style={{
              display: 'grid',
              gap: '1rem',
            }}>
              {data.map((error) => (
                <ErrorCard
                  key={error.id}
                  error={error}
                  onResolve={() => handleMarkResolved(error.id)}
                />
              ))}
            </div>
          ) : (
            <div style={{
              backgroundColor: '#e8f5e9',
              border: '1px solid #81c784',
              borderRadius: '4px',
              padding: '1.5rem',
              textAlign: 'center',
              color: '#2e7d32',
            }}>
              ✅ No critical errors in the last 24 hours
            </div>
          )}
        </>
      )}

      {/* Summary Tab */}
      {activeTab === 'summary' && !isLoading && (
        <>
          {data && data.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                backgroundColor: 'white',
              }}>
                <thead>
                  <tr style={{ backgroundColor: '#f5f5f5', borderBottom: '2px solid #ddd' }}>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '12px', fontWeight: 'bold' }}>Service</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '12px', fontWeight: 'bold' }}>Severity</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '12px', fontWeight: 'bold' }}>Count</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '12px', fontWeight: 'bold' }}>Date</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '12px', fontWeight: 'bold' }}>Affected Users</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((row) => (
                    <tr
                      key={row.id || `${row.service}-${row.error_date}-${row.error_count}`}
                      style={{
                        borderBottom: '1px solid #eee',
                        backgroundColor: data.indexOf(row) % 2 === 0 ? '#ffffff' : '#f9f9f9',
                      }}
                    >
                      <td style={{ padding: '0.75rem', fontSize: '12px' }}>{row.service}</td>
                      <td style={{ padding: '0.75rem', fontSize: '12px' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '3px',
                          backgroundColor: row.severity === 'critical' ? '#ffebee' : row.severity === 'warning' ? '#fff3e0' : '#e8f5e9',
                          color: row.severity === 'critical' ? '#c62828' : row.severity === 'warning' ? '#e65100' : '#2e7d32',
                          fontSize: '10px',
                          fontWeight: 'bold',
                        }}>
                          {row.severity}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem', fontSize: '12px', fontWeight: 'bold' }}>{row.error_count}</td>
                      <td style={{ padding: '0.75rem', fontSize: '12px' }}>{new Date(row.error_date).toLocaleDateString()}</td>
                      <td style={{ padding: '0.75rem', fontSize: '12px' }}>{row.affected_users}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{
              backgroundColor: '#e8f5e9',
              border: '1px solid #81c784',
              borderRadius: '4px',
              padding: '1.5rem',
              textAlign: 'center',
              color: '#2e7d32',
            }}>
              ✅ No errors in the last 7 days
            </div>
          )}
        </>
      )}
    </div>
  );
}

/**
 * ErrorCard - Display a single critical error
 */
function ErrorCard({ error, onResolve }) {
  return (
    <div style={{
      backgroundColor: '#ffebee',
      border: '1px solid #ef5350',
      borderRadius: '6px',
      padding: '1rem',
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'start',
        marginBottom: '0.5rem',
      }}>
        <div>
          <h4 style={{ margin: '0 0 0.25rem 0', color: '#c62828', fontSize: '13px' }}>
            {error.service}
          </h4>
          <p style={{ margin: '0 0 0.5rem 0', color: '#d32f2f', fontSize: '12px' }}>
            {error.error_message}
          </p>
        </div>
        <button
          onClick={onResolve}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#4caf50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '11px',
            fontWeight: 'bold',
            whiteSpace: 'nowrap',
          }}
        >
          ✅ Mark Resolved
        </button>
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '1rem',
        fontSize: '11px',
        color: '#666',
      }}>
        <div>
          <strong>Time:</strong> {new Date(error.created_at).toLocaleString()}
        </div>
        <div>
          <strong>User:</strong> {error.user_id_hash ? error.user_id_hash.substring(0, 8) + '...' : 'Anonymous'}
        </div>
        {error.context && (
          <div>
            <strong>Context:</strong> {error.context}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * TabButton - Navigation tab
 */
function TabButton({ label, isActive, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '0.75rem 1rem',
        backgroundColor: 'transparent',
        color: isActive ? '#d32f2f' : '#999',
        border: 'none',
        borderBottom: isActive ? '3px solid #d32f2f' : '3px solid transparent',
        cursor: 'pointer',
        fontSize: '13px',
        fontWeight: isActive ? 'bold' : 'normal',
      }}
    >
      {label}
    </button>
  );
}
