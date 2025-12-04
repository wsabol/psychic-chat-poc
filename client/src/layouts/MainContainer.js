import { useCallback, useEffect, useState } from 'react';
import { useSwipeable } from 'react-swipeable';
import { motion, AnimatePresence } from 'framer-motion';
import Navigation from './Navigation';
import PageIndicator from './PageIndicator';
import ChatPage from '../pages/ChatPage';
import PersonalInfoPage from '../pages/PersonalInfoPage';
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
  { id: 'sign', label: 'My Sign', component: () => <PlaceholderPage pageId="My Sign" /> },
  { id: 'moon', label: 'Moon Phase', component: () => <PlaceholderPage pageId="Moon Phase" /> },
  { id: 'horoscope', label: 'Horoscope', component: () => <PlaceholderPage pageId="Horoscope" /> },
  { id: 'cosmic', label: 'Cosmic Weather', component: () => <PlaceholderPage pageId="Cosmic Weather" /> },
  { id: 'security', label: 'Security', component: () => <PlaceholderPage pageId="Security" /> },
  { id: 'billing', label: 'Billing', component: () => <PlaceholderPage pageId="Billing" /> },

];

export default function MainContainer({ auth, token, userId }) {
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

  // Browser back button support
  useEffect(() => {
    const handlePopState = (e) => {
      if (e.state?.pageIndex !== undefined) {
        setCurrentPageIndex(e.state.pageIndex);
      }
    };

    window.addEventListener('popstate', handlePopState);
    
    // Set initial state
    window.history.replaceState({ pageIndex: 0 }, '');

    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

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
      />

      <PageIndicator
        current={currentPageIndex}
        total={PAGES.length}
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
            />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
