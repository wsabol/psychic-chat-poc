/**
 * NavDesktop - Desktop sidebar navigation
 */
import { useTranslation } from '../../../context/TranslationContext';

export function NavDesktop({
  pages,
  currentPageIndex,
  onNavigate,
  onLogout,
  isTemporaryAccount,
  isDisabled = false,
  menuStructure,
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
    }
  };

  const getLabel = (item) => {
    return t(item.labelKey) || item.label || item.labelKey;
  };

  return (
    <nav className="nav-desktop-sidebar">
      <div className="nav-brand">
        <h1>🔮 {t('menu.title')}</h1>
      </div>

      <ul className="nav-menu" style={isTemporaryAccount ? { opacity: 0.5 } : {}}>
        {menuStructure.map((item) => (
          <li key={item.id}>
            {item.type === 'page' ? (
              <button
                className={`nav-item ${isPageActive(item.pageId) ? 'active' : ''}`}
                onClick={() => {
                  handlePageClick(item.pageId);
                }}
                disabled={isTemporaryAccount}
                style={isTemporaryAccount ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{getLabel(item)}</span>
              </button>
            ) : (
              <>
                <button
                  className="nav-item nav-category"
                  onClick={() => setExpandedSubmenu(expandedSubmenu === item.id ? null : item.id)}
                  style={isTemporaryAccount ? { opacity: 0.6 } : {}}
                >
                  <span className="nav-icon">{item.icon}</span>
                  <span className="nav-label">{getLabel(item)}</span>
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

      <div className="nav-footer">
        <button
          className="nav-logout-btn"
          onClick={onLogout}
          aria-label="Log out"
        >
          🚪 {t('menu.logout')}
        </button>
        <p className="nav-version">v1.0</p>
      </div>
    </nav>
  );
}

