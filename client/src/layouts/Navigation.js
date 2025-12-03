import { useState } from 'react';
import './Navigation.css';

export default function Navigation({ pages, currentPageIndex, onNavigate, isVisible }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handlePageClick = (index) => {
    onNavigate(index);
    setMobileMenuOpen(false);
  };

  return (
    <>
      {/* Mobile header with hamburger */}
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

      {/* Desktop sidebar - permanent */}
      <nav className="nav-desktop-sidebar">
        <div className="nav-brand">
          <h1>🔮 Oracle</h1>
        </div>

        <ul className="nav-menu">
          {pages.map((page, index) => (
            <li key={page.id}>
              <button
                className={`nav-item ${index === currentPageIndex ? 'active' : ''}`}
                onClick={() => handlePageClick(index)}
              >
                <span className="nav-icon">{getPageIcon(page.id)}</span>
                <span className="nav-label">{page.label}</span>
              </button>
            </li>
          ))}
        </ul>

        <div className="nav-footer">
          <p className="nav-version">v1.0</p>
        </div>
      </nav>

      {/* Mobile overlay menu */}
      {mobileMenuOpen && (
        <div className="nav-mobile-overlay" onClick={() => setMobileMenuOpen(false)}>
          <nav className="nav-mobile-menu" onClick={(e) => e.stopPropagation()}>
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
              {pages.map((page, index) => (
                <li key={page.id}>
                  <button
                    className={`nav-mobile-item ${index === currentPageIndex ? 'active' : ''}`}
                    onClick={() => handlePageClick(index)}
                  >
                    <span className="nav-icon">{getPageIcon(page.id)}</span>
                    <span className="nav-label">{page.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      )}
    </>
  );
}

// Helper function to get icons for each page
function getPageIcon(pageId) {
  const icons = {
    chat: '💬',
    personal: '👤',
    sign: '♈',
    moon: '🌙',
    horoscope: '🔮',
    cosmic: '🌌',
    security: '🔒',
  };
  return icons[pageId] || '✨';
}
