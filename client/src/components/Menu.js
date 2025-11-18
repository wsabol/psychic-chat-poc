import React, { useEffect, useRef, useState } from 'react';

function Menu({ menuOpen, setMenuOpen, onPersonalInfoClick, onAstrologyClick }) {
    const menuRef = useRef(null);
    const [expandedSubmenu, setExpandedSubmenu] = useState(null);

    useEffect(() => {
        function handleClickOutside(event) {
            // Close menu if clicking outside of menu
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

    return (
        <div ref={menuRef} style={{ position: "absolute", top: 20, left: 20, zIndex: 1000 }}>
            <button
                onClick={() => setMenuOpen(!menuOpen)}
                style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "28px",
                    padding: "0",
                    color: "white",
                    textShadow: "0 2px 4px rgba(0, 0, 0, 0.5)",
                }}
                title="Menu"
            >
                ☰
            </button>
            {menuOpen && (
                <div
                    style={{
                        position: "absolute",
                        top: 40,
                        left: 0,
                        background: "white",
                        border: "1px solid #ccc",
                        borderRadius: "8px",
                        boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
                        minWidth: "200px",
                        zIndex: 1001,
                    }}
                >
                    <button
                        onClick={() =>
                            handleMenuItemClick(() => {
                                alert("Log In clicked");
                            })
                        }
                        style={{
                            display: "block",
                            width: "100%",
                            padding: "12px 16px",
                            border: "none",
                            background: "none",
                            textAlign: "left",
                            cursor: "pointer",
                            fontSize: "14px",
                            borderBottom: "1px solid #eee",
                        }}
                    >
                        Log In
                    </button>

                    {/* My Account with Submenu */}
                    <div>
                        <button
                            onClick={() => toggleSubmenu("account")}
                            style={{
                                display: "block",
                                width: "100%",
                                padding: "12px 16px",
                                border: "none",
                                background: "none",
                                textAlign: "left",
                                cursor: "pointer",
                                fontSize: "14px",
                                borderBottom: "1px solid #eee",
                            }}
                        >
                            My Account {expandedSubmenu === "account" ? "▼" : "▶"}
                        </button>
                        {expandedSubmenu === "account" && (
                            <div style={{ background: "#f9f9f9" }}>
                                <button
                                    onClick={() =>
                                        handleMenuItemClick(() => {
                                            alert("Security clicked");
                                        })
                                    }
                                    style={{
                                        display: "block",
                                        width: "100%",
                                        padding: "10px 32px",
                                        border: "none",
                                        background: "none",
                                        textAlign: "left",
                                        cursor: "pointer",
                                        fontSize: "13px",
                                        borderBottom: "1px solid #eee",
                                    }}
                                >
                                    Security
                                </button>
                                <button
                                    onClick={() =>
                                        handleMenuItemClick(() => {
                                            onPersonalInfoClick && onPersonalInfoClick();
                                        })
                                    }
                                    style={{
                                        display: "block",
                                        width: "100%",
                                        padding: "10px 32px",
                                        border: "none",
                                        background: "none",
                                        textAlign: "left",
                                        cursor: "pointer",
                                        fontSize: "13px",
                                        borderBottom: "1px solid #eee",
                                    }}
                                >
                                    Personal Information
                                </button>
                                <button
                                    onClick={() =>
                                        handleMenuItemClick(() => {
                                            onAstrologyClick && onAstrologyClick();
                                        })
                                    }
                                    style={{
                                        display: "block",
                                        width: "100%",
                                        padding: "10px 32px",
                                        border: "none",
                                        background: "none",
                                        textAlign: "left",
                                        cursor: "pointer",
                                        fontSize: "13px",
                                        borderBottom: "1px solid #eee",
                                    }}
                                >
                                    Astrology
                                </button>
                                <button
                                    onClick={() =>
                                        handleMenuItemClick(() => {
                                            alert("Subscriptions clicked");
                                        })
                                    }
                                    style={{
                                        display: "block",
                                        width: "100%",
                                        padding: "10px 32px",
                                        border: "none",
                                        background: "none",
                                        textAlign: "left",
                                        cursor: "pointer",
                                        fontSize: "13px",
                                    }}
                                >
                                    Subscriptions
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Billing & Payments with Submenu */}
                    <div>
                        <button
                            onClick={() => toggleSubmenu("billing")}
                            style={{
                                display: "block",
                                width: "100%",
                                padding: "12px 16px",
                                border: "none",
                                background: "none",
                                textAlign: "left",
                                cursor: "pointer",
                                fontSize: "14px",
                                borderBottom: "1px solid #eee",
                            }}
                        >
                            Billing & Payments {expandedSubmenu === "billing" ? "▼" : "▶"}
                        </button>
                        {expandedSubmenu === "billing" && (
                            <div style={{ background: "#f9f9f9" }}>
                                <button
                                    onClick={() =>
                                        handleMenuItemClick(() => {
                                            alert("Manage Payment Methods clicked");
                                        })
                                    }
                                    style={{
                                        display: "block",
                                        width: "100%",
                                        padding: "10px 32px",
                                        border: "none",
                                        background: "none",
                                        textAlign: "left",
                                        cursor: "pointer",
                                        fontSize: "13px",
                                        borderBottom: "1px solid #eee",
                                    }}
                                >
                                    Manage Payment Methods
                                </button>
                                <button
                                    onClick={() =>
                                        handleMenuItemClick(() => {
                                            alert("Payments Info clicked");
                                        })
                                    }
                                    style={{
                                        display: "block",
                                        width: "100%",
                                        padding: "10px 32px",
                                        border: "none",
                                        background: "none",
                                        textAlign: "left",
                                        cursor: "pointer",
                                        fontSize: "13px",
                                        borderBottom: "1px solid #eee",
                                    }}
                                >
                                    Payments Info
                                </button>
                                <button
                                    onClick={() =>
                                        handleMenuItemClick(() => {
                                            alert("Current Bill clicked");
                                        })
                                    }
                                    style={{
                                        display: "block",
                                        width: "100%",
                                        padding: "10px 32px",
                                        border: "none",
                                        background: "none",
                                        textAlign: "left",
                                        cursor: "pointer",
                                        fontSize: "13px",
                                    }}
                                >
                                    Current Bill
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default Menu;
