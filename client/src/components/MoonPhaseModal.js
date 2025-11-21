import React, { useState, useEffect } from 'react';
import { getAstrologyData } from '../utils/astroUtils';

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

                const fetchMoonPhaseFromAPI = async () => {
        try {
            const response = await fetch(`${API_URL}/user-astrology/moon-phase`);
            if (!response.ok) {
                return null;
            }
            const data = await response.json();
            return data.phase;
        } catch (err) {
            console.error('Error fetching moon phase:', err);
            return null;
        }
    };

        const loadMoonPhaseData = async () => {
        setLoading(true);
        setError(null);
        try {
            // Fetch user's astrology data to get sun sign
            const astroHeaders = {};
            if (token) {
                astroHeaders['Authorization'] = `Bearer ${token}`;
            }
            const astroResponse = await fetch(`${API_URL}/user-astrology/${userId}`, { headers: astroHeaders });
            
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

            // Get sun sign (use calculated sun_sign if available, otherwise fetch from profile)
            let sunSign = astroDataObj?.sun_sign;
            
            if (!sunSign) {
                const profileHeaders = {};
                if (token) {
                    profileHeaders['Authorization'] = `Bearer ${token}`;
                }
                const profileResponse = await fetch(`${API_URL}/user-profile/${userId}`, { headers: profileHeaders });
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

            // Get current moon phase from API (Swiss Ephemeris calculation)
            const currentMoonPhase = await fetchMoonPhaseFromAPI();
            if (!currentMoonPhase) {
                setError('Could not calculate current moon phase.');
                setLoading(false);
                return;
            }
            
            // Get zodiac sign data including moon phases
            const zodiacData = getAstrologyData(sunSign.toLowerCase());
            
            if (!zodiacData || !zodiacData.moonPhases) {
                setError('Moon phase data not available for your sign.');
                setLoading(false);
                return;
            }

            // Get the meaning of this moon phase for this sign
            const moonPhaseMeaning = zodiacData.moonPhases[currentMoonPhase];

            setMoonPhaseData({
                sunSign,
                currentMoonPhase,
                moonPhaseMeaning,
                zodiacEmoji: zodiacData.emoji,
                zodiacName: zodiacData.name,
                todayDate: new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
            });

        } catch (err) {
            console.error('Error loading moon phase data:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
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

                {loading && <p>Loading moon phase data...</p>}
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
                            <p style={{ margin: '0 0 0.5rem 0', fontSize: '13px' }}>
                                <strong>For {moonPhaseData.zodiacEmoji} {moonPhaseData.zodiacName}:</strong>
                            </p>
                            <p style={{ margin: 0, fontSize: '13px', color: '#555' }}>
                                {moonPhaseData.moonPhaseMeaning}
                            </p>
                        </div>

                        <div style={{ marginBottom: '1.5rem' }}>
                            <h4 style={{ marginTop: 0, marginBottom: '1rem' }}>Lunar Cycle</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', textAlign: 'center' }}>
                                {moonPhaseOrder.map((phase, idx) => (
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
                            <p style={{ fontSize: '12px', color: '#666', fontStyle: 'italic' }}>
                                💡 The moon completes a full cycle approximately every 29.5 days. Each phase carries unique energy that influences all zodiac signs differently.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default MoonPhaseModal;
