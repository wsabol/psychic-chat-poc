import { useState, useCallback } from 'react';

export function useSubscriptionState() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [activeSubscriptions, setActiveSubscriptions] = useState({});
  
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
    clearMessages,
    showSubscriptionConfirmationModal,
    setShowSubscriptionConfirmationModal,
    pendingSubscription,
    setPendingSubscription,
  };
}
