import { useCallback, useEffect, useState } from 'react';
import { useSwipeable } from 'react-swipeable';
import { motion, AnimatePresence } from 'framer-motion';
import Navigation from './Navigation';
import Footer from '../components/Footer';
import { HelpIcon } from '../components/help/HelpIcon';
import { HelpChatWindow } from '../components/help/HelpChatWindow';
import { useHelpChat } from '../hooks/useHelpChat';
import { trackPageView } from '../utils/analyticsTracker';
import ChatPage from '../pages/ChatPage';
import PersonalInfoPage from '../pages/PersonalInfoPage';
import PreferencesPage from '../pages/PreferencesPage';
import MySignPage from '../pages/MySignPage';
import MoonPhasePage from '../pages/MoonPhasePage';
import HoroscopePage from '../pages/HoroscopePage';
import CosmicWeatherPage from '../pages/CosmicWeatherPage';
import SecurityPage from '../pages/SecurityPage';
import SettingsPage from '../pages/SettingsPage';
import BillingPage from '../pages/BillingPage';
import AdminPage from '../pages/AdminPage';
import { useModeDetection } from './MainContainer/hooks/useModeDetection';
import { useModeRules } from './MainContainer/hooks/useModeRules';
import { logErrorFromCatch } from '../shared/errorLogger.js';
import './MainContainer.css';

// Define all pages in order (matches menu order)
const PAGES = [
  { id: 'chat', label: 'Chat', component: ChatPage },
  { id: 'personal', label: 'Personal Info', component: PersonalInfoPage },
  { id: 'preferences', label: 'Preferences', component: PreferencesPage },
  { id: 'sign', label: 'My Sign', component: MySignPage },
  { id: 'moon', label: 'Moon Phase', component: MoonPhasePage },
  { id: 'horoscope', label: 'Horoscope', component: HoroscopePage },
  { id: 'cosmic', label: 'Cosmic Weather', component: CosmicWeatherPage },
  { id: 'security', label: 'Security', component: SecurityPage },
  { id: 'settings', label: 'Settings', component: SettingsPage },
  { id: 'billing', label: 'Billing & Subscriptions', component: BillingPage },
  { id: 'admin', label: 'Admin', component: AdminPage },
];

