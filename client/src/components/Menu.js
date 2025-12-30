import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from '../context/TranslationContext';

function Menu({ menuOpen, setMenuOpen, isAuthenticated, onPersonalInfoClick, onPreferencesClick, onMySignClick, onMoonPhaseClick, onHoroscopeClick, onCosmicWeatherClick, onSecurityClick, onLogoutClick }) {
    const { t } = useTranslation();
    const menuRef = useRef(null);
    const [expandedSubmenu, setExpandedSubmenu] = useState(null);

    useEffect(() => {
        function handleClickOutside(event) {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setMenuOpen(false);
                setExpandedSubmenu(null);
            }
        }

        if (menuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [menuOpen, setMenuOpen]);

    const handleMenuItemClick = (action) => {
        action();
        setMenuOpen(false);
        setExpandedSubmenu(null);
    };

    const toggleSubmenu = (submenuName) => {
        setExpandedSubmenu(expandedSubmenu === submenuName ? null : submenuName);
    };

    // Styles
    const menuButtonStyle = {
        background: "none",
        border: "none",
        cursor: "pointer",
        fontSize: "28px",
        padding: "0",
        color: "white",
        textShadow: "0 2px 4px rgba(0, 0, 0, 0.5)",
    };

    const menuContainerStyle = {
        position: "absolute",
        top: 40,
        left: 0,
        background: "white",
        border: "1px solid #ccc",
        borderRadius: "8px",
        boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
        minWidth: "200px",
        zIndex: 1001,
    };

    const menuItemStyle = {
        display: "block",
        width: "100%",
        padding: "12px 16px",
        border: "none",
        background: "none",
        textAlign: "left",
        cursor: "pointer",
        fontSize: "14px",
        borderBottom: "1px solid #eee",
    };

    const submenuItemStyle = {
        display: "block",
        width: "100%",
        padding: "10px 32px",
        border: "none",
        background: "none",
        textAlign: "left",
        cursor: "pointer",
        fontSize: "13px",
        borderBottom: "1px solid #eee",
    };

    const submenuContainerStyle = {
        background: "#f9f9f9",
    };

    // Menu Items Configuration
    const accountMenuItems = [
        { label: t('security.title'), onClick: onSecurityClick },
        { label: t('personalInfo.title'), onClick: onPersonalInfoClick },
        { label: t('settings.preferences'), onClick: onPreferencesClick },
        { label: t('subscriptions.title'), onClick: () => alert('Subscriptions clicked') },
    ];

    const billingMenuItems = [
        { label: t('paymentMethods.title'), onClick: () => alert('Manage Payment Methods clicked') },


        { label: t('billing.paymentMethods'), onClick: () => alert('Payments Info clicked') },
        { label: t('invoices.title'), onClick: () => alert('Current Bill clicked') },
    ];

    const astrologyMenuItems = [
        { label: t('mySign.title'), onClick: onMySignClick },
        { label: t('moonPhase.title'), onClick: onMoonPhaseClick },
        { label: t('horoscope.title'), onClick: onHoroscopeClick },
        { label: t('cosmicWeather.title'), onClick: onCosmicWeatherClick },
    ];

    /**
     * MenuItem Component - Renders a single menu item
     */
    const MenuItem = ({ label, onClick, noBorder = false }) => (
        <button
            onClick={() => handleMenuItemClick(onClick || (() => {}))}
            style={{
                ...menuItemStyle,
                borderBottom: noBorder ? 'none' : '1px solid #eee',
            }}
        >
            {label}
        </button>
    );

    /**
     * SubmenuItem Component - Renders a submenu item with padding
     */
    const SubmenuItem = ({ label, onClick, noBorder = false }) => (
        <button
            onClick={() => handleMenuItemClick(onClick || (() => {}))}
            style={{
                ...submenuItemStyle,
                borderBottom: noBorder ? 'none' : '1px solid #eee',
            }}
        >
            {label}
        </button>
    );

    /**
     * SubmenuSection Component - Renders a submenu with header and items
     */
    const SubmenuSection = ({ title, isExpanded, onToggle, items, noBorderOnLast = true }) => (
        <div>
            <button
                onClick={() => onToggle(title)}
                style={menuItemStyle}
            >
                {title} {isExpanded ? "▼" : "▶"}
            </button>
            {isExpanded && (
                <div style={submenuContainerStyle}>
                    {items.map((item, idx) => (
                        <SubmenuItem
                            key={idx}
                            label={item.label}
                            onClick={item.onClick}
                            noBorder={noBorderOnLast && idx === items.length - 1}
                        />
                    ))}
                </div>
            )}
        </div>
    );

    return (
        <div ref={menuRef} style={{ position: "absolute", top: 20, left: 20, zIndex: 1000 }}>
            <button
                onClick={() => setMenuOpen(!menuOpen)}
                style={menuButtonStyle}
                title="Menu"
            >
                ☰
            </button>

            {menuOpen && (
                <div style={menuContainerStyle}>
                    {/* NOT AUTHENTICATED: Show Login Option */}
                    {!isAuthenticated && (

                        <MenuItem label={t('menu.home') || 'Log In / Register'} noBorder={!isAuthenticated} />
                    )}

                    {/* AUTHENTICATED: Show My Account Section */}
                    {isAuthenticated && (
                        <>
                            <SubmenuSection
                                title={t('menu.home') || "My Account"}
                                isExpanded={expandedSubmenu === "account"}
                                onToggle={() => toggleSubmenu("account")}
                                items={accountMenuItems}
                            />

                            {/* Billing & Payments Section */}
                            <SubmenuSection
                                title={t('billing.title') || "Billing & Payments"}
                                isExpanded={expandedSubmenu === "billing"}
                                onToggle={() => toggleSubmenu("billing")}
                                items={billingMenuItems}
                            />
                        </>
                    )}

                    {/* Astrology Section (Always Available) */}
                    <SubmenuSection
                        title={t('astrology.title') || "Astrology"}
                        isExpanded={expandedSubmenu === "astrology"}
                        onToggle={() => toggleSubmenu("astrology")}
                        items={astrologyMenuItems}
                    />

                    {/* AUTHENTICATED: Show Logout */}
                    {isAuthenticated && (
                        <button
                            onClick={() => handleMenuItemClick(() => onLogoutClick && onLogoutClick())}
                            style={{
                                display: "block",
                                width: "100%",
                                padding: "12px 16px",
                                border: "none",
                                background: "none",
                                textAlign: "left",
                                cursor: "pointer",
                                fontSize: "14px",
                                borderTop: "1px solid #eee",
                                color: "#d32f2f",
                                fontWeight: "600",
                            }}
                        >
                            {t('common.logout')}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

export default Menu;
