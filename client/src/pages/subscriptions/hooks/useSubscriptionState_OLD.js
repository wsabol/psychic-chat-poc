/**
 * useSubscriptionState Hook
 * Manages all state for subscriptions page
 */

import { useState, useEffect } from 'react';
import { useBilling } from '../../../hooks/useBilling';

export function useSubscriptionState(token) {
  const billing = useBilling(token);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [activeSubscriptions, setActiveSubscriptions] = useState({});
  const [expandedSub, setExpandedSub] = useState(null);

  // Load billing data on mount
  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    billing.fetchAvailablePrices();
    billing.fetchSubscriptions();
  }, []);

  // Initialize active subscriptions state
  useEffect(() => {
    const active = {};
    billing.subscriptions?.forEach(sub => {
      if (sub.status !== 'canceled' && !sub.cancel_at_period_end) {
        active[sub.id] = true;
      }
    });
    setActiveSubscriptions(active);
  }, [billing.subscriptions]);

  // Clear success message after timeout
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  // Clear error message after timeout
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  return {
    // Billing state
    billing,
    
    // UI state
    error,
    setError,
    success,
    setSuccess,
    activeSubscriptions,
    setActiveSubscriptions,
    expandedSub,
    setExpandedSub
  };
}
