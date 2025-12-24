import { useState, useCallback } from 'react';

/**
 * useHelpChat - Manages help chat state
 * Persists across page navigation
 */
export function useHelpChat() {
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const toggleHelp = useCallback(() => {
    if (isMinimized) {
      setIsMinimized(false);
    } else {
      setIsHelpOpen(!isHelpOpen);
    }
  }, [isHelpOpen, isMinimized]);

  const closeHelp = useCallback(() => {
    setIsHelpOpen(false);
    setIsMinimized(false);
  }, []);

  const minimizeHelp = useCallback(() => {
    setIsMinimized(true);
  }, []);

  const restoreHelp = useCallback(() => {
    setIsHelpOpen(true);
    setIsMinimized(false);
  }, []);

  return {
    isHelpOpen,
    setIsHelpOpen,
    isMinimized,
    setIsMinimized,
    toggleHelp,
    closeHelp,
    minimizeHelp,
    restoreHelp
  };
}
