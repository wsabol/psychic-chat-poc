import { useState } from 'react';
import './Navigation.css';

export default function Navigation({ pages, currentPageIndex, onNavigate, isVisible, onLogout, isTemporaryAccount }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedSubmenu, setExpandedSubmenu] = useState(null);

  // Disable menu navigation for temporary accounts (during onboarding)
  const handlePageClick = (pageId) => {
    if (isTemporaryAccount) return; // Menu disabled for temp accounts
    const index = pages.findIndex(p => p.id === pageId);
    if (index !== -1) {
      onNavigate(index);
      setMobileMenuOpen(false);
      setExpandedSubmenu(null);
    }
  };

  const showSubmenu = (submenuName) => {
    setExpandedSubmenu(submenuName);
  };

  const hideSubmenu = () => {
    setExpandedSubmenu(null);
  };

  // Menu structure - mirrors the old menu layout
  const menuStructure = [
    {
      id: 'chat',
      label: 'Chat',
      icon: '💬',
      type: 'page',
      pageId: 'chat',
    },
    {
      id: 'accountManagement',
      label: 'My Account',
      icon: '👤',
      type: 'category',
      submenu: [
        { id: 'personalInfo', label: 'Personal Information', icon: '👤', pageId: 'personal' },
        { id: 'security', label: 'Security', icon: '🔒', pageId: 'security' },
      ],
    },
    {
      id: 'billing',
      label: 'Billing & Subscriptions',
      icon: '💳',
      type: 'page',
      pageId: 'billing',
    },
    {
      id: 'astrology',
      label: 'Astrology',
      icon: '✨',
      type: 'category',
      submenu: [
        { id: 'mySign', label: 'My Sign', icon: '♈', pageId: 'sign' },
        { id: 'moonPhase', label: 'Moon Phase', icon: '🌙', pageId: 'moon' },
        { id: 'horoscope', label: 'Horoscope', icon: '🔮', pageId: 'horoscope' },
        { id: 'cosmicWeather', label: 'Cosmic Weather', icon: '🌌', pageId: 'cosmic' },
      ],
    },
  ];

  const isPageActive = (pageId) => {
    const index = pages.findIndex(p => p.id === pageId);
    return index === currentPageIndex;
  };

  return (
    <>
      {/* Mobile Header with Hamburger */}
      <header className="nav-mobile-header">
        <button
          className="hamburger-menu"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
        <h1 className="app-title">🔮 Oracle</h1>
        <div className="spacer"></div>
      </header>

      {/* Desktop Sidebar Navigation */}
      <nav className="nav-desktop-sidebar">
        <div className="nav-brand">
          <h1>🔮 Oracle</h1>
        </div>

        <ul className="nav-menu" style={isTemporaryAccount ? { opacity: 0.5 } : {}}>
          {menuStructure.map((item) => (
            <li key={item.id}>
              {item.type === 'page' ? (
                // Direct page link
                <button
                  className={`nav-item ${isPageActive(item.pageId) ? 'active' : ''}`}
                  onClick={() => handlePageClick(item.pageId)}
                  style={isTemporaryAccount ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
                >
                  <span className="nav-icon">{item.icon}</span>
                  <span className="nav-label">{item.label}</span>
                </button>
              ) : (
                // Category with submenu
                <>
                  <button
                    className="nav-item nav-category"
                    onClick={() => setExpandedSubmenu(expandedSubmenu === item.id ? null : item.id)}
                    style={isTemporaryAccount ? { opacity: 0.6 } : {}}
                  >
                    <span className="nav-icon">{item.icon}</span>
                    <span className="nav-label">{item.label}</span>
                    <span className="nav-arrow">{expandedSubmenu === item.id ? '▼' : '▶'}</span>
                  </button>
                  {expandedSubmenu === item.id && (
                    <ul className="nav-submenu">
                      {item.submenu.map((subitem) => (
                        <li key={subitem.id}>
                          <button
                            className={`nav-subitem ${isPageActive(subitem.pageId) ? 'active' : ''}`}
                            onClick={() => handlePageClick(subitem.pageId)}
                            style={isTemporaryAccount ? { opacity: 0.6 } : {}}
                          >
                            <span className="nav-icon">{subitem.icon}</span>
                            <span className="nav-label">{subitem.label}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </li>
          ))}
        </ul>

        <div className="nav-footer">
          <button
            className="nav-logout-btn"
            onClick={() => {
              setMobileMenuOpen(false);
              setExpandedSubmenu(null);
              onLogout && onLogout();
            }}
            aria-label="Log out"
          >
            🚪 Log Out
          </button>
          <p className="nav-version">v1.0</p>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <>
          <div
            className="nav-mobile-overlay"
            onClick={() => setMobileMenuOpen(false)}
          />
          <nav className="nav-mobile-menu">
            <div className="nav-mobile-header-menu">
              <h2>Menu</h2>
              <button
                className="close-btn"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close menu"
              >
                ✕
              </button>
            </div>

            <ul className="nav-mobile-list" style={isTemporaryAccount ? { opacity: 0.5 } : {}}>
              {menuStructure.map((item) => (
                <li key={item.id}>
                  {item.type === 'page' ? (
                    // Direct page link
                    <button
                      className={`nav-mobile-item ${isPageActive(item.pageId) ? 'active' : ''}`}
                      onClick={() => handlePageClick(item.pageId)}
                      style={isTemporaryAccount ? { opacity: 0.6 } : {}}
                    >
                      <span className="nav-icon">{item.icon}</span>
                      <span className="nav-label">{item.label}</span>
                    </button>
                  ) : (
                    // Category with submenu
                    <>
                      <button
                        className="nav-mobile-item nav-mobile-category"
                        onClick={() => setExpandedSubmenu(expandedSubmenu === item.id ? null : item.id)}
                      >
                        <span className="nav-icon">{item.icon}</span>
                        <span className="nav-label">{item.label}</span>
                        <span className="nav-arrow">{expandedSubmenu === item.id ? '▼' : '▶'}</span>
                      </button>
                      {expandedSubmenu === item.id && (
                        <ul className="nav-mobile-submenu">
                          {item.submenu.map((subitem) => (
                            <li key={subitem.id}>
                              <button
                                className={`nav-mobile-subitem ${isPageActive(subitem.pageId) ? 'active' : ''}`}
                                onClick={() => handlePageClick(subitem.pageId)}
                                style={isTemporaryAccount ? { opacity: 0.6 } : {}}
                              >
                                <span className="nav-icon">{subitem.icon}</span>
                                <span className="nav-label">{subitem.label}</span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </>
                  )}
                </li>
              ))}
            </ul>

            {/* Mobile Logout Button */}
            <button
              className="nav-mobile-logout-btn"
              onClick={() => {
                setMobileMenuOpen(false);
                setExpandedSubmenu(null);
                onLogout && onLogout();
              }}
              aria-label="Log out"
            >
              🚪 Log Out
            </button>
          </nav>
        </>
      )}
    </>
  );
}
