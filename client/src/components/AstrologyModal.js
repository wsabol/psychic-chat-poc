import React, { useState, useEffect } from 'react';
import { getZodiacSignFromDate, getAstrologyData } from '../utils/astroUtils';
import { zodiacSigns } from '../data/ZodiacSigns';

function AstrologyModal({ userId, isOpen, onClose, birthDate, birthTime, birthCity, birthState }) {
    const [astroData, setAstroData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3000";

    useEffect(() => {
        if (isOpen) {
            loadAndStoreAstrologyData();
        }
    }, [isOpen, userId]);

    const loadAndStoreAstrologyData = async () => {
        setLoading(true);
        setError(null);
        try {
            // Use passed birthDate if available, otherwise fetch from personal info
            let birthDateToUse = birthDate;
            
            if (!birthDateToUse) {
                const personalInfoResponse = await fetch(`${API_URL}/user-profile/${userId}`);
                
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

            // Calculate zodiac sign and get astrology data from ZodiacSigns.js
            const zodiacSign = getZodiacSignFromDate(birthDateToUse);
            if (!zodiacSign) {
                setError('Invalid birth date. Please check your Personal Information.');
                setAstroData(null);
                setLoading(false);
                return;
            }

            const astrologyData = getAstrologyData(zodiacSign);
            if (!astrologyData) {
                setError('Could not retrieve astrology data for your sign.');
                setAstroData(null);
                setLoading(false);
                return;
            }

            // IMPORTANT: Do NOT overwrite astrology data in database - just retrieve existing data
            // The worker processor stores rising/moon signs via the Oracle response
            // Overwriting here would destroy that data
            // Instead, fetch the complete astrology data from the database (which includes rising/moon signs)
            try {
                const astroResponse = await fetch(`${API_URL}/astrology/${userId}`);
                if (astroResponse.ok) {
                    const dbAstroData = await astroResponse.json();
                    // Use database data which includes rising/moon signs from Oracle
                    setAstroData(dbAstroData);
                } else {
                    // If no database record yet, use zodiac sign data from ZodiacSigns.js
                    setAstroData({
                        zodiac_sign: zodiacSign,
                        astrology_data: astrologyData
                    });
                }
            } catch (err) {
                console.warn('Could not fetch astrology data from database, using local zodiac data:', err);
                setAstroData({
                    zodiac_sign: zodiacSign,
                    astrology_data: astrologyData
                });
            }
            
        } catch (err) {
            console.error('Error loading astrology data:', err);
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
                            <p style={{ margin: '0', fontSize: '13px', color: '#333' }}>
                                <strong>📝 Note:</strong> This profile shows your <strong>Sun Sign</strong> based on your birth date. Rising signs (Ascendant) and Moon signs require precise birth time and location calculations using professional astrological software. For accurate rising and moon signs, consult a professional astrologer.
                            </p>
                        </div>

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

                        <div style={{ marginBottom: '1.5rem' }}>
                            <h4>Personality Essence</h4>
                            <p style={{ fontStyle: 'italic', color: '#555' }}>{astroData.astrology_data.personality}</p>
                        </div>

                        <div style={{ marginBottom: '1.5rem' }}>
                            <h4>Life Path</h4>
                            <p>{astroData.astrology_data.lifePath}</p>
                        </div>

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

                        {astroData.astrology_data.seasonal && (
                            <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#fafafa', borderRadius: '8px' }}>
                                <h4 style={{ marginTop: 0 }}>Seasonal Influence</h4>
                                <p><strong>Season:</strong> {astroData.astrology_data.seasonal.season}</p>
                                <p><strong>Energy:</strong> {astroData.astrology_data.seasonal.energy}</p>
                                <p><strong>Connection:</strong> {astroData.astrology_data.seasonal.connection}</p>
                            </div>
                        )}

                        {astroData.astrology_data.mythology && (
                            <div style={{ marginBottom: '1.5rem' }}>
                                <h4>Mythology</h4>
                                <p><strong>Archetype:</strong> {astroData.astrology_data.mythology.archetype}</p>
                                <p><strong>Deity:</strong> {astroData.astrology_data.mythology.deity}</p>
                                <p><strong>Story:</strong> {astroData.astrology_data.mythology.story}</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default AstrologyModal;
