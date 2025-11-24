import React, { useState, useEffect } from 'react';
import { getAstrologyData } from '../utils/astroUtils';
import { fetchWithTokenRefresh } from '../utils/fetchWithTokenRefresh';

function CosmicWeatherModal({ userId, token, isOpen, onClose }) {
    const [weatherData, setWeatherData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3000";

    useEffect(() => {
        if (isOpen) {
            loadCosmicWeather();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, userId, token]);

    const loadCosmicWeather = async () => {
        setLoading(true);
        setError(null);
        try {
            const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
            
            const fetchResponse = await fetchWithTokenRefresh(
                `${API_URL}/astrology-insights/cosmic-weather/${userId}`,
                { headers }
            );
            
            if (fetchResponse.ok) {
                const data = await fetchResponse.json();
                const zodiacInfo = await fetchZodiacInfo(headers);
                
                setWeatherData({
                    ...zodiacInfo,
                    weather: data.weather,
                    transits: data.transits,
                    generated_at: new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
                });
                setLoading(false);
                return;
            }
            
            const generateResponse = await fetchWithTokenRefresh(
                `${API_URL}/astrology-insights/cosmic-weather/${userId}`,
                { method: 'POST', headers }
            );
            
            if (!generateResponse.ok) {
                const errorData = await generateResponse.json();
                setError(errorData.error || 'Could not generate cosmic weather');
                setLoading(false);
                return;
            }
            
            const zodiacInfo = await fetchZodiacInfo(headers);
            setWeatherData({
                ...zodiacInfo,
                weather: '🌍 The Oracle is reading today\'s cosmic weather patterns. Please wait a moment...',
                transits: [],
                generated_at: new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
            });
            
            let pollCount = 0;
            const pollInterval = setInterval(async () => {
                pollCount++;
                const polled = await pollForWeather(headers, zodiacInfo);
                if (polled || pollCount > 30) clearInterval(pollInterval);
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
            console.warn('Failed to fetch zodiac info:', err);
        }
        
        return {
            zodiacEmoji: '🌍',
            zodiacName: 'Cosmic Weather'
        };
    };

    const pollForWeather = async (headers, zodiacInfo) => {
        try {
            const retryResponse = await fetchWithTokenRefresh(
                `${API_URL}/astrology-insights/cosmic-weather/${userId}`,
                { headers }
            );
            
            if (retryResponse.ok) {
                const data = await retryResponse.json();
                setWeatherData({
                    ...zodiacInfo,
                    weather: data.weather,
                    transits: data.transits,
                    generated_at: new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
                });
                setLoading(false);
                return true;
            }
        } catch (err) {
            console.warn('Polling failed:', err);
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
                    <h2 style={{ margin: 0 }}>Today\'s Cosmic Weather</h2>
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

                {loading && <p style={{ textAlign: 'center', color: '#999' }}>🔮 Loading cosmic weather...</p>}
                {error && <p style={{ color: '#d32f2f', marginBottom: '1rem' }}>⚠️ {error}</p>}

                {weatherData && (
                    <div style={{ fontSize: '14px', lineHeight: '1.6', color: '#333' }}>
                        <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
                            <p style={{ fontSize: '12px', color: '#666', margin: 0 }}>{weatherData.generated_at}</p>
                            <h3 style={{ margin: '0.5rem 0', fontSize: '18px' }}>
                                {weatherData.zodiacEmoji} {weatherData.zodiacName}
                            </h3>
                        </div>

                        <div style={{ marginBottom: '1.5rem', padding: '1.5rem', backgroundColor: '#f0f7ff', borderRadius: '8px', borderLeft: '4px solid #2196f3' }}>
                            <p style={{ margin: 0, fontSize: '15px', lineHeight: '1.8', color: '#333' }}>
                                {weatherData.weather}
                            </p>
                        </div>

                        {weatherData.transits && weatherData.transits.length > 0 && (
                            <div style={{ marginBottom: '1.5rem' }}>
                                <h4 style={{ marginTop: 0, marginBottom: '1rem' }}>Current Planetary Positions</h4>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                                    {weatherData.transits.slice(0, 7).map((transit, idx) => (
                                        <div
                                            key={idx}
                                            style={{
                                                padding: '1rem',
                                                backgroundColor: '#fafafa',
                                                borderRadius: '6px',
                                                borderLeft: '3px solid #9c27b0'
                                            }}
                                        >
                                            <p style={{ margin: '0 0 0.5rem 0', fontWeight: 'bold', fontSize: '13px' }}>
                                                {transit.planet}
                                            </p>
                                            <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>
                                                {transit.sign} {transit.degree}°
                                            </p>
                                            {transit.aspects && transit.aspects.length > 0 && (
                                                <p style={{ margin: '0.5rem 0 0 0', fontSize: '11px', color: '#9c27b0', fontStyle: 'italic' }}>
                                                    {transit.aspects[0]}
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #eee' }}>
                            <p style={{ fontSize: '12px', color: '#666', fontStyle: 'italic', margin: 0 }}>
                                🌍 Cosmic Weather shows the current planetary energies affecting your day.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default CosmicWeatherModal;
