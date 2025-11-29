import React, { useEffect } from 'react';
import StarField from '../components/StarField';
import Menu from '../components/Menu';
import CardDisplay from '../components/CardDisplay';
import ReactMarkdown from 'react-markdown';
import PersonalInfoModal from '../components/PersonalInfoModal';
import MySignModal from '../components/MySignModal';
import MoonPhaseModal from '../components/MoonPhaseModal';
import HoroscopeModal from '../components/HoroscopeModal';
import CosmicWeatherModal from '../components/CosmicWeatherModal';
import SecurityModal from '../components/SecurityModal';
import OnboardingModal from '../modals/OnboardingModal';
import AstrologyPromptModal from '../modals/AstrologyPromptModal';

/**
 * Main authenticated chat screen
 */
export function ChatScreen({
    auth,
    chat,
    personalInfo,
    modals,
    handlers,
    tempFlow,
}) {
    const {
        greetingShown,
        firstResponseReceived,
    } = tempFlow;

    // Show oracle greeting for temp accounts
    useEffect(() => {
        if (auth.isTemporaryAccount && !greetingShown && chat.chat.length === 0) {
            chat.setChat([{
                id: 'oracle-greeting',
                content: '✨ Welcome, seeker. I am your oracle. Ask me anything about your destiny, love, career, or future. What calls to your soul today?',
                role: 'assistant'
            }]);
            tempFlow.setGreetingShown(true);
        }
    }, [auth.isTemporaryAccount, greetingShown, chat, tempFlow]);

    // Check for first response and show astrology prompt
    useEffect(() => {
        if (auth.isTemporaryAccount && !firstResponseReceived && chat.chat.length > 1) {
            const nonGreetingMessages = chat.chat.filter(msg => msg.id !== 'oracle-greeting');
            if (nonGreetingMessages.length >= 2) {
                tempFlow.setFirstResponseReceived(true);
                setTimeout(() => {
                    modals.setShowAstrologyPrompt(true);
                }, 45000);
            }
        }
    }, [auth.isTemporaryAccount, firstResponseReceived, chat.chat, modals, tempFlow]);

    return (
        <div style={{ position: 'relative' }}>
            <StarField />

            {/* Modals */}
            <OnboardingModal
                show={modals.showFinalModal}
                isTemporary={auth.isTemporaryAccount}
                onSetupAccount={handlers.handleSetupAccount}
                onExit={handlers.handleExit}
            />

            <AstrologyPromptModal
                show={modals.showAstrologyPrompt}
                isTemporary={auth.isTemporaryAccount}
                onYes={handlers.handleAstrologyPromptYes}
                onNo={handlers.handleAstrologyPromptNo}
            />

            <PersonalInfoModal
                userId={auth.authUserId}
                token={auth.token}
                isOpen={modals.showPersonalInfoModal}
                isTemporaryAccount={auth.isTemporaryAccount}
                onClose={handlers.handlePersonalInfoClose}
                onSave={() => {
                    personalInfo.fetchPersonalInfo();
                    setTimeout(() => {
                        modals.setShowMySignModal(true);
                    }, 500);
                }}
            />

            <MySignModal
                userId={auth.authUserId}
                token={auth.token}
                isOpen={modals.showMySignModal}
                onClose={() => {
                    modals.setShowMySignModal(false);
                    modals.setShowPersonalInfoModal(false);
                    personalInfo.fetchPersonalInfo();
                    if (auth.isTemporaryAccount) {
                        setTimeout(() => {
                            modals.setShowFinalModal(true);
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
                isOpen={modals.showMoonPhaseModal}
                onClose={() => modals.setShowMoonPhaseModal(false)}
            />

            <HoroscopeModal
                userId={auth.authUserId}
                token={auth.token}
                isOpen={modals.showHoroscopeModal}
                onClose={() => modals.setShowHoroscopeModal(false)}
            />

            <CosmicWeatherModal
                userId={auth.authUserId}
                token={auth.token}
                isOpen={modals.showCosmicWeatherModal}
                onClose={() => modals.setShowCosmicWeatherModal(false)}
            />

            {modals.showSecurityModal && auth.isAuthenticated && !auth.isTemporaryAccount && (
                <SecurityModal
                    userId={auth.authUserId}
                    token={auth.token}
                    onClose={() => modals.setShowSecurityModal(false)}
                />
            )}

            {/* Menu */}
            {!auth.isTemporaryAccount && (
                <Menu
                    menuOpen={modals.menuOpen}
                    setMenuOpen={modals.setMenuOpen}
                    isAuthenticated={auth.isAuthenticated}
                    onPersonalInfoClick={() => modals.setShowPersonalInfoModal(true)}
                    onMySignClick={() => modals.setShowMySignModal(true)}
                    onMoonPhaseClick={() => modals.setShowMoonPhaseModal(true)}
                    onHoroscopeClick={() => modals.setShowHoroscopeModal(true)}
                    onCosmicWeatherClick={() => modals.setShowCosmicWeatherModal(true)}
                    onSecurityClick={() => modals.setShowSecurityModal(true)}
                    onLogoutClick={auth.handleLogout}
                />
            )}

            {/* Chat Area */}
            <div style={{ maxWidth: 600, margin: "2rem auto", fontFamily: "sans-serif", textAlign: "center", position: "relative", zIndex: 10 }}>
                {chat.error && <p style={{ color: "red" }}>Error: {chat.error}</p>}

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', gap: '1rem' }}>
                    <h2 style={{ textAlign: "center", color: "white", textShadow: "0 2px 4px rgba(0, 0, 0, 0.5)", flex: 1, margin: 0 }}>
                        {auth.isTemporaryAccount ? '🔮 Oracle Chat (Free Trial)' : 'Chatbot Demo'}
                    </h2>
                    <button
                        onClick={handlers.handleReset}
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

                <div style={{ opacity: (auth.isTemporaryAccount && modals.showAstrologyPrompt) ? 0.5 : 1, pointerEvents: (auth.isTemporaryAccount && modals.showAstrologyPrompt) ? 'none' : 'auto' }}>
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
                        disabled={auth.isTemporaryAccount && firstResponseReceived && !modals.showAstrologyPrompt}
                    />
                    <button
                        onClick={chat.sendMessage}
                        disabled={auth.isTemporaryAccount && firstResponseReceived && !modals.showAstrologyPrompt}
                    >
                        Send
                    </button>
                </div>
            </div>
        </div>
    );
}
