import { useState } from 'react';
import './Navigation.css';

export default function Navigation({ pages, currentPageIndex, onNavigate, isVisible }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedSubmenu, setExpandedSubmenu] = useState(null);

  const handlePageClick = (pageId) => {
    const index = pages.findIndex(p => p.id === pageId);
    if (index !== -1) {
      onNavigate(index);
      setMobileMenuOpen(false);
      setExpandedSubmenu(null);
    }
  };

  const toggleSubmenu = (submenuName) => {
    setExpandedSubmenu(expandedSubmenu === submenuName ? null : submenuName);
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
        { id: 'billing', label: 'Billing', icon: '💳', pageId: 'billing' },
      ],
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

  const getPageIcon = (pageId) => {
    const icons = {
      chat: '💬',
      personal: '👤',
      sign: '♈',
      moon: '🌙',
      horoscope: '🔮',
      cosmic: '🌌',
      security: '🔒',
      billing: '💳',
    };
    return icons[pageId] || '✨';
  };

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

        <ul className="nav-menu">
          {menuStructure.map((item) => (
            <li key={item.id}>
              {item.type === 'page' ? (
                // Direct page link
                <button
                  className={`nav-item ${isPageActive(item.pageId) ? 'active' : ''}`}
                  onClick={() => handlePageClick(item.pageId)}
                >
                  <span className="nav-icon">{item.icon}</span>
                  <span className="nav-label">{item.label}</span>
                </button>
              ) : (
                // Category with submenu
                <>
                  <button
                    className="nav-item nav-category"
                    onClick={() => toggleSubmenu(item.id)}
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

            <ul className="nav-mobile-list">
              {menuStructure.map((item) => (
                <li key={item.id}>
                  {item.type === 'page' ? (
                    // Direct page link
                    <button
                      className={`nav-mobile-item ${isPageActive(item.pageId) ? 'active' : ''}`}
                      onClick={() => handlePageClick(item.pageId)}
                    >
                      <span className="nav-icon">{item.icon}</span>
                      <span className="nav-label">{item.label}</span>
                    </button>
                  ) : (
                    // Category with submenu
                    <>
                      <button
                        className="nav-mobile-item nav-mobile-category"
                        onClick={() => toggleSubmenu(item.id)}
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
          </nav>
        </>
      )}
    </>
  );
}
