import { useState, useCallback } from 'react';

export function useSubscriptionState() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [activeSubscriptions, setActiveSubscriptions] = useState({});
  const [expandedSub, setExpandedSub] = useState(null);
  
  // Modal state for incomplete subscriptions
  const [showSubscriptionConfirmationModal, setShowSubscriptionConfirmationModal] = useState(false);
  const [pendingSubscription, setPendingSubscription] = useState(null);

  const clearMessages = useCallback(() => {
    setError(null);
    setSuccess(false);
  }, []);

  return {
    subscriptions,
    setSubscriptions,
    error,
    setError,
    success,
    setSuccess,
    activeSubscriptions,
    setActiveSubscriptions,
    expandedSub,
    setExpandedSub,
    clearMessages,
    showSubscriptionConfirmationModal,
    setShowSubscriptionConfirmationModal,
    pendingSubscription,
    setPendingSubscription,
  };
}
