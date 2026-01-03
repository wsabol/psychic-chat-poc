import { useState, useCallback, useEffect } from 'react';
import { billingFetch } from './billing/billingApi';

/**
 * useOnboarding Hook
 * 
 * Manages onboarding flow:
 * - Fetches user's onboarding status
 * - Updates onboarding progress
 * - Handles modal drag and minimize
 * - Tracks completion of steps
 * 
 * Returns:
 * - onboardingStatus: Current onboarding state
 * - loading: Whether data is loading
 * - error: Any errors during operations
 * - position: Modal position for dragging
 * - isMinimized: Whether modal is minimized
 * - isDragging: Whether user is dragging modal
 * - fetchOnboardingStatus: Fetch current status
 * - updateOnboardingStep: Mark step as complete
 * - setIsMinimized: Toggle minimize
 * - handleStartDrag: Start dragging modal
 */
export function useOnboarding(token) {
  const [onboardingStatus, setOnboardingStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [isMinimized, setIsMinimized] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  /**
   * Fetch onboarding status from server
   */
  const fetchOnboardingStatus = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return null;
    }

          try {
        setError(null);
        setLoading(true);
        const data = await billingFetch('/billing/onboarding-status', { token });
        console.log('[ONBOARDING] Fetch status response:', data);
        setOnboardingStatus(data);
        console.log('[ONBOARDING] State updated, isOnboarding will be:', data.isOnboarding);
        return data;
    } catch (err) {
      console.error('[ONBOARDING] Fetch status error:', err);
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [token]);

  /**
   * Update onboarding step - mark a step as complete
   */
  const updateOnboardingStep = useCallback(
    async (step) => {
      if (!token) {
        throw new Error('No authentication token');
      }

      try {
        setError(null);
        const data = await billingFetch(`/billing/onboarding-step/${step}`, {
          method: 'POST',
          token,
        });
        // Refresh status after update
        await fetchOnboardingStatus();
        return data;
      } catch (err) {
        console.error('[ONBOARDING] Update step error:', err);
        setError(err.message);
        throw err;
      }
    },
    [token, fetchOnboardingStatus]
  );

  /**
   * Start dragging modal
   */
  const handleStartDrag = useCallback((e) => {
    if (e.button !== 0) return; // Only left mouse button
    if (e.target.closest('.onboarding-controls')) return; // Don't drag from controls
    
    setIsDragging(true);
    setDragStart({ 
      x: e.clientX - position.x, 
      y: e.clientY - position.y 
    });
  }, [position]);

  /**
   * Handle mouse move while dragging
   */
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e) => {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStart]);

  /**
   * Fetch status on mount and when token changes
   */
  useEffect(() => {
    if (token) {
      fetchOnboardingStatus();
    }
  }, [token, fetchOnboardingStatus]);

  return {
    // State
    onboardingStatus,
    loading,
    error,
    position,
    isMinimized,
    isDragging,

    // Methods
    fetchOnboardingStatus,
    updateOnboardingStep,
    setIsMinimized,
    handleStartDrag,
  };
}
