/**
 * useAnalyticsReport - Handle all analytics API operations
 */

import { useState } from 'react';
import { logErrorFromCatch } from '../../shared/errorLogger.js';

export function useAnalyticsReport(token, apiUrl) {
  const [isLoading, setIsLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const clearMessages = () => {
    setError('');
    setMessage('');
  };

  const fetchReport = async () => {
    setIsLoading(true);
    clearMessages();

    try {
      const response = await fetch(`${apiUrl}/analytics/report`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch report');
      }

      const data = await response.json();
      setReport(data);
      setMessage('Report loaded successfully');
    } catch (err) {
      logErrorFromCatch('Error fetching report:', err);
      setError(err.message || 'Failed to fetch analytics report');
    } finally {
      setIsLoading(false);
    }
  };

  const exportJSON = () => {
    if (!report) return;

    const jsonString = JSON.stringify(report, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `analytics-report-${new Date().toISOString().split('T')[0]}.json`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const deleteAllData = async () => {
    if (!window.confirm('⚠️ Are you sure? This will DELETE ALL analytics data. This cannot be undone!')) {
      return;
    }

    setIsLoading(true);
    clearMessages();

    try {
      const response = await fetch(`${apiUrl}/analytics/data`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete data');
      }

      const result = await response.json();
      setMessage(`✅ Deleted ${result.rows_deleted} analytics records`);
      setReport(null);
    } catch (err) {
      logErrorFromCatch('Error deleting data:', err);
      setError(err.message || 'Failed to delete analytics data');
    } finally {
      setIsLoading(false);
    }
  };

  const cleanupOldData = async () => {
    if (!window.confirm('Delete analytics data older than 90 days?')) {
      return;
    }

    setIsLoading(true);
    clearMessages();

    try {
      const response = await fetch(`${apiUrl}/analytics/cleanup`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to cleanup data');
      }

      const result = await response.json();
      setMessage(`✅ Deleted ${result.rows_deleted} old analytics records`);
      setReport(null);
    } catch (err) {
      logErrorFromCatch('Error cleaning up data:', err);
      setError(err.message || 'Failed to cleanup old data');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    report,
    error,
    message,
    fetchReport,
    exportJSON,
    deleteAllData,
    cleanupOldData,
  };
}
