import React, { useState } from "react";
import { useAuth } from "./hooks/useAuth";
import { useChat } from "./hooks/useChat";
import { useTokenRefresh } from "./hooks/useTokenRefresh";
import { usePersonalInfo } from "./hooks/usePersonalInfo";
import CardDisplay from "./components/CardDisplay";
import Menu from "./components/Menu";
import StarField from "./components/StarField";
import PersonalInfoModal from "./components/PersonalInfoModal";
import MySignModal from "./components/MySignModal";
import MoonPhaseModal from "./components/MoonPhaseModal";
import HoroscopeModal from "./components/HoroscopeModal";
import CosmicWeatherModal from "./components/CosmicWeatherModal";

import SecurityModal from "./components/SecurityModal";
import "./styles/AuthModals.css";
import { Login } from './components/Login';

// ErrorBoundary component
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Error in component:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{ textAlign: 'center', color: 'red' }}>
                    <h2>An error occurred.</h2>
                    <p>{this.state.error && this.state.error.message}</p>
                    <p>Please refresh the page or check the console for details.</p>
                </div>
            );
        }
        return this.props.children;
    }
}

function App() {
    // Auto-refresh token to prevent session expiration
    useTokenRefresh();
    
    // Use custom hooks - cleaner and more maintainable
    const auth = useAuth();
    const chat = useChat(auth.authUserId, auth.token, auth.isAuthenticated, auth.authUserId);
    const personalInfo = usePersonalInfo(auth.authUserId, auth.token);
    
    // Modal state only
    const [menuOpen, setMenuOpen] = useState(false);
    const [showPersonalInfoModal, setShowPersonalInfoModal] = useState(false);
    const [showMySignModal, setShowMySignModal] = useState(false);
        const [showMoonPhaseModal, setShowMoonPhaseModal] = useState(false);
    const [showHoroscopeModal, setShowHoroscopeModal] = useState(false);
    const [showCosmicWeatherModal, setShowCosmicWeatherModal] = useState(false);
    const [showSecurityModal, setShowSecurityModal] = useState(false);
    
    return (
        <ErrorBoundary>
            <StarField />
            
            {/* Authentication Modals */}
            {!auth.isAuthenticated && (
                <Login />
            )}
            
                        
            
            {showSecurityModal && auth.isAuthenticated && (
                <SecurityModal 
                    userId={auth.authUserId}
                    token={auth.token}
                    onClose={() => setShowSecurityModal(false)}
                />
            )}
            
            {/* Main Dashboard - Only show if authenticated */}
            {auth.isAuthenticated ? (
                <>
                    <PersonalInfoModal 
                        userId={auth.authUserId}
                        token={auth.token}
                        isOpen={showPersonalInfoModal}
                        onClose={() => setShowPersonalInfoModal(false)}
                        onSave={() => personalInfo.fetchPersonalInfo()}
                    />
                    <MySignModal 
                        userId={auth.authUserId}
                        token={auth.token}
                        isOpen={showMySignModal}
                        onClose={() => {
                            setShowMySignModal(false);
                            personalInfo.fetchPersonalInfo();
                        }}
                        birthDate={personalInfo.birthDate}
                        birthTime={personalInfo.birthTime}
                        birthCity={personalInfo.birthCity}
                        birthState={personalInfo.birthState}
                    />
                    <MoonPhaseModal 
                        userId={auth.authUserId}
                        token={auth.token}
                        isOpen={showMoonPhaseModal}
                        onClose={() => setShowMoonPhaseModal(false)}
                    />
                                        <HoroscopeModal 
                        userId={auth.authUserId}
                        token={auth.token}
                        isOpen={showHoroscopeModal}
                        onClose={() => setShowHoroscopeModal(false)}
                    />
                    <CosmicWeatherModal 
                        userId={auth.authUserId}
                        token={auth.token}
                        isOpen={showCosmicWeatherModal}
                        onClose={() => setShowCosmicWeatherModal(false)}
                    />
                    <div style={{ position: "relative" }}>
                        <Menu 
                            menuOpen={menuOpen} 
                            setMenuOpen={setMenuOpen}
                            isAuthenticated={auth.isAuthenticated}
                            onPersonalInfoClick={() => setShowPersonalInfoModal(true)}
                                                        onMySignClick={() => setShowMySignModal(true)}
                            onMoonPhaseClick={() => setShowMoonPhaseModal(true)}
                            onHoroscopeClick={() => setShowHoroscopeModal(true)}
                            onCosmicWeatherClick={() => setShowCosmicWeatherModal(true)}
                            onSecurityClick={() => setShowSecurityModal(true)}
                            onLogoutClick={auth.handleLogout}
                        />
                        <div style={{ maxWidth: 600, margin: "2rem auto", fontFamily: "sans-serif", textAlign: "center", position: "relative", zIndex: 10 }}>
                            {chat.error && <p style={{ color: "red" }}>Error: {chat.error}</p>}
                            <h2 style={{ textAlign: "center", color: "white", textShadow: "0 2px 4px rgba(0, 0, 0, 0.5)" }}>Chatbot Demo</h2>
                            <div>
                                <label style={{ color: "white", textShadow: "0 2px 4px rgba(0, 0, 0, 0.5)" }}>User ID: </label>
                                <input
                                    value={auth.authEmail || auth.authUserId}
                                    readOnly
                                    style={{ marginBottom: "1rem", marginLeft: "0.5rem", padding: "0.5rem" }}
                                />
                            </div>
                            <div
                                style={{
                                    border: "1px solid #ccc",
                                    borderRadius: "8px",
                                    padding: "1rem",
                                    height: "400px",
                                    overflowY: "auto",
                                    marginBottom: "1rem",
                                    background: "rgba(255, 255, 255, 0.95)",
                                    textAlign: "left",
                                    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
                                    position: "relative",
                                    zIndex: 1,
                                }}
                            >
                                {chat.chat.map((msg, index) => {
                                    const key = msg.id || `msg-${index}-${Date.now()}`;
                                    if (typeof msg.content === 'string') {
                                        try {
                                            const parsed = JSON.parse(msg.content);
                                            return (
                                                <div key={key}>
                                                    <p>{parsed.text || msg.content}</p>
                                                    {parsed.cards && parsed.cards.length > 0 && <CardDisplay cards={parsed.cards} />}
                                                </div>
                                            );
                                        } catch (e) {
                                            return <div key={key}><p>{msg.content}</p></div>;
                                        }
                                    } else {
                                        return <div key={key}><p>{msg.content}</p></div>;
                                    }
                                })}
                            </div>
                            <div>
                                <input
                                    value={chat.message}
                                    onChange={(e) => chat.setMessage(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.code === 'Enter') {
                                            e.preventDefault();
                                            chat.sendMessage();
                                        }
                                    }}
                                    placeholder="Type a message..."
                                    style={{ width: "70%", marginRight: "0.5rem" }}
                                />
                                <button onClick={chat.sendMessage}>Send</button>
                            </div>
                        </div>
                    </div>
                </>
            ) : null}
        </ErrorBoundary>
    );
}

export default App;