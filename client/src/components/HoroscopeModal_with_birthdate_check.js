import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { getAstrologyData } from '../utils/astroUtils';
import { fetchWithTokenRefresh } from '../utils/fetchWithTokenRefresh';

function HoroscopeModal({ userId, token, isOpen, onClose }) {
    const [horoscopeData, setHoroscopeData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [horoscopeRange, setHoroscopeRange] = useState('daily'); // daily or weekly only
    const [hasBirthdate, setHasBirthdate] = useState(false);
    const [needsBirthdate, setNeedsBirthdate] = useState(false);

    const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3000";

    useEffect(() => {
        if (isOpen) {
            // First check if user has birthdate
            checkBirthdateAndLoadHoroscope();
        }
    }, [isOpen, userId, horoscopeRange]);

    const checkBirthdateAndLoadHoroscope = async () => {
        try {
            const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
            
            // Fetch personal info to check for birthdate
            const profileResponse = await fetchWithTokenRefresh(
                `${API_URL}/user-profile/${userId}`,
                { headers }
            );
            
            if (profileResponse.ok) {
                const profileData = await profileResponse.json();
                
                if (!profileData.birth_date) {
                    setNeedsBirthdate(true);
                    setError('Please complete your personal information with your birth date to generate a personalized horoscope.');
                    return;
                }
                
                setHasBirthdate(true);
                setNeedsBirthdate(false);
                loadHoroscopeData();
            } else {
                setError('Could not fetch your profile information');
            }
        } catch (err) {
            console.error('[HOROSCOPE] Error checking birthdate:', err);
            setError('Could not verify your information');
        }
    };

    const loadHoroscopeData = async () => {
        setLoading(true);
        setError(null);
        try {
            const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
            
            // Try to fetch existing horoscope
            const fetchResponse = await fetchWithTokenRefresh(
                `${API_URL}/horoscope/${userId}/${horoscopeRange}`,
                { headers }
            );
            
            if (fetchResponse.ok) {
                const data = await fetchResponse.json();
                const zodiacInfo = await fetchZodiacInfo(headers);
                
                setHoroscopeData({
                    ...zodiacInfo,
                    horoscopeRange,
                    horoscopeMessage: data.horoscope,
                    rangeDate: new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
                });
                setLoading(false);
                return;
            }
            
            // If no cached horoscope, request generation
            const generateResponse = await fetchWithTokenRefresh(
                `${API_URL}/horoscope/${userId}/${horoscopeRange}`,
                { method: 'POST', headers }
            );
            
            if (!generateResponse.ok) {
                const errorData = await generateResponse.json();
                setError(errorData.error || 'Could not generate horoscope');
                setLoading(false);
                return;
            }
            
            // Show generating message and wait for worker to process
            const zodiacInfo = await fetchZodiacInfo(headers);
            setHoroscopeData({
                ...zodiacInfo,
                horoscopeRange,
                horoscopeMessage: '✨ Your personalized horoscope is being crafted by The Oracle. Please wait a moment...',
                rangeDate: new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
            });
            
            // Poll for the generated horoscope with retries
            let pollCount = 0;
            const pollInterval = setInterval(async () => {
                pollCount++;
                const found = await pollForHoroscope(headers, zodiacInfo);
                if (found || pollCount > 30) clearInterval(pollInterval);
            }, 1000);
            
        } catch (err) {
            setError(err.message);
            setLoading(false);
        }
    };

    const fetchZodiacInfo = async (headers) => {
        try {
            const astroResponse = await fetchWithTokenRefresh(
                `${API_URL}/user-astrology/${userId}`,
                { headers }
            );
            
            if (astroResponse.ok) {
                const astroData = await astroResponse.json();
                const zodiacData = getAstrologyData(astroData.zodiac_sign?.toLowerCase());
                
                if (zodiacData) {
                    return {
                        zodiacEmoji: zodiacData.emoji,
                        zodiacName: zodiacData.name
                    };
                }
            }
        } catch (err) {
        }
        
        return {
            zodiacEmoji: '✨',
            zodiacName: 'Your Reading'
        };
    };

    const pollForHoroscope = async (headers, zodiacInfo) => {
        try {
            const retryResponse = await fetchWithTokenRefresh(
                `${API_URL}/horoscope/${userId}/${horoscopeRange}`,
                { headers }
            );
            
            if (retryResponse.ok) {
                const data = await retryResponse.json();
                setHoroscopeData({
                    ...zodiacInfo,
                    horoscopeRange,
                    horoscopeMessage: data.horoscope,
                    rangeDate: new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
                });
                setLoading(false);
                return true;
            }
        } catch (err) {
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
                maxWidth: '700px',
                width: '90%',
                maxHeight: '90vh',
                overflowY: 'auto',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2 style={{ margin: 0 }}>✨ Horoscope</h2>
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

                {/* Birthdate required message */}
                {needsBirthdate && (
                    <div style={{
                        padding: '1.5rem',
                        backgroundColor: '#fff3cd',
                        borderRadius: '8px',
                        borderLeft: '4px solid #ff6b9d',
                        marginBottom: '1rem'
                    }}>
                        <p style={{ margin: '0 0 1rem 0', color: '#333', fontSize: '14px' }}>
                            {error}
                        </p>
                        <button
                            onClick={onClose}
                            style={{
                                padding: '0.5rem 1.5rem',
                                backgroundColor: '#ff6b9d',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontWeight: 'bold'
                            }}
                        >
                            ➜ Update Personal Information
                        </button>
                    </div>
                )}

                {!needsBirthdate && (
                    <>
                        {/* Range selector buttons */}
                        <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '0.5rem' }}>
                            {['daily', 'weekly'].map((range) => (
                                <button
                                    key={range}
                                    onClick={() => setHoroscopeRange(range)}
                                    disabled={loading}
                                    style={{
                                        padding: '0.5rem 1rem',
                                        borderRadius: '6px',
                                        border: horoscopeRange === range ? '2px solid #ff6b9d' : '1px solid #ccc',
                                        backgroundColor: horoscopeRange === range ? '#ffe0f0' : '#f5f5f5',
                                        cursor: loading ? 'not-allowed' : 'pointer',
                                        fontSize: '12px',
                                        fontWeight: horoscopeRange === range ? 'bold' : 'normal',
                                        textTransform: 'capitalize',
                                        opacity: loading ? 0.6 : 1
                                    }}
                                >
                                    {range}
                                </button>
                            ))}
                        </div>

                        {loading && <p style={{ textAlign: 'center', color: '#999' }}>🔮 Loading your horoscope...</p>}
                        {error && !needsBirthdate && <p style={{ color: '#d32f2f', marginBottom: '1rem' }}>⚠️ {error}</p>}

                        {horoscopeData && (
                            <div style={{ fontSize: '14px', lineHeight: '1.6', color: '#333' }}>
                                <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
                                    <p style={{ fontSize: '12px', color: '#666', margin: 0 }}>{horoscopeData.rangeDate}</p>
                                    <h3 style={{ margin: '0.5rem 0', fontSize: '18px' }}>
                                        {horoscopeData.zodiacEmoji} {horoscopeData.zodiacName}
                                    </h3>
                                    <p style={{ fontSize: '11px', color: '#999', margin: 0, textTransform: 'capitalize' }}>
                                        {horoscopeData.horoscopeRange} Reading
                                    </p>
                                </div>

                                <div style={{ marginBottom: '1.5rem', padding: '1.5rem', backgroundColor: '#f8f3ff', borderRadius: '8px', borderLeft: '4px solid #9c27b0' }}>
                                    <ReactMarkdown style={{ margin: 0, fontSize: '15px', lineHeight: '1.8', color: '#333' }}>
                                        {horoscopeData.horoscopeMessage}
                                    </ReactMarkdown>
                                </div>

                                <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #eee' }}>
                                    <p style={{ fontSize: '12px', color: '#666', fontStyle: 'italic', margin: 0 }}>
                                        🔮 Horoscopes are for entertainment and inspiration. Your choices and actions ultimately shape your destiny.
                                    </p>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

export default HoroscopeModal;

