import { useState } from 'react';
import { NavDesktop } from './Navigation/components/NavDesktop';
import { NavMobile } from './Navigation/components/NavMobile';
import { menuStructure } from './Navigation/menuStructure';
import './Navigation.css';

/**
 * Navigation - Main navigation component
 * Refactored to use modular desktop and mobile components
 */
export default function Navigation({
  pages,
  currentPageIndex,
  onNavigate,
  isVisible,
  onLogout,
  isTemporaryAccount,
  isDisabled = false,
  userEmail = ''
}) {

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [expandedSubmenu, setExpandedSubmenu] = useState(null);

  // Filter menu structure - hide admin items for non-admins
  const filteredMenu = menuStructure.filter(item => {
    if (item.adminOnly && userEmail !== 'starshiptechnology1@gmail.com') {
      return false;
    }
    return true;
  });

  return (
    <>
            <NavMobile
        pages={pages}
        currentPageIndex={currentPageIndex}
        onNavigate={onNavigate}
        onLogout={onLogout}
        isTemporaryAccount={isTemporaryAccount}
        isDisabled={isDisabled}
        menuStructure={filteredMenu}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        expandedSubmenu={expandedSubmenu}
        setExpandedSubmenu={setExpandedSubmenu}
      />

            <NavDesktop
        pages={pages}
        currentPageIndex={currentPageIndex}
        onNavigate={onNavigate}
        onLogout={onLogout}
        isTemporaryAccount={isTemporaryAccount}
        isDisabled={isDisabled}
        menuStructure={filteredMenu}
        expandedSubmenu={expandedSubmenu}
        setExpandedSubmenu={setExpandedSubmenu}
      />
    </>
  );
}
