/**
 * Violation Report Tab Component
 * Main container for violation monitoring and analytics
 * 
 * Refactored for maintainability:
 * - Imports section components from ./sections/
 * - Uses centralized styles from violationStyles.js
 * - Focuses on state management and data fetching
 */

import React, { useState } from 'react';
import { styles } from './violationStyles';
import SummaryStats from './sections/SummaryStats';
import ViolationsByType from './sections/ViolationsByType';
import EscalationMetrics from './sections/EscalationMetrics';
import RedemptionAnalytics from './sections/RedemptionAnalytics';
import FalsePositiveAnalysis from './sections/FalsePositiveAnalysis';
import PatternDetection from './sections/PatternDetection';
import TrendingAnalysis from './sections/TrendingAnalysis';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

export default function ViolationReportTab({ token }) {
  const [isLoading, setIsLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  /**
   * Fetch violation report from API
   */
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

  /**
   * Export report as JSON file
   */
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
    <div style={styles.container}>
      {/* Error Message */}
      {error && (
        <div style={styles.messageBox('error')}>
          {error}
        </div>
      )}

      {/* Success Message */}
      {message && (
        <div style={styles.messageBox('success')}>
          {message}
        </div>
      )}

      {/* Action Buttons */}
      <div style={styles.buttonContainer}>
        <button
          onClick={handleFetchReport}
          disabled={isLoading}
          style={{
            ...styles.button(isLoading),
            backgroundColor: '#7c63d8',
          }}
        >
          🔄 Load Violation Report
        </button>

        <button
          onClick={handleExportJSON}
          disabled={!report || isLoading}
          style={{
            ...styles.button(!report || isLoading),
            backgroundColor: '#4caf50',
          }}
        >
          💾 Export JSON
        </button>
      </div>

      {/* Report Content or Empty State */}
      {report ? (
        <div style={styles.reportContainer}>
          <h2 style={styles.reportTitle}>📋 Violation Report</h2>

          {/* Section 1: Summary Statistics */}
          <SummaryStats summary={report.summary} />

          {/* Section 2: Violations by Type */}
          <ViolationsByType byType={report.by_type} />

          {/* Section 3: Escalation Metrics */}
          <EscalationMetrics escalationMetrics={report.escalation_metrics} />

          {/* Section 4: Redemption Analytics */}
          <RedemptionAnalytics redemptionAnalytics={report.redemption_analytics} />

          {/* Section 5: False Positive Analysis */}
          <FalsePositiveAnalysis falsePositiveAnalysis={report.false_positive_analysis} />

          {/* Section 6: Pattern Detection */}
          <PatternDetection patterns={report.patterns} />

          {/* Section 7: Trending Analysis */}
          <TrendingAnalysis trending={report.trending} />

          {/* Footer */}
          <p style={styles.footer}>
            💡 Click "Export JSON" to download the full report for deeper analysis
          </p>
        </div>
      ) : (
        <div style={styles.emptyState}>
          <p>Click "Load Violation Report" to view monitoring data</p>
        </div>
      )}
    </div>
  );
}
