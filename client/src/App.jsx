import React, { useState, useEffect } from "react";
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
import { Landing } from './components/Landing';
import ReactMarkdown from 'react-markdown';

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
    useTokenRefresh();
    
    const auth = useAuth();
    const chat = useChat(auth.authUserId, auth.token, auth.isAuthenticated, auth.authUserId);
    const personalInfo = usePersonalInfo(auth.authUserId, auth.token);
    
    // Modal state
    const [menuOpen, setMenuOpen] = useState(false);
    const [showPersonalInfoModal, setShowPersonalInfoModal] = useState(false);
    const [showMySignModal, setShowMySignModal] = useState(false);
    const [showMoonPhaseModal, setShowMoonPhaseModal] = useState(false);
    const [showHoroscopeModal, setShowHoroscopeModal] = useState(false);
    const [showCosmicWeatherModal, setShowCosmicWeatherModal] = useState(false);
    const [showSecurityModal, setShowSecurityModal] = useState(false);
    const [showAstrologyPrompt, setShowAstrologyPrompt] = useState(false);
    const [showFinalModal, setShowFinalModal] = useState(false);
    const [showRegisterMode, setShowRegisterMode] = useState(false);
    
    // Tracking
    const [greetingShown, setGreetingShown] = useState(false);
    const [firstResponseReceived, setFirstResponseReceived] = useState(false);

    // Show oracle greeting for temp account users
    useEffect(() => {
        if (auth.isTemporaryAccount && !greetingShown && chat.chat.length === 0) {
            chat.setChat([{
                id: 'oracle-greeting',
                content: '✨ Welcome, seeker. I am your oracle. Ask me anything about your destiny, love, career, or future. What calls to your soul today?',
                role: 'assistant'
            }]);
            setGreetingShown(true);
        }
    }, [auth.isTemporaryAccount, greetingShown, chat]);

    // Check for first oracle response and show astrology prompt after 45 seconds
    useEffect(() => {
        if (auth.isTemporaryAccount && !firstResponseReceived && chat.chat.length > 1) {
            const nonGreetingMessages = chat.chat.filter(msg => msg.id !== 'oracle-greeting');
            if (nonGreetingMessages.length >= 2) {
                setFirstResponseReceived(true);
                setTimeout(() => {
                    setShowAstrologyPrompt(true);
                }, 45000);
            }
        }
        }, [auth.isTemporaryAccount, firstResponseReceived, chat.chat]);

    // Reset register mode when user successfully logs in as real account
    useEffect(() => {
        if (auth.isAuthenticated && !auth.isTemporaryAccount) {
            setShowRegisterMode(false);
        }
    }, [auth.isAuthenticated, auth.isTemporaryAccount]);

    const handleTryFree = async () => {
        try {
            await auth.createTemporaryAccount();
        } catch (err) {
            console.error('Failed to create temporary account:', err);
        }
        };

        const handleCreateAccount = () => {
        // Coming from Landing (first-time user), just go directly to Firebase login
        // Landing doesn't have auth, so we go to unauthenticated Login screen
        // This happens naturally when isAuthenticated is false
        setShowRegisterMode(true);
    };

    const handleSignIn = () => {
        // Navigate to login (show login page)
    };

    const handleAstrologyPromptYes = () => {
        setShowAstrologyPrompt(false);
        setShowPersonalInfoModal(true);
    };

    const handleAstrologyPromptNo = () => {
        setShowAstrologyPrompt(false);
        auth.exitApp();
        };

            const handleSetupAccount = () => {
        setShowFinalModal(false);
        // Go directly to Firebase login to create account
        setShowRegisterMode(true);
    };

    const handleExit = async () => {
        setShowFinalModal(false);
        await auth.deleteTemporaryAccount();
    };

    const handlePersonalInfoClose = () => {
        setShowPersonalInfoModal(false);
    };

    const handleReset = () => {
        if (window.confirm('Reset app for testing? This will clear all data and sign you out.')) {
            localStorage.clear();
            window.location.reload();
        }
    };

    if (auth.loading) {
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '100vh',
                backgroundColor: 'rgba(0, 0, 0, 0.9)',
                color: 'white',
                fontSize: '1.2rem'
            }}>
                Loading oracle wisdom...
            </div>
                );
    }

    if (showRegisterMode) {
        return (
            <ErrorBoundary>
                <StarField />
                <Login />
            </ErrorBoundary>
        );
    }

    if (auth.isFirstTime && !auth.isAuthenticated) {
        return (
            <ErrorBoundary>
                <StarField />
                <Landing 
                    onTryFree={handleTryFree}
                    onCreateAccount={handleCreateAccount}
                    onSignIn={handleSignIn}
                />
            </ErrorBoundary>
        );
    }

    if (!auth.isAuthenticated) {
        return (
            <ErrorBoundary>
                <StarField />
                <Login />
            </ErrorBoundary>
        );
    }

    return (
        <ErrorBoundary>
            <StarField />
            
            {/* Final Onboarding Modal - Set Up Account or Exit */}
            {showFinalModal && auth.isTemporaryAccount && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                }}>
                    <div style={{
                        backgroundColor: 'rgba(30, 30, 60, 0.95)',
                        padding: '2rem',
                        borderRadius: '10px',
                        maxWidth: '450px',
                        color: 'white',
                        textAlign: 'center',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
                        border: '1px solid rgba(100, 150, 255, 0.3)'
                    }}>
                        <h2 style={{ marginBottom: '1rem' }}>✨ Complete Your Onboarding</h2>
                        <p style={{ marginBottom: '2rem', lineHeight: '1.6', color: '#d0d0ff', fontSize: '0.95rem' }}>
                            Thank you for exploring with our oracle. To save your readings and continue your spiritual journey, please complete your onboarding.
                        </p>
                        <div style={{
                            display: 'flex',
                            gap: '1rem',
                            flexDirection: 'column'
                        }}>
                            <button
                                onClick={handleSetupAccount}
                                style={{
                                    padding: '0.75rem',
                                    borderRadius: '5px',
                                    border: 'none',
                                    backgroundColor: '#7c63d8',
                                    color: 'white',
                                    cursor: 'pointer',
                                    fontWeight: 'bold',
                                    fontSize: '1rem'
                                }}
                            >
                                📝 Set Up an Account
                            </button>
                            <button
                                onClick={handleExit}
                                style={{
                                    padding: '0.75rem',
                                    borderRadius: '5px',
                                    border: '1px solid #999',
                                    backgroundColor: 'transparent',
                                    color: '#999',
                                    cursor: 'pointer',
                                    fontWeight: 'bold',
                                    fontSize: '1rem'
                                }}
                            >
                                ❌ Exit
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Astrology Enhancement Prompt */}
            {showAstrologyPrompt && auth.isTemporaryAccount && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                }}>
                    <div style={{
                        backgroundColor: 'rgba(30, 30, 60, 0.95)',
                        padding: '2rem',
                        borderRadius: '10px',
                        maxWidth: '400px',
                        color: 'white',
                        textAlign: 'center',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
                        border: '1px solid rgba(100, 150, 255, 0.3)'
                    }}>
                        <h2 style={{ marginBottom: '1rem' }}>✨ Enhance Your Reading</h2>
                        <p style={{ marginBottom: '2rem', lineHeight: '1.6', color: '#d0d0ff' }}>
                            As your oracle, I can enhance your reading with astrology. If you would like, please enter your birth date, and optional time and place of birth.
                        </p>
                        <div style={{
                            display: 'flex',
                            gap: '1rem',
                            flexDirection: 'column'
                        }}>
                            <button
                                onClick={handleAstrologyPromptYes}
                                style={{
                                    padding: '0.75rem',
                                    borderRadius: '5px',
                                    border: 'none',
                                    backgroundColor: '#7c63d8',
                                    color: 'white',
                                    cursor: 'pointer',
                                    fontWeight: 'bold'
                                }}
                            >
                                Yes, Enter My Birth Info
                            </button>
                            <button
                                onClick={handleAstrologyPromptNo}
                                style={{
                                    padding: '0.75rem',
                                    borderRadius: '5px',
                                    border: '1px solid #7c63d8',
                                    backgroundColor: 'transparent',
                                    color: '#7c63d8',
                                    cursor: 'pointer',
                                    fontWeight: 'bold'
                                }}
                            >
                                No, Exit
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {showSecurityModal && auth.isAuthenticated && !auth.isTemporaryAccount && (
                <SecurityModal 
                    userId={auth.authUserId}
                    token={auth.token}
                    onClose={() => setShowSecurityModal(false)}
                />
            )}
            
            <>
                <>
                    <PersonalInfoModal 
                        userId={auth.authUserId}
                        token={auth.token}
                        isOpen={showPersonalInfoModal}
                        isTemporaryAccount={auth.isTemporaryAccount}
                        onClose={handlePersonalInfoClose}
                        onSave={() => {
                            personalInfo.fetchPersonalInfo();
                            setTimeout(() => {
                                setShowMySignModal(true);
                            }, 500);
                        }}
                    />
                                        <MySignModal 
                        userId={auth.authUserId}
                        token={auth.token}
                        isOpen={showMySignModal}
                        onClose={() => {
                            setShowMySignModal(false);
                            setShowPersonalInfoModal(false);
                            personalInfo.fetchPersonalInfo();
                            if (auth.isTemporaryAccount) {
                                setTimeout(() => {
                                    setShowFinalModal(true);
                                }, 300);
                            }
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
                </>

                <div style={{ position: "relative" }}>
                    {!auth.isTemporaryAccount && (
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
                    )}

                    <div style={{ maxWidth: 600, margin: "2rem auto", fontFamily: "sans-serif", textAlign: "center", position: "relative", zIndex: 10 }}>
                        {chat.error && <p style={{ color: "red" }}>Error: {chat.error}</p>}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', gap: '1rem' }}>
                            <h2 style={{ textAlign: "center", color: "white", textShadow: "0 2px 4px rgba(0, 0, 0, 0.5)", flex: 1, margin: 0 }}>
                                {auth.isTemporaryAccount ? '🔮 Oracle Chat (Free Trial)' : 'Chatbot Demo'}
                            </h2>
                            <button
                                onClick={handleReset}
                                style={{
                                    padding: '0.5rem 1rem',
                                    fontSize: '0.85rem',
                                    borderRadius: '4px',
                                    border: '1px solid #999',
                                    backgroundColor: 'rgba(100, 100, 100, 0.7)',
                                    color: '#ddd',
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                🔄 Reset (Test)
                            </button>
                            <button onClick={async () => { if(window.confirm('Clear astrology data?')) { try { const r = await fetch(`http://localhost:3000/user-profile/${auth.authUserId}/astrology-cache`, {method:'DELETE', headers:{'Authorization':`Bearer ${auth.token}`}}); const d = await r.json(); alert(d.success ? `Cleared (${d.deletedRows})` : 'Failed'); } catch(e) { alert('Error') } } }} style={{padding:'0.5rem 1rem', fontSize:'0.85rem', borderRadius:'4px', border:'1px solid #999', backgroundColor:'rgba(100,100,0,0.7)', color:'#ffff00', cursor:'pointer', whiteSpace:'nowrap', marginLeft:'0.5rem'}}>
                                🧹 Clear Astro
                            </button>
                        </div>
                        
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
                                boptionrderRadius: "8px",
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
                            {chat.chat.filter(msg => !['horoscope','moon_phase','cosmic_weather','void_of_course','lunar_nodes'].includes(msg.role)).map((msg, index) => {
                                const key = msg.id || `msg-${index}-${Date.now()}`;
                                if (typeof msg.content === 'string') {
                                    try {
                                        const parsed = JSON.parse(msg.content);
                                        return (
                                            <div key={key}>
                                                <ReactMarkdown>{parsed.text || msg.content}</ReactMarkdown>
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
                        
                        <div style={{ opacity: (auth.isTemporaryAccount && showAstrologyPrompt) ? 0.5 : 1, pointerEvents: (auth.isTemporaryAccount && showAstrologyPrompt) ? 'none' : 'auto' }}>
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
                                                                disabled={auth.isTemporaryAccount && firstResponseReceived && !showAstrologyPrompt}
                            />
                            <button 
                                onClick={chat.sendMessage}
                                disabled={auth.isTemporaryAccount && firstResponseReceived && !showAstrologyPrompt}
                            >
                                Send
                            </button>
                        </div>
                    </div>
                </div>
            </>
        </ErrorBoundary>
    );
}

export default App;
