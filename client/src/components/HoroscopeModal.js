import React, { useState, useEffect } from 'react';
import { getAstrologyData } from '../utils/astroUtils';
import { fetchWithTokenRefresh } from '../utils/fetchWithTokenRefresh';

function HoroscopeModal({ userId, token, isOpen, onClose }) {
    const [horoscopeData, setHoroscopeData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [horoscopeRange, setHoroscopeRange] = useState('daily'); // 'daily', 'weekly', 'monthly'

    const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3000";

    useEffect(() => {
        if (isOpen) {
            loadHoroscopeData();
        }
    }, [isOpen, userId, horoscopeRange]);

    const loadHoroscopeData = async () => {
        setLoading(true);
        setError(null);
        try {
            // Check localStorage for cached horoscope (cache by date)
            const today = new Date().toISOString().split('T')[0];
            const cacheKey = `horoscope_${userId}_${horoscopeRange}_${today}`;
            const cachedData = localStorage.getItem(cacheKey);
            
                        if (cachedData) {
                setHoroscopeData(JSON.parse(cachedData));
                setLoading(false);
                return;
            }

            // Fetch user's astrology data to get sun sign
            const astroHeaders = {};
            if (token) {
                astroHeaders['Authorization'] = `Bearer ${token}`;
            }
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

            // Get sun sign
            let sunSign = astroDataObj?.sun_sign;
            
            if (!sunSign) {
                const profileHeaders = {};
                if (token) {
                    profileHeaders['Authorization'] = `Bearer ${token}`;
                }
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

            // Get zodiac sign data
            const zodiacData = getAstrologyData(sunSign.toLowerCase());
            
            if (!zodiacData) {
                setError('Horoscope data not available for your sign.');
                setLoading(false);
                return;
            }

            // Generate horoscope message (in a real app, this would come from an API)
            const horoscopeMessage = generateHoroscope(zodiacData, horoscopeRange);

            const horoscopeDataObj = {
                sunSign,
                zodiacEmoji: zodiacData.emoji,
                zodiacName: zodiacData.name,
                horoscopeRange,
                horoscopeMessage,
                rangeDate: new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
            };

            // Cache the horoscope
            localStorage.setItem(cacheKey, JSON.stringify(horoscopeDataObj));
            setHoroscopeData(horoscopeDataObj);

                } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const generateHoroscope = (zodiacData, range) => {
        // Generate a contextual horoscope based on the zodiac sign and range
        // In production, this would fetch from an actual horoscope API
        
        const horoscopes = {
            daily: {
                Aries: "Your dynamic energy is particularly strong today. This is an excellent time to pursue new projects and take calculated risks. Your natural leadership will inspire those around you.",
                Taurus: "Take time today to appreciate the good things in your life. A practical decision made now will pay dividends later. Trust your instincts when it comes to money matters.",
                Gemini: "Your communication skills are heightened today. This is a great time for important conversations and networking. Don't shy away from expressing your ideas and opinions.",
                Cancer: "Focus on home and family matters today. A quiet moment of reflection will bring clarity to a recent situation. Your emotional intuition is particularly strong right now.",
                Leo: "Your creativity is flowing beautifully today. This is an excellent time to showcase your talents and express yourself. Romance and social interactions are particularly favorable.",
                Virgo: "Pay attention to practical details and organization today. A small effort now can bring significant improvements. Your analytical skills are at their peak.",
                Libra: "Financial matters deserve your attention today. A good opportunity may present itself – trust your judgment. Social harmony is within reach with a little effort.",
                Scorpio: "Your personal power is strong today. This is an excellent time to take action on something important to you. Trust your intuition and your ability to manifest your desires.",
                Sagittarius: "A quiet day for reflection and planning is on the horizon. Use this time to recharge and think about your next moves. Meditation or time in nature will be especially beneficial.",
                Capricorn: "Social connections bring joy and opportunity today. Reach out to friends and enjoy collaborative efforts. Your influence and authority are particularly strong.",
                Aquarius: "Professional matters or your public image are highlighted today. This is a good time to advance your career goals. Your unique perspective is valued and appreciated.",
                Pisces: "Adventure and learning call to you today. Expand your horizons through travel, education, or new experiences. Your intuition is a valuable guide – follow it."
            },
            weekly: {
                Aries: "This week brings exciting opportunities for growth and advancement. Your confidence is high, making it an ideal time to pursue goals and meet new people. Mid-week may bring a pleasant surprise.",
                Taurus: "Stability and progress go hand-in-hand this week. Focus on building solid foundations in all areas of your life. Financial matters show promise toward the weekend.",
                Gemini: "Communication takes center stage this week. Important conversations may lead to breakthroughs. Keep your mind open to new ideas and perspectives from others.",
                Cancer: "Home and heart matters come into focus this week. Family connections strengthen, and your emotional awareness deepens. Trust your feelings as a guide.",
                Leo: "This week shines brightly for creativity and self-expression. Share your talents with the world. Romantic connections deepen, and social life flourishes.",
                Virgo: "Organization and attention to detail serve you well this week. Small improvements lead to big results. Health and wellness are particularly favored.",
                Libra: "Social and romantic energies peak this week. Relationships deepen, and new connections form naturally. Enjoy the harmony and balance this period brings.",
                Scorpio: "Focus on foundations – home, family, and security matter most this week. A sense of peace and stability grows. Reflect on what truly matters to you.",
                Sagittarius: "Communication and learning are highlighted this week. Important information comes your way. Short journeys or local activities bring joy and discovery.",
                Capricorn: "Financial opportunities and personal resources come into play this week. Be wise with money, but don't be afraid to invest in yourself. Self-care is important.",
                Aquarius: "This week is about you and your personal goals. Stand up for what you believe in. Your natural magnetism draws positive people and opportunities your way.",
                Pisces: "Reflection and spiritual growth are themes for this week. Behind-the-scenes work pays off. Trust the process and release what no longer serves you."
            },
            monthly: {
                Aries: "This month is full of dynamic energy and opportunity. Major projects can move forward successfully. Focus on leadership and taking initiative. Relationships benefit from honest communication.",
                Taurus: "Stability and growth go hand-in-hand this month. Financial matters improve gradually. Relationships deepen through trust and reliability. Health matters improve with consistent effort.",
                Gemini: "Communication and connection dominate this month. Important conversations and agreements are favored. Travel and learning opportunities present themselves. Social life is active.",
                Cancer: "Family and home take priority this month. Emotional bonds strengthen. A sense of security and belonging grows. Trust your instincts – they're especially reliable now.",
                Leo: "Creativity and self-expression flourish this month. Romantic life sparkles. Social invitations abound. This is an excellent time to showcase your talents and unique qualities.",
                Virgo: "Home and personal matters deserve attention this month. Organization efforts pay off. Health improves through practical lifestyle changes. Relationships become more authentic.",
                Libra: "Communication, learning, and short journeys feature prominently this month. Mental clarity increases. Social connections strengthen. This is a good time for important decisions.",
                Scorpio: "Focus on finances and personal resources this month. Careful planning leads to positive results. Self-worth and self-care become increasingly important. Value your own needs.",
                Sagittarius: "This month highlights your personal power and self-expression. It's time to pursue your goals actively. Confidence is high. New beginnings are very favorable.",
                Capricorn: "Reflection and strategic planning are emphasized this month. Behind-the-scenes work produces valuable results. Trust your instincts. Release old patterns and beliefs.",
                Aquarius: "Social life and friendships are especially highlighted this month. Community and shared goals matter. Networking and collaboration bring opportunities. Enjoy the connections.",
                Pisces: "Career and public image receive attention this month. Professional growth is possible. Your unique talents are recognized and appreciated. Public recognition may come."
            }
        };

        return horoscopes[range][zodiacData.name] || "A time of balance and growth awaits you. Trust in the natural flow of life and your ability to navigate challenges with grace.";
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

                {/* Range selector buttons */}
                <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '0.5rem' }}>
                    {['daily', 'weekly', 'monthly'].map((range) => (
                        <button
                            key={range}
                            onClick={() => setHoroscopeRange(range)}
                            style={{
                                padding: '0.5rem 1rem',
                                borderRadius: '6px',
                                border: horoscopeRange === range ? '2px solid #ff6b9d' : '1px solid #ccc',
                                backgroundColor: horoscopeRange === range ? '#ffe0f0' : '#f5f5f5',
                                cursor: 'pointer',
                                fontSize: '12px',
                                fontWeight: horoscopeRange === range ? 'bold' : 'normal',
                                textTransform: 'capitalize'
                            }}
                        >
                            {range}
                        </button>
                    ))}
                </div>

                {loading && <p>Loading horoscope...</p>}
                {error && <p style={{ color: '#d32f2f', marginBottom: '1rem' }}>⚠️ {error}</p>}

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
                            <p style={{ margin: 0, fontSize: '15px', lineHeight: '1.8', color: '#333' }}>
                                {horoscopeData.horoscopeMessage}
                            </p>
                        </div>

                        <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #eee' }}>
                            <p style={{ fontSize: '12px', color: '#666', fontStyle: 'italic', margin: 0 }}>
                                🔮 Horoscopes are for entertainment and inspiration. Your choices and actions ultimately shape your destiny.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default HoroscopeModal;
