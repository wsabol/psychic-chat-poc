/**
 * NavMobile - Mobile header and menu
 */
import { useTranslation } from '../../../context/TranslationContext';

export function NavMobile({
  pages,
  currentPageIndex,
  onNavigate,
  onLogout,
  isTemporaryAccount,
  menuStructure,
  mobileMenuOpen,
  setMobileMenuOpen,
  expandedSubmenu,
  setExpandedSubmenu
}) {
  const { t } = useTranslation();

  const isPageActive = (pageId) => {
    const index = pages.findIndex(p => p.id === pageId);
    return index === currentPageIndex;
  };

  const handlePageClick = (pageId) => {
    if (isTemporaryAccount) return;
    const index = pages.findIndex(p => p.id === pageId);
    if (index !== -1) {
      onNavigate(index);
      setMobileMenuOpen(false);
      setExpandedSubmenu(null);
    }
  };

  const getLabel = (item) => {
    return t(item.labelKey) || item.label || item.labelKey;
  };

  return (
    <>
      {/* Mobile Header */}
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
        <h1 className="app-title">🔮 {t('menu.title')}</h1>
        <div className="spacer"></div>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <>
          <div
            className="nav-mobile-overlay"
            onClick={() => setMobileMenuOpen(false)}
          />
          <nav className="nav-mobile-menu">
            <div className="nav-mobile-header-menu">
              <h2>{t('menu.title')}</h2>
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
                    <button
                      className={`nav-mobile-item ${isPageActive(item.pageId) ? 'active' : ''}`}
                      onClick={() => handlePageClick(item.pageId)}
                      style={isTemporaryAccount ? { opacity: 0.6 } : {}}
                    >
                      <span className="nav-icon">{item.icon}</span>
                      <span className="nav-label">{getLabel(item)}</span>
                    </button>
                  ) : (
                    <>
                      <button
                        className="nav-mobile-item nav-mobile-category"
                        onClick={() => setExpandedSubmenu(expandedSubmenu === item.id ? null : item.id)}
                      >
                        <span className="nav-icon">{item.icon}</span>
                        <span className="nav-label">{getLabel(item)}</span>
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
                                <span className="nav-label">{getLabel(subitem)}</span>
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
              🚪 {t('menu.logout')}
            </button>
          </nav>
        </>
      )}
    </>
  );
}
