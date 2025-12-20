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
  isDisabled = false
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedSubmenu, setExpandedSubmenu] = useState(null);

  return (
    <>
      <NavMobile
        pages={pages}
        currentPageIndex={currentPageIndex}
        onNavigate={onNavigate}
        onLogout={onLogout}
        isTemporaryAccount={isTemporaryAccount}
        isDisabled={isDisabled}
        menuStructure={menuStructure}
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
        menuStructure={menuStructure}
        expandedSubmenu={expandedSubmenu}
        setExpandedSubmenu={setExpandedSubmenu}
      />
    </>
  );
}
