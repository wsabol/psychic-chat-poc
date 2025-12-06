import { useEffect } from 'react';

/**
 * useBackButtonHandler - Handle browser back button to navigate to account creation
 * instead of going back through app history
 */
export function useBackButtonHandler(isTemporaryAccount, onNavigateToAccount) {
  useEffect(() => {
    // Push a dummy history state to prevent going back beyond the app
    window.history.pushState(null, '');

    const handlePopState = (e) => {
      e.preventDefault();
      
      // If temp account user hits back button, go to account creation
      if (isTemporaryAccount && onNavigateToAccount) {
        onNavigateToAccount();
      }
      
      // Re-push to prevent back button from working
      window.history.pushState(null, '');
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isTemporaryAccount, onNavigateToAccount]);
}
