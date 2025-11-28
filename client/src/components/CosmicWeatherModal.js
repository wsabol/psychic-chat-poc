import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
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
                    prompt: data.prompt,
                    birthChart: data.birthChart,
                    currentPlanets: data.currentPlanets,
                    moonPhase: data.moonPhase,
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
                weather: 'The Oracle is reading today\'s cosmic weather patterns. Please wait a moment...',
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
                    prompt: data.prompt,
                    birthChart: data.birthChart,
                    currentPlanets: data.currentPlanets,
                    moonPhase: data.moonPhase,
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

    const planetIcons = {
        'Sun': '☀️',
        'Moon': '🌙',
        'Mercury': '☿️',
        'Venus': '♀',
        'Mars': '♂',
        'Jupiter': '♃',
        'Saturn': '♄'
    };

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
                maxWidth: '750px',
                width: '90%',
                maxHeight: '90vh',
                overflowY: 'auto',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2 style={{ margin: 0 }}>Today's Cosmic Weather</h2>
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

                {loading && <p style={{ textAlign: 'center', color: '#999' }}>Loading cosmic weather...</p>}
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
                            <ReactMarkdown style={{ margin: 0, fontSize: '15px', lineHeight: '1.8', color: '#333' }}>
                                {weatherData.weather}
                            </ReactMarkdown>
                        </div>

                        <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '2px solid #ddd' }}>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                <div style={{ backgroundColor: '#f9f9f9', padding: '1rem', borderRadius: '6px', fontSize: '12px', border: '1px solid #eee' }}>
                                    <p style={{ margin: '0 0 0.75rem 0', fontWeight: 'bold', fontSize: '13px' }}>Natal Birth Chart</p>
                                    <p style={{ margin: 0, color: '#555' }}>☀️ Sun: {weatherData.birthChart?.sunSign} {weatherData.birthChart?.sunDegree}°</p>
                                    <p style={{ margin: '0.25rem 0 0 0', color: '#555' }}>🌙 Moon: {weatherData.birthChart?.moonSign} {weatherData.birthChart?.moonDegree}°</p>
                                    <p style={{ margin: '0.25rem 0 0 0', color: '#555' }}>↗️ Rising: {weatherData.birthChart?.risingSign} {weatherData.birthChart?.risingDegree}°</p>
                                    {weatherData.moonPhase && (
                                        <p style={{ margin: '0.75rem 0 0 0', color: '#666', fontSize: '11px' }}>Phase: {weatherData.moonPhase}</p>
                                    )}
                                </div>

                                {weatherData.currentPlanets && weatherData.currentPlanets.length > 0 && (
                                    <div style={{ backgroundColor: '#f9f9f9', padding: '1rem', borderRadius: '6px', fontSize: '11px', border: '1px solid #eee' }}>
                                        <p style={{ margin: '0 0 0.75rem 0', fontWeight: 'bold', fontSize: '13px' }}>Current Positions</p>
                                        {weatherData.currentPlanets.map((planet, idx) => {
                                            const icon = planetIcons[planet.name] || '●';
                                            const retroText = planet.retrograde ? ' (R)' : '';
                                            return (
                                                <p key={idx} style={{ margin: '0.25rem 0', color: '#555' }}>
                                                    {icon} {planet.name}{retroText}: {planet.sign}
                                                </p>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default CosmicWeatherModal;
