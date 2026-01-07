/**
 * Violation Report Tab Component
 * Displays violation monitoring and analytics
 */

import React, { useState, useEffect } from 'react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

export default function ViolationReportTab({ token }) {
  const [isLoading, setIsLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Fetch violation report
  const handleFetchReport = async () => {
    setIsLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch(`${API_URL}/violations/report`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch violation report');
      }

      const data = await response.json();
      setReport(data);
      setMessage('Violation report loaded successfully');
    } catch (err) {
      console.error('Error fetching violation report:', err);
      setError(err.message || 'Failed to fetch violation report');
    } finally {
      setIsLoading(false);
    }
  };

  // Export report as JSON
  const handleExportJSON = () => {
    if (!report) return;

    const jsonString = JSON.stringify(report, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `violation-report-${new Date().toISOString().split('T')[0]}.json`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div style={{ padding: '1.5rem' }}>
      {/* Messages */}
      {error && (
        <div style={{
          padding: '0.75rem',
          marginBottom: '1rem',
          borderRadius: '6px',
          backgroundColor: '#ffebee',
          color: '#c62828',
          fontSize: '13px',
          border: '1px solid #ef5350',
        }}>
          {error}
        </div>
      )}

      {message && (
        <div style={{
          padding: '0.75rem',
          marginBottom: '1rem',
          borderRadius: '6px',
          backgroundColor: '#e8f5e9',
          color: '#2e7d32',
          fontSize: '13px',
          border: '1px solid #81c784',
        }}>
          {message}
        </div>
      )}

      {/* Action Buttons */}
      <div style={{
        display: 'flex',
        gap: '0.75rem',
        marginBottom: '1.5rem',
        flexWrap: 'wrap',
      }}>
        <button
          onClick={handleFetchReport}
          disabled={isLoading}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#7c63d8',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            fontSize: '13px',
            fontWeight: 'bold',
            opacity: isLoading ? 0.6 : 1,
          }}
        >
          🔄 Load Violation Report
        </button>

        <button
          onClick={handleExportJSON}
          disabled={!report || isLoading}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#4caf50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: (!report || isLoading) ? 'not-allowed' : 'pointer',
            fontSize: '13px',
            fontWeight: 'bold',
            opacity: (!report || isLoading) ? 0.6 : 1,
          }}
        >
          💾 Export JSON
        </button>
      </div>

      {/* Report Display */}
      {report ? (
        <div style={{
          backgroundColor: 'rgba(255, 255, 255, 0.97)',
          padding: '1.5rem',
          borderRadius: '8px',
          border: '1px solid #e0e0e0',
        }}>
          <h2 style={{ marginTop: 0, fontSize: '18px', marginBottom: '1.5rem' }}>📋 Violation Report</h2>

          {/* Summary Stats */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '1rem',
            marginBottom: '2rem',
          }}>
            <StatBox label="Total Violations" value={report.summary.total_active_violations} color="#ff9800" />
            <StatBox label="Warnings Issued" value={report.summary.warnings_issued} color="#4caf50" />
            <StatBox label="Suspensions" value={report.summary.suspensions_issued} color="#ff6f00" />
            <StatBox label="Permanent Bans" value={report.summary.permanent_bans} color="#d32f2f" />
            <StatBox label="Successful Redemptions" value={report.summary.successful_redemptions} color="#2196f3" />
            <StatBox label="False Positives" value={report.summary.reported_false_positives} color="#9c27b0" />
            <StatBox label="Avg Confidence" value={`${(report.summary.avg_detection_confidence * 100).toFixed(1)}%`} color="#00bcd4" />
          </div>

          {/* Violations by Type */}
          {report.by_type && report.by_type.length > 0 && (
            <details style={{ marginBottom: '1.5rem', marginTop: '1.5rem' }}>
              <summary style={{ cursor: 'pointer', fontWeight: 'bold', marginBottom: '0.5rem', fontSize: '16px' }}>
                📊 Violations by Type ({report.by_type.length})
              </summary>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '1rem',
                marginTop: '1rem',
              }}>
                {report.by_type.map((violationType, idx) => (
                  <ViolationTypeCard key={idx} data={violationType} />
                ))}
              </div>
            </details>
          )}

          {/* Escalation Metrics */}
          {report.escalation_metrics && report.escalation_metrics.length > 0 && (
            <details style={{ marginBottom: '1.5rem', marginTop: '1.5rem' }}>
              <summary style={{ cursor: 'pointer', fontWeight: 'bold', marginBottom: '0.5rem', fontSize: '16px' }}>
                📈 Escalation Metrics ({report.escalation_metrics.length})
              </summary>
              <div style={{
                backgroundColor: '#f5f5f5',
                padding: '1rem',
                borderRadius: '6px',
                marginTop: '1rem',
                overflowX: 'auto',
              }}>
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '12px',
                }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #ddd' }}>
                      <th style={{ padding: '0.5rem', textAlign: 'left' }}>Type</th>
                      <th style={{ padding: '0.5rem', textAlign: 'center' }}>Total</th>
                      <th style={{ padding: '0.5rem', textAlign: 'center' }}>1st Offense %</th>
                      <th style={{ padding: '0.5rem', textAlign: 'center' }}>2nd Offense %</th>
                      <th style={{ padding: '0.5rem', textAlign: 'center' }}>Ban %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.escalation_metrics.map((row, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '0.5rem', fontWeight: 'bold' }}>{row.violation_type}</td>
                        <td style={{ padding: '0.5rem', textAlign: 'center' }}>{row.total}</td>
                        <td style={{ padding: '0.5rem', textAlign: 'center' }}>{row.first_offense_pct}%</td>
                        <td style={{ padding: '0.5rem', textAlign: 'center' }}>{row.second_offense_pct}%</td>
                        <td style={{ padding: '0.5rem', textAlign: 'center', color: '#d32f2f', fontWeight: 'bold' }}>{row.permanent_ban_pct}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          )}

          {/* Redemption Analytics */}
          {report.redemption_analytics && report.redemption_analytics.length > 0 && (
            <details style={{ marginBottom: '1.5rem', marginTop: '1.5rem' }}>
              <summary style={{ cursor: 'pointer', fontWeight: 'bold', marginBottom: '0.5rem', fontSize: '16px' }}>
                ✨ Redemption Analytics ({report.redemption_analytics.length})
              </summary>
              <div style={{
                backgroundColor: '#f5f5f5',
                padding: '1rem',
                borderRadius: '6px',
                marginTop: '1rem',
                overflowX: 'auto',
              }}>
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '12px',
                }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #ddd' }}>
                      <th style={{ padding: '0.5rem', textAlign: 'left' }}>Type</th>
                      <th style={{ padding: '0.5rem', textAlign: 'center' }}>Eligible</th>
                      <th style={{ padding: '0.5rem', textAlign: 'center' }}>Redeemed</th>
                      <th style={{ padding: '0.5rem', textAlign: 'center' }}>Rate</th>
                      <th style={{ padding: '0.5rem', textAlign: 'center' }}>Avg Hours</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.redemption_analytics.map((row, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '0.5rem', fontWeight: 'bold' }}>{row.violation_type}</td>
                        <td style={{ padding: '0.5rem', textAlign: 'center' }}>{row.total_eligible}</td>
                        <td style={{ padding: '0.5rem', textAlign: 'center', color: '#4caf50', fontWeight: 'bold' }}>{row.successfully_redeemed}</td>
                        <td style={{ padding: '0.5rem', textAlign: 'center' }}>{row.redemption_rate}%</td>
                        <td style={{ padding: '0.5rem', textAlign: 'center' }}>{row.avg_hours_to_redemption.toFixed(1)}h</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          )}

          {/* False Positive Analysis */}
          {report.false_positive_analysis && (
            <details style={{ marginBottom: '1.5rem', marginTop: '1.5rem' }}>
              <summary style={{ cursor: 'pointer', fontWeight: 'bold', marginBottom: '0.5rem', fontSize: '16px' }}>
                ⚠️ False Positive Analysis
              </summary>
              <div style={{ marginTop: '1rem' }}>
                {report.false_positive_analysis.by_type && report.false_positive_analysis.by_type.length > 0 && (
                  <div style={{ marginBottom: '1rem' }}>
                    <h4>By Type:</h4>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: '0.75rem',
                    }}>
                      {report.false_positive_analysis.by_type.map((row, idx) => (
                        <div key={idx} style={{
                          backgroundColor: '#fff3e0',
                          padding: '0.75rem',
                          borderRadius: '4px',
                          border: '1px solid #ffb74d',
                        }}>
                          <p style={{ margin: '0 0 0.25rem 0', fontWeight: 'bold', fontSize: '12px' }}>{row.type}</p>
                          <p style={{ margin: '0.25rem 0', fontSize: '11px', color: '#666' }}>Reported: {row.reported}</p>
                          <p style={{ margin: '0.25rem 0', fontSize: '11px', color: '#666' }}>Reporters: {row.unique_reporters}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {report.false_positive_analysis.top_reasons && report.false_positive_analysis.top_reasons.length > 0 && (
                  <div>
                    <h4>Top Reasons:</h4>
                    <ol style={{ paddingLeft: '1.5rem', marginTop: '0.5rem' }}>
                      {report.false_positive_analysis.top_reasons.map((row, idx) => (
                        <li key={idx} style={{ fontSize: '12px', marginBottom: '0.25rem' }}>
                          <strong>{row.reason}</strong> ({row.count})
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            </details>
          )}

          {/* Patterns */}
          {report.patterns && (
            <details style={{ marginBottom: '1.5rem', marginTop: '1.5rem' }}>
              <summary style={{ cursor: 'pointer', fontWeight: 'bold', marginBottom: '0.5rem', fontSize: '16px' }}>
                🔍 Violation Patterns
              </summary>
              <div style={{ marginTop: '1rem' }}>
                {report.patterns.patterns_detected && report.patterns.patterns_detected.length > 0 && (
                  <div style={{ marginBottom: '1.5rem' }}>
                    <h4>Detected Patterns:</h4>
                    <div style={{
                      backgroundColor: '#f5f5f5',
                      padding: '1rem',
                      borderRadius: '6px',
                      overflowX: 'auto',
                    }}>
                      <table style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        fontSize: '12px',
                      }}>
                        <thead>
                          <tr style={{ borderBottom: '2px solid #ddd' }}>
                            <th style={{ padding: '0.5rem', textAlign: 'left' }}>Pattern</th>
                            <th style={{ padding: '0.5rem', textAlign: 'center' }}>Severity</th>
                            <th style={{ padding: '0.5rem', textAlign: 'center' }}>Count</th>
                            <th style={{ padding: '0.5rem', textAlign: 'center' }}>Reviewed</th>
                            <th style={{ padding: '0.5rem', textAlign: 'center' }}>Score</th>
                          </tr>
                        </thead>
                        <tbody>
                          {report.patterns.patterns_detected.map((row, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                              <td style={{ padding: '0.5rem', fontWeight: 'bold' }}>{row.pattern_type}</td>
                              <td style={{
                                padding: '0.5rem',
                                textAlign: 'center',
                                color: row.severity === 'CRITICAL' ? '#d32f2f' : row.severity === 'HIGH' ? '#ff6f00' : '#ff9800',
                                fontWeight: 'bold'
                              }}>
                                {row.severity}
                              </td>
                              <td style={{ padding: '0.5rem', textAlign: 'center' }}>{row.detected_count}</td>
                              <td style={{ padding: '0.5rem', textAlign: 'center' }}>{row.reviewed}</td>
                              <td style={{ padding: '0.5rem', textAlign: 'center' }}>{row.avg_pattern_score.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                {report.patterns.requiring_manual_review && report.patterns.requiring_manual_review.length > 0 && (
                  <div style={{ backgroundColor: '#ffebee', padding: '1rem', borderRadius: '6px', borderLeft: '4px solid #d32f2f' }}>
                    <h4 style={{ marginTop: 0, color: '#c62828' }}>⚠️ Requiring Manual Review:</h4>
                    <ul style={{ paddingLeft: '1.5rem', marginBottom: 0 }}>
                      {report.patterns.requiring_manual_review.map((row, idx) => (
                        <li key={idx} style={{ fontSize: '12px', marginBottom: '0.25rem' }}>
                          <strong>{row.pattern_type}</strong>: {row.pending_review} pending
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </details>
          )}

          {/* Trending Analysis */}
          {report.trending && (
            <details style={{ marginBottom: '1.5rem', marginTop: '1.5rem' }}>
              <summary style={{ cursor: 'pointer', fontWeight: 'bold', marginBottom: '0.5rem', fontSize: '16px' }}>
                📊 Trending (Last 30 Days)
              </summary>
              <div style={{ marginTop: '1rem' }}>
                {report.trending.daily_trend && report.trending.daily_trend.length > 0 && (
                  <div>
                    <h4>Daily Trend:</h4>
                    <div style={{
                      backgroundColor: '#f5f5f5',
                      padding: '0.75rem',
                      borderRadius: '6px',
                      fontSize: '11px',
                      marginBottom: '1rem',
                    }}>
                      {report.trending.daily_trend.slice(0, 10).map((row, idx) => (
                        <div key={idx} style={{ padding: '0.25rem 0', borderBottom: idx < 9 ? '1px solid #eee' : 'none' }}>
                          <strong>{row.date}</strong>: {row.violations} violations, {row.unique_types} types
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </details>
          )}

          <p style={{ color: '#999', fontSize: '12px', marginTop: '1.5rem' }}>
            💡 Click "Export JSON" to download the full report for deeper analysis
          </p>
        </div>
      ) : (
        <div style={{
          backgroundColor: 'rgba(255, 255, 255, 0.97)',
          padding: '2rem',
          borderRadius: '8px',
          border: '1px solid #e0e0e0',
          textAlign: 'center',
          color: '#999',
        }}>
          <p>Click "Load Violation Report" to view monitoring data</p>
        </div>
      )}
    </div>
  );
}

/**
 * StatBox Component
 */
function StatBox({ label, value, color }) {
  return (
    <div style={{
      backgroundColor: '#f5f5f5',
      padding: '1rem',
      borderRadius: '6px',
      textAlign: 'center',
      border: `2px solid ${color || '#e0e0e0'}`,
    }}>
      <p style={{ margin: '0 0 0.5rem 0', color: '#999', fontSize: '11px' }}>{label}</p>
      <p style={{ margin: 0, fontSize: '22px', fontWeight: 'bold', color: color || '#333' }}>{value}</p>
    </div>
  );
}

/**
 * ViolationTypeCard Component
 */
function ViolationTypeCard({ data }) {
  return (
    <div style={{
      backgroundColor: '#f5f5f5',
      padding: '1rem',
      borderRadius: '6px',
      border: '1px solid #e0e0e0',
    }}>
      <p style={{ margin: '0 0 0.75rem 0', fontWeight: 'bold', fontSize: '12px' }}>{data.type}</p>
      <div style={{ fontSize: '11px', color: '#666', lineHeight: '1.6' }}>
        <div style={{ marginBottom: '0.25rem' }}><strong>Total:</strong> {data.total}</div>
        <div style={{ marginBottom: '0.25rem' }}><strong>Warnings:</strong> {data.warnings}</div>
        <div style={{ marginBottom: '0.25rem' }}><strong>Suspensions:</strong> {data.suspensions}</div>
        <div style={{ marginBottom: '0.25rem' }}><strong>Escalations:</strong> {data.escalations}</div>
        <div style={{ marginBottom: '0.25rem' }}><strong>FP Rate:</strong> {(data.false_positive_rate * 100).toFixed(2)}%</div>
        <div style={{ marginBottom: '0.25rem' }}><strong>Avg Confidence:</strong> {(data.avg_confidence_score * 100).toFixed(1)}%</div>
      </div>
    </div>
  );
}
