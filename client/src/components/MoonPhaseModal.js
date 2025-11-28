import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { getAstrologyData } from '../utils/astroUtils';
import { fetchWithTokenRefresh } from '../utils/fetchWithTokenRefresh';

function MoonPhaseModal({ userId, token, isOpen, onClose }) {
    const [moonPhaseData, setMoonPhaseData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3000";

    // Moon phase emojis mapping
    const moonPhaseEmojis = {
        newMoon: '🌑',
        waxingCrescent: '🌒',
        firstQuarter: '🌓',
        waxingGibbous: '🌔',
        fullMoon: '🌕',
        waningGibbous: '🌖',
        lastQuarter: '🌗',
        waningCrescent: '🌘'
    };

    // Moon phase order for cycle display
    const moonPhaseOrder = ['newMoon', 'waxingCrescent', 'firstQuarter', 'waxingGibbous', 'fullMoon', 'waningGibbous', 'lastQuarter', 'waningCrescent'];

    useEffect(() => {
        if (isOpen) {
            loadMoonPhaseData();
        }
    }, [isOpen, userId, token]);

    const getCurrentMoonPhase = () => {
        const now = new Date();
        
        // Known new moon date: January 29, 2025
        const knownNewMoonDate = new Date(2025, 0, 29).getTime();
        const currentDate = now.getTime();
        const lunarCycle = 29.53059 * 24 * 60 * 60 * 1000;
        
        const daysIntoPhase = ((currentDate - knownNewMoonDate) % lunarCycle) / (24 * 60 * 60 * 1000);
        const phaseIndex = Math.floor((daysIntoPhase / 29.53059) * 8) % 8;
        
        return moonPhaseOrder[phaseIndex];
    };

    const loadMoonPhaseData = async () => {
        setLoading(true);
        setError(null);
        try {
            const currentMoonPhase = getCurrentMoonPhase();
            const astroHeaders = token ? { 'Authorization': `Bearer ${token}` } : {};
            
            // Fetch user's astrology data
            const astroResponse = await fetchWithTokenRefresh(`${API_URL}/user-astrology/${userId}`, { headers: astroHeaders });
            
            if (!astroResponse.ok) {
                setError('Could not fetch your astrology data. Please ensure your birth information is complete.');
                setLoading(false);
                return;
            }

            const astroDataResponse = await astroResponse.json();
            let astroDataObj = astroDataResponse.astrology_data;
            
            if (typeof astroDataObj === 'string') {
                astroDataObj = JSON.parse(astroDataObj);
            }

            let sunSign = astroDataObj?.sun_sign;
            
            if (!sunSign) {
                const profileHeaders = token ? { 'Authorization': `Bearer ${token}` } : {};
                const profileResponse = await fetchWithTokenRefresh(`${API_URL}/user-profile/${userId}`, { headers: profileHeaders });
                if (profileResponse.ok) {
                    const profile = await profileResponse.json();
                    const { getZodiacSignFromDate } = await import('../utils/astroUtils');
                    if (profile.birth_date) {
                        sunSign = getZodiacSignFromDate(profile.birth_date);
                    }
                }
            }

            if (!sunSign) {
                setError('Could not determine your sun sign. Please enter your birth date first.');
                setLoading(false);
                return;
            }
            
            // Get zodiac data for display
            const zodiacData = getAstrologyData(sunSign.toLowerCase());
            
            // Try to fetch Oracle-generated moon phase commentary
            const commentaryResponse = await fetchWithTokenRefresh(
                `${API_URL}/moon-phase/${userId}?phase=${currentMoonPhase}`,
                { headers: astroHeaders }
            );
            
            if (commentaryResponse.ok) {
                const data = await commentaryResponse.json();
                setMoonPhaseData({
                    currentMoonPhase,
                    moonPhaseMeaning: data.commentary,
                    zodiacEmoji: zodiacData?.emoji || '✨',
                    zodiacName: zodiacData?.name || 'Your Reading',
                    todayDate: new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
                });
                setLoading(false);
            } else {
                // Request generation from Oracle
                const generateResponse = await fetchWithTokenRefresh(`${API_URL}/moon-phase/${userId}`, {
                    method: 'POST',
                    headers: { ...astroHeaders, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ phase: currentMoonPhase })
                });
                
                if (!generateResponse.ok) {
                    throw new Error('Failed to queue moon phase commentary');
                }
                
                // Show generating message
                setMoonPhaseData({
                    currentMoonPhase,
                    moonPhaseMeaning: '✨ The Oracle is generating personalized insight for you based on your birth chart...',
                    zodiacEmoji: zodiacData?.emoji || '✨',
                    zodiacName: zodiacData?.name || 'Your Reading',
                    todayDate: new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
                });
                
                // Poll for commentary with retries
                let pollCount = 0;
                const pollInterval = setInterval(async () => {
                    pollCount++;
                    const found = await pollForCommentary(currentMoonPhase, astroHeaders, zodiacData);
                    if (found || pollCount > 30) clearInterval(pollInterval);
                }, 1000);
                setLoading(false);
            }
            
        } catch (err) {
            setError(err.message);
            setLoading(false);
        }
    };
    
    const pollForCommentary = async (phase, headers, zodiacData) => {
        try {
            const response = await fetchWithTokenRefresh(
                `${API_URL}/moon-phase/${userId}?phase=${phase}`,
                { headers }
            );
            
            if (response.ok) {
                const data = await response.json();
                setMoonPhaseData(prev => (prev ? {
                    ...prev,
                    moonPhaseMeaning: data.commentary
                } : null));
                return true;
            }
        } catch (err) {
            console.warn('Moon phase polling failed:', err);
        }
        return false;
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000
        }}>
            <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '2rem',
                maxWidth: '600px',
                width: '90%',
                maxHeight: '90vh',
                overflowY: 'auto',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2 style={{ margin: 0 }}>🌙 Moon Phase</h2>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            fontSize: '24px',
                            cursor: 'pointer'
                        }}
                    >
                        ✕
                    </button>
                </div>

                {loading && <p style={{ textAlign: 'center', color: '#999' }}>🔮 Loading moon phase insight...</p>}
                {error && <p style={{ color: '#d32f2f', marginBottom: '1rem' }}>⚠️ {error}</p>}

                {moonPhaseData && (
                    <div style={{ fontSize: '14px', lineHeight: '1.6', color: '#333' }}>
                        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                            <p style={{ fontSize: '12px', color: '#666' }}>{moonPhaseData.todayDate}</p>
                            <div style={{ fontSize: '72px', margin: '1rem 0' }}>
                                {moonPhaseEmojis[moonPhaseData.currentMoonPhase]}
                            </div>
                            <h3 style={{ margin: '0.5rem 0', fontSize: '20px' }}>
                                {moonPhaseData.currentMoonPhase.replace(/([A-Z])/g, ' $1').trim()}
                            </h3>
                        </div>

                        <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#f0f4ff', borderRadius: '8px', borderLeft: '4px solid #4a90e2' }}>
                            <ReactMarkdown style={{ margin: 0, fontSize: '13px', color: '#555', lineHeight: '1.7' }}>
                                {moonPhaseData.moonPhaseMeaning}
                            </ReactMarkdown>
                        </div>

                        <div style={{ marginBottom: '1.5rem' }}>
                            <h4 style={{ marginTop: 0, marginBottom: '1rem' }}>Lunar Cycle</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', textAlign: 'center' }}>
                                {moonPhaseOrder.map((phase) => (
                                    <div
                                        key={phase}
                                        style={{
                                            padding: '0.75rem',
                                            borderRadius: '8px',
                                            backgroundColor: phase === moonPhaseData.currentMoonPhase ? '#fff3e0' : '#f5f5f5',
                                            border: phase === moonPhaseData.currentMoonPhase ? '2px solid #ff9800' : '1px solid #e0e0e0',
                                            cursor: 'default'
                                        }}
                                    >
                                        <div style={{ fontSize: '24px' }}>{moonPhaseEmojis[phase]}</div>
                                        <p style={{ margin: '0.25rem 0 0 0', fontSize: '11px', color: '#666' }}>
                                            {phase.replace(/([A-Z])/g, ' $1').trim()}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #eee' }}>
                            <p style={{ fontSize: '12px', color: '#666', fontStyle: 'italic', margin: 0 }}>
                                💡 The moon completes a full cycle approximately every 29.5 days. Each phase carries unique energy that influences all zodiac signs differently based on your personal birth chart.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default MoonPhaseModal;
