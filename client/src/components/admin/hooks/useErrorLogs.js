/**
 * useErrorLogs Hook
 * Encapsulates error log fetching and state management
 * FIX: No blinking - stable function, single useEffect for tab changes
 */

import { useState, useCallback, useEffect } from 'react';

const ENDPOINTS = {
  critical: '/admin/errors/errors/critical',
  summary: '/admin/errors/errors/summary'
};

export function useErrorLogs(token, apiUrl) {
  const [activeTab, setActiveTab] = useState('critical');
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch function - does NOT depend on activeTab to prevent re-creation
  const fetchErrorLogs = useCallback(async (tab) => {
    setIsLoading(true);
    setError('');

    try {
      const endpoint = ENDPOINTS[tab] || ENDPOINTS.critical;
      const response = await fetch(`${apiUrl}${endpoint}`, {
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
  }, [token, apiUrl]);

  // Auto-fetch when tab changes
  useEffect(() => {
    fetchErrorLogs(activeTab);
  }, [activeTab, fetchErrorLogs]);

  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab);
  }, []);

  const handleRefresh = useCallback(() => {
    fetchErrorLogs(activeTab);
  }, [fetchErrorLogs, activeTab]);

  const handleMarkResolved = useCallback(async (errorId) => {
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

      fetchErrorLogs(activeTab);
    } catch (err) {
      setError(err.message);
    }
  }, [token, apiUrl, fetchErrorLogs, activeTab]);

  return {
    activeTab,
    data,
    isLoading,
    error,
    fetchErrorLogs,
    handleTabChange,
    handleRefresh,
    handleMarkResolved,
  };
}
