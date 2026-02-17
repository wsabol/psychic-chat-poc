import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { fetchWithTokenRefresh } from '../utils/fetchWithTokenRefresh';
import { hashUserIdForUrl } from '../utils/userHashUtils';
import { loadZodiacSignsForLanguage } from '../data/zodiac/index.js';
import { logErrorFromCatch } from '../shared/errorLogger.js';

function AstrologyModal({ userId, token, isOpen, onClose, birthDate, birthTime, birthCity, birthState }) {
    const [astroData, setAstroData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [zodiacSigns, setZodiacSigns] = useState(null);

    const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3000";
    
    // Load zodiac signs for current language (default to en-US)
    useEffect(() => {
        const loadZodiacData = async () => {
            try {
                const signs = await loadZodiacSignsForLanguage('en-US');
                setZodiacSigns(signs);
            } catch (err) {
                logErrorFromCatch('Failed to load zodiac signs:', err);
            }
        };
        loadZodiacData();
    }, []);

    useEffect(() => {
        if (isOpen) {
            loadAndStoreAstrologyData();
        }
    }, [isOpen, userId, token]);

    const loadAndStoreAstrologyData = async () => {
        setLoading(true);
        setError(null);
        try {
            const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
            
            // Fetch calculated astrology data from database
            try {
                const hashedUserId = await hashUserIdForUrl(userId);
                const astroResponse = await fetchWithTokenRefresh(`${API_URL}/astrology/${hashedUserId}`, { headers });
                if (astroResponse.ok) {
                    const dbAstroData = await astroResponse.json();
                    
                    let astroDataObj = dbAstroData.astrology_data;
                    if (typeof astroDataObj === 'string') {
                        astroDataObj = JSON.parse(astroDataObj);
                    }
                    
                    if (astroDataObj && astroDataObj.sun_sign) {
                        // Get zodiac sign data from dynamically loaded zodiac signs
                        const sunSignKey = astroDataObj.sun_sign?.toLowerCase();
                        const zodiacSignData = zodiacSigns && zodiacSigns[sunSignKey] ? zodiacSigns[sunSignKey] : null;
                        const mergedData = zodiacSignData ? {
                            ...zodiacSignData,
                            ...astroDataObj
                        } : astroDataObj;
                        setAstroData({
                            ...dbAstroData,
                            astrology_data: mergedData
                        });
                        setLoading(false);
                        return;
                    } else {
                        // Retry after 3 seconds
                        setTimeout(() => loadAndStoreAstrologyData(), 3000);
                        return;
                    }
                }
            } catch (e) {
            }
            
            // Fallback to local zodiac data
            let birthDateToUse = birthDate;
            
            if (!birthDateToUse) {
                const personalInfoResponse = await fetchWithTokenRefresh(`${API_URL}/user-profile/${userId}`, { headers });
                
                if (!personalInfoResponse.ok) {
                    setError('Could not find your personal information. Please enter your birth date first.');
                    setAstroData(null);
                    setLoading(false);
                    return;
                }
                
                const personalInfo = await personalInfoResponse.json();
                
                if (!personalInfo.birth_date) {
                    setError('No birth date found. Please enter your birth date in Personal Information first.');
                    setAstroData(null);
                    setLoading(false);
                    return;
                }
                
                birthDateToUse = personalInfo.birth_date;
            }
            
            const zodiacSign = getZodiacSignFromDate(birthDateToUse);
            if (!zodiacSign) {
                setError('Invalid birth date. Please check your Personal Information.');
                setAstroData(null);
                setLoading(false);
                return;
            }
            
            // Get astrology data from dynamically loaded zodiac signs
            if (!zodiacSigns) {
                setError('Astrology data not loaded. Please refresh the page.');
                setAstroData(null);
                setLoading(false);
                return;
            }

            const astrologyData = zodiacSigns[zodiacSign];
            if (!astrologyData) {
                setError('Could not retrieve astrology data for your sign.');
                setAstroData(null);
                setLoading(false);
                return;
            }
            
            setAstroData({
                zodiac_sign: zodiacSign,
                astrology_data: astrologyData
            });
            
        } catch (err) {
            logErrorFromCatch('Error loading astrology data:', err);
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
                maxWidth: '700px',
                width: '90%',
                maxHeight: '90vh',
                overflowY: 'auto',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2 style={{ margin: 0 }}>Your Astrological Profile</h2>
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

                {loading && <p>Loading your astrological data...</p>}
                {error && <p style={{ color: '#d32f2f', marginBottom: '1rem' }}>⚠️ {error}</p>}

                {astroData && astroData.astrology_data && (
                    <div style={{ fontSize: '14px', lineHeight: '1.6', color: '#333' }}>
                        <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#f0f4ff', borderRadius: '8px', borderLeft: '4px solid #4a90e2' }}>
                            <p style={{ margin: '0 0 0.5rem 0', fontSize: '13px', color: '#333' }}>
                                <strong>📝 About Your Astrology:</strong> Your birth chart has been calculated using Swiss Ephemeris based on your birth date, time, and location. These precise astronomical calculations show your Sun, Moon, and Rising signs.
                            </p>
                        </div>

                        {/* CALCULATED SIGNS */}
                        {astroData.astrology_data.sun_sign && (
                            <div style={{ marginBottom: '1.5rem', padding: '1rem', borderRadius: '8px', border: '2px solid #ffc107' }}>
                                <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>🔯 Your Birth Chart</h3>
                                
                                <div style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#fff9e6', borderRadius: '6px', borderLeft: '3px solid #ffc107' }}>
                                    <p style={{ margin: 0 }}><strong>☀️ Sun Sign:</strong> {astroData.astrology_data.sun_sign} {astroData.astrology_data.sun_degree}°</p>
                                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '12px', color: '#666' }}>Your core identity, ego, and fundamental essence</p>
                                </div>

                                {astroData.astrology_data.rising_sign && (
                                    <div style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#f0f7ff', borderRadius: '6px', borderLeft: '3px solid #2196f3' }}>
                                        <p style={{ margin: 0 }}><strong>↗️ Rising Sign (Ascendant):</strong> {astroData.astrology_data.rising_sign} {astroData.astrology_data.rising_degree}°</p>
                                        <p style={{ margin: '0.25rem 0 0 0', fontSize: '12px', color: '#666' }}>How others perceive you; your outward personality and first impression</p>
                                    </div>
                                )}

                                {astroData.astrology_data.moon_sign && (
                                    <div style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#f3e5f5', borderRadius: '6px', borderLeft: '3px solid #9c27b0' }}>
                                        <p style={{ margin: 0 }}><strong>🌙 Moon Sign:</strong> {astroData.astrology_data.moon_sign} {astroData.astrology_data.moon_degree}°</p>
                                        <p style={{ margin: '0.25rem 0 0 0', fontSize: '12px', color: '#666' }}>Your inner emotional world, subconscious needs, and private self</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ZODIAC SIGN INFO (if no calculated data yet) */}
                        {!astroData.astrology_data.sun_sign && astroData.astrology_data.name && (
                            <div style={{ marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid #eee' }}>
                                <h3 style={{ marginTop: 0, color: '#1a1a1a' }}>
                                    {astroData.astrology_data.emoji} {astroData.astrology_data.name}
                                    <span style={{ fontSize: '12px', color: '#666', marginLeft: '0.5rem' }}>
                                        {astroData.astrology_data.symbol}
                                    </span>
                                </h3>

                                <p><strong>Dates:</strong> {astroData.astrology_data.dates}</p>
                                <p><strong>Element:</strong> {astroData.astrology_data.element}</p>
                                <p><strong>Ruling Planet:</strong> {astroData.astrology_data.rulingPlanet}</p>
                            </div>
                        )}

                        {/* PERSONALITY & OTHER DATA */}
                        {astroData.astrology_data.personality && (
                            <div style={{ marginBottom: '1.5rem' }}>
                                <h4>Personality Essence</h4>
                                <p style={{ fontStyle: 'italic', color: '#555' }}>{astroData.astrology_data.personality}</p>
                            </div>
                        )}

                        {astroData.astrology_data.lifePath && (
                            <div style={{ marginBottom: '1.5rem' }}>
                                <h4>Life Path</h4>
                                <p>{astroData.astrology_data.lifePath}</p>
                            </div>
                        )}

                        {astroData.astrology_data.strengths && (
                            <div style={{ marginBottom: '1.5rem' }}>
                                <h4>Strengths</h4>
                                <ul style={{ marginTop: '0.5rem' }}>
                                    {astroData.astrology_data.strengths.map((strength, idx) => (
                                        <li key={idx}>{strength}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {astroData.astrology_data.weaknesses && (
                            <div style={{ marginBottom: '1.5rem' }}>
                                <h4>Challenges to Balance</h4>
                                <ul style={{ marginTop: '0.5rem' }}>
                                    {astroData.astrology_data.weaknesses.map((weakness, idx) => (
                                        <li key={idx}>{weakness}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {astroData.astrology_data.luckyElements && (
                            <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
                                <h4 style={{ marginTop: 0 }}>Lucky Elements</h4>
                                {astroData.astrology_data.luckyElements.numbers && (
                                    <p><strong>Numbers:</strong> {astroData.astrology_data.luckyElements.numbers.join(', ')}</p>
                                )}
                                {astroData.astrology_data.luckyElements.colors && (
                                    <p><strong>Colors:</strong> {astroData.astrology_data.luckyElements.colors.join(', ')}</p>
                                )}
                                {astroData.astrology_data.luckyElements.days && (
                                    <p><strong>Days:</strong> {astroData.astrology_data.luckyElements.days.join(', ')}</p>
                                )}
                                {astroData.astrology_data.luckyElements.stones && (
                                    <p><strong>Crystals:</strong> {astroData.astrology_data.luckyElements.stones.join(', ')}</p>
                                )}
                            </div>
                        )}

                        {astroData.astrology_data.compatibility && (
                            <div style={{ marginBottom: '1.5rem' }}>
                                <h4>Compatibility</h4>
                                {astroData.astrology_data.compatibility.mostCompatible && (
                                    <p><strong>Most Compatible:</strong> {astroData.astrology_data.compatibility.mostCompatible.join(', ')}</p>
                                )}
                                {astroData.astrology_data.compatibility.leastCompatible && (
                                    <p><strong>Challenges:</strong> {astroData.astrology_data.compatibility.leastCompatible.join(', ')}</p>
                                )}
                                {astroData.astrology_data.compatibility.description && (
                                    <p style={{ fontStyle: 'italic', color: '#555' }}>{astroData.astrology_data.compatibility.description}</p>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default AstrologyModal;