export default function MainContainer({ auth, token, userId, onLogout, onExit, startingPage = 0, billingTab = 'payment-methods', onNavigateFromBilling, onboarding }) {
  const [currentPageIndex, setCurrentPageIndex] = useState(startingPage);
  const [swipeDirection, setSwipeDirection] = useState(0);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [navVisible, setNavVisible] = useState(true);

  // Help chat state (persistent across pages)
  const {
    isHelpOpen,
    toggleHelp,
    closeHelp,
    minimizeHelp
  } = useHelpChat();

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';
  const currentPage = PAGES[currentPageIndex];

  // Detect current application mode (free trial, onboarding, or normal)
  const currentMode = useModeDetection(auth, onboarding);
  const modeRules = useModeRules(currentMode);

  // CRITICAL: Define goToPage FIRST so it can be used in effects and handlers
  // This must come before any effect that calls it
  const goToPage = useCallback((index) => {
    
    // Check if page is allowed in current mode
    const isAllowed = modeRules.isPageAllowed(index);
    
    if (!isAllowed) {
      logErrorFromCatch('[MAIN-CONTAINER] Navigation to page', index, 'BLOCKED by mode rules');
      return;
    }
    setCurrentPageIndex(prevPageIndex => {
      const newIndex = Math.max(0, Math.min(index, PAGES.length - 1));
      if (newIndex !== prevPageIndex) {
        setSwipeDirection(newIndex > prevPageIndex ? 1 : -1);
        window.history.pushState({ pageIndex: newIndex }, '');
      }
      return newIndex;
    });
  }, [modeRules, currentMode, currentPageIndex]);

  // Handle navigation away from billing page - separate effect to avoid setState in render
  useEffect(() => {
    // If leaving billing page (9) and going to another page, notify App to re-check subscription
    if (currentPageIndex !== 9 && onNavigateFromBilling) {
      const prevPageWasBilling = window.history.state?.prevPageWasBilling;
      if (prevPageWasBilling) {
        onNavigateFromBilling();
        // Clear the flag
        window.history.replaceState({ 
          ...window.history.state, 
          prevPageWasBilling: false 
        }, '');
      }
    }
    // Mark if we're currently on billing page
    if (currentPageIndex === 9) {
      window.history.replaceState({ 
        ...window.history.state, 
        prevPageWasBilling: true 
      }, '');
    }
  }, [currentPageIndex, onNavigateFromBilling]);

  // CRITICAL: Update currentPageIndex when startingPage changes during onboarding
  // This handles navigation when user clicks onboarding modal buttons or auto-routing
  // NOTE: Only run when startingPage changes, NOT when currentPageIndex changes
  // This prevents undoing programmatic navigation from pages themselves
  useEffect(() => {
    const isStillOnboarding = onboarding?.onboardingStatus?.isOnboarding === true;
    const personalInfoCompleted = onboarding?.onboardingStatus?.completedSteps?.personal_info === true;
    
    // If user is onboarding AND startingPage changes, navigate to that page
    // UNLESS personal_info is complete and we're on Chat (0) - don't force back to PersonalInfo
    if (isStillOnboarding && startingPage !== currentPageIndex) {
      // Special case: If personal_info is done and we're on Chat (showing welcome), don't navigate away
      if (personalInfoCompleted && currentPageIndex === 0 && startingPage === 1) {
        return;
      }
      
      goToPage(startingPage);
    }
    // IMPORTANT: Dependency array excludes currentPageIndex to avoid fighting with programmatic navigation
  }, [startingPage, onboarding?.onboardingStatus?.isOnboarding, onboarding?.onboardingStatus?.completedSteps?.personal_info, goToPage, currentPageIndex]);

  // Track scroll to hide/show nav on mobile
  useEffect(() => {
    const handleScroll = (e) => {
      const currentScrollY = e.target.scrollTop || window.scrollY;
      
      // Only hide nav on mobile when scrolling down
      if (currentScrollY > lastScrollY + 50) {
        setNavVisible(false);
      } else if (currentScrollY < lastScrollY - 50) {
        setNavVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    const container = document.querySelector('.pages-container');
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [lastScrollY]);

  // Browser back button support - behavior depends on mode
  useEffect(() => {
    const handlePopState = (e) => {
      // If mode says back button should exit, trigger exit (free trial mode)
      if (modeRules.backButtonShouldExit() && onExit) {
        onExit();
        return;
      }
      
      // Otherwise allow normal page navigation
      if (e.state?.pageIndex !== undefined) {
        setCurrentPageIndex(e.state.pageIndex);
      }
    };

    // Push a dummy state to prevent going outside the app
    window.history.pushState({ pageIndex: currentPageIndex }, '');
    window.addEventListener('popstate', handlePopState);

    return () => window.removeEventListener('popstate', handlePopState);
  }, [currentMode, modeRules, currentPageIndex, onExit]);

  // Swipe handlers - only enabled for modes that allow it
  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => modeRules.isSwipeEnabled() && goToPage(currentPageIndex + 1),
    onSwipedRight: () => modeRules.isSwipeEnabled() && goToPage(currentPageIndex - 1),
    trackMouse: false,
    preventScrollOnSwipe: true,
  });

  const PageComponent = currentPage.component;

  // Track page views
  useEffect(() => {
    if (currentPage) {
      trackPageView(currentPage.id);
    }
  }, [currentPage, currentPageIndex]);

  return (
    <div className="main-container">
      <Navigation
        pages={PAGES}
        currentPageIndex={currentPageIndex}
        onNavigate={(index) => goToPage(index)}
        isVisible={navVisible}
        onLogout={onLogout}
        isTemporaryAccount={auth?.isTemporaryAccount}
        isDisabled={modeRules.isNavDisabled()}
        userEmail={auth?.authEmail}
      />

      <div className="pages-container" {...swipeHandlers}>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPage.id}
            initial={{ opacity: 0, x: swipeDirection * 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -swipeDirection * 100 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="page-wrapper"
          >
            <PageComponent
              userId={userId}
              token={token}
              auth={auth}
              onNavigateToPage={goToPage}
              onLogout={onLogout}
              onExit={onExit}
              onboarding={onboarding}
              billingTab={currentPage.id === 'billing' ? billingTab : undefined}
            />
            {/* Footer at bottom of scrollable content */}
            <Footer />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Help Icon - Show when chat is closed */}
      {!isHelpOpen && (
        <HelpIcon 
          isOpen={isHelpOpen} 
          onToggle={toggleHelp}
        />
      )}

      {/* Help Chat Window - Persistent across pages */}
      {isHelpOpen && (
        <HelpChatWindow
          isOpen={isHelpOpen}
          onClose={closeHelp}
          userId={userId}
          token={token}
          apiUrl={API_URL}
          currentPage={currentPage.label}
          onMinimize={minimizeHelp}
        />
      )}
    </div>
  );
}
