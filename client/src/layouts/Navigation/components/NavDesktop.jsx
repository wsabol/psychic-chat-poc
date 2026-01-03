/**
 * NavDesktop - Desktop sidebar navigation
 */
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
  const isPageActive = (pageId) => {
    const index = pages.findIndex(p => p.id === pageId);
    return index === currentPageIndex;
  };

    const handlePageClick = (pageId) => {
    console.log('[NAV-HANDLER] pageId:', pageId, 'isTemporaryAccount:', isTemporaryAccount);
    if (isTemporaryAccount) return;
    const index = pages.findIndex(p => p.id === pageId);
    console.log('[NAV-HANDLER] index:', index);
    if (index !== -1) {
      console.log('[NAV-HANDLER] calling onNavigate');
      onNavigate(index);
    }
  };

  return (
    <nav className="nav-desktop-sidebar">
      <div className="nav-brand">
        <h1>🔮 Oracle</h1>
      </div>

      <ul className="nav-menu" style={isTemporaryAccount ? { opacity: 0.5 } : {}}>
        {menuStructure.map((item) => (
          <li key={item.id}>
            {item.type === 'page' ? (
                                          <button
                className={`nav-item ${isPageActive(item.pageId) ? 'active' : ''}`}
                onClick={() => {
                  console.log('[NAV-CLICK] Clicked:', item.label);
                  handlePageClick(item.pageId);
                }}
                disabled={isTemporaryAccount}
                style={isTemporaryAccount ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
              </button>
            ) : (
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
          onClick={onLogout}
          aria-label="Log out"
        >
          🚪 Log Out
        </button>
        <p className="nav-version">v1.0</p>
      </div>
    </nav>
  );
}
