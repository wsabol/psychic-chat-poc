import { useCallback, useEffect, useState } from 'react';
import { useSwipeable } from 'react-swipeable';
import { motion, AnimatePresence } from 'framer-motion';
import Navigation from './Navigation';
import ChatPage from '../pages/ChatPage';
import PersonalInfoPage from '../pages/PersonalInfoPage';
import MySignPage from '../pages/MySignPage';
import MoonPhasePage from '../pages/MoonPhasePage';
import HoroscopePage from '../pages/HoroscopePage';
import CosmicWeatherPage from '../pages/CosmicWeatherPage';
import SecurityPage from '../pages/SecurityPage';
import './MainContainer.css';

// Define all pages in order (matches menu order)
const PlaceholderPage = ({ pageId }) => (
  <div style={{ padding: '2rem', textAlign: 'center' }}>
    <h2>{pageId}</h2>
    <p>Coming soon...</p>
  </div>
);

const PAGES = [
  { id: 'chat', label: 'Chat', component: ChatPage },
  { id: 'personal', label: 'Personal Info', component: PersonalInfoPage },
  { id: 'sign', label: 'My Sign', component: MySignPage },
  { id: 'moon', label: 'Moon Phase', component: MoonPhasePage },
  { id: 'horoscope', label: 'Horoscope', component: HoroscopePage },
  { id: 'cosmic', label: 'Cosmic Weather', component: CosmicWeatherPage },
  { id: 'security', label: 'Security', component: SecurityPage },
  { id: 'billing', label: 'Billing', component: () => <PlaceholderPage pageId="Billing" /> },
];

export default function MainContainer({ auth, token, userId, onLogout, onExit }) {
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [swipeDirection, setSwipeDirection] = useState(0);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [navVisible, setNavVisible] = useState(true);

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

  // Browser back button support - for temp accounts, exit instead of navigating
  useEffect(() => {
    const handlePopState = (e) => {
      // For temp accounts, back button triggers exit (show ThankYouScreen)
      if (auth?.isTemporaryAccount && onExit) {
        console.log('[BACK-BUTTON] Temp account - triggering exit');
        onExit();
        return;
      }
      
      // For permanent accounts, allow normal page navigation
      if (e.state?.pageIndex !== undefined) {
        setCurrentPageIndex(e.state.pageIndex);
      }
    };

    // Push a dummy state to prevent going outside the app
    window.history.pushState({ pageIndex: currentPageIndex }, '');
    window.addEventListener('popstate', handlePopState);

    return () => window.removeEventListener('popstate', handlePopState);
  }, [auth?.isTemporaryAccount, currentPageIndex, onExit]);

  // Swipe handlers
  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => goToPage(currentPageIndex + 1),
    onSwipedRight: () => goToPage(currentPageIndex - 1),
    trackMouse: false,
    preventScrollOnSwipe: true,
  });

  const goToPage = useCallback((index) => {
    const newIndex = Math.max(0, Math.min(index, PAGES.length - 1));
    if (newIndex !== currentPageIndex) {
      setSwipeDirection(newIndex > currentPageIndex ? 1 : -1);
      setCurrentPageIndex(newIndex);
      window.history.pushState({ pageIndex: newIndex }, '');
    }
  }, [currentPageIndex]);

  const currentPage = PAGES[currentPageIndex];
  const PageComponent = currentPage.component;

  return (
    <div className="main-container">
      <Navigation
        pages={PAGES}
        currentPageIndex={currentPageIndex}
        onNavigate={(index) => goToPage(index)}
        isVisible={navVisible}
        onLogout={onLogout}
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
            />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
