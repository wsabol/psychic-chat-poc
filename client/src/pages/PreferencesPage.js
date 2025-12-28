import React, { useState, useEffect } from 'react';
import { fetchWithTokenRefresh } from '../utils/fetchWithTokenRefresh';
import { LANGUAGES, translations, t } from '../data/translations';

function PreferencesPage({ userId, token, onNavigateToPage }) {
    const [preferences, setPreferences] = useState({
        language: 'en-US',
        response_type: 'full',
        voice_enabled: true
    });

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

    // Fetch preferences on mount
    useEffect(() => {
        fetchPreferences();
    }, [userId, token, API_URL]);

    const fetchPreferences = async () => {
        try {
            setLoading(true);
            setError(null);
            
            if (!token) {
                console.log('[PREFERENCES] No token available yet');
                setLoading(false);
                return;
            }
            
            const headers = {
                'Authorization': `Bearer ${token}`
            };

            const response = await fetchWithTokenRefresh(`${API_URL}/user-profile/${userId}/preferences`, { headers });
            console.log('[PREFERENCES] GET response status:', response.status);
            
            if (!response.ok) {
                throw new Error('Failed to fetch preferences');
            }

            const data = await response.json();
            console.log('[PREFERENCES] Fetched preferences:', data);
            setPreferences({
                language: data.language || 'en-US',
                response_type: data.response_type || 'full',
                voice_enabled: data.voice_enabled !== false
            });
        } catch (err) {
            console.error('Error fetching preferences:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError(null);
        setSuccess(false);

        try {
            const response = await fetchWithTokenRefresh(`${API_URL}/user-profile/${userId}/preferences`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(preferences)
            });

            console.log('[PREFERENCES] POST response status:', response.status);

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Failed to save preferences');
            }

            const data = await response.json();
            console.log('[PREFERENCES] Saved preferences:', data);
            
            if (data.preferences) {
                setPreferences({
                    language: data.preferences.language,
                    response_type: data.preferences.response_type,
                    voice_enabled: data.preferences.voice_enabled
                });
            }
            setSuccess(true);
            // Close preferences panel after 1.5 seconds
            setTimeout(() => {
                setSuccess(false);
                onNavigateToPage(0);
            }, 1500);
        } catch (err) {
            console.error('Error saving preferences:', err);
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const currentLang = preferences.language;
    const currentTranslations = translations[currentLang] || translations['en-US'];

    // Get translation function
    const getString = (key) => t(currentLang, key);

    if (loading) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
                {getString('loading')}
            </div>
        );
    }

    return (
        <div style={{
            maxWidth: '600px',
            margin: '0 auto',
            padding: '2rem',
            backgroundColor: '#fff',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
        }}>
            <h1 style={{
                marginTop: 0,
                marginBottom: '2rem',
                fontSize: '28px',
                color: '#333',
                textAlign: 'center'
            }}>
                {getString('preferences')}
            </h1>

            {error && (
                <div style={{
                    padding: '12px',
                    marginBottom: '1.5rem',
                    backgroundColor: '#ffebee',
                    color: '#c62828',
                    borderRadius: '8px',
                    fontSize: '14px'
                }}>
                    {getString('error')}: {error}
                </div>
            )}

            {success && (
                <div style={{
                    padding: '12px',
                    marginBottom: '1.5rem',
                    backgroundColor: '#e8f5e9',
                    color: '#2e7d32',
                    borderRadius: '8px',
                    fontSize: '14px'
                }}>
                    ✓ {getString('saved')}
                </div>
            )}

            <form onSubmit={handleSave}>
                {/* Language Preference */}
                <div style={{
                    marginBottom: '2rem',
                    paddingBottom: '2rem',
                    borderBottom: '1px solid #eee'
                }}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        gap: '1rem'
                    }}>
                        <div style={{ flex: 1 }}>
                            <label style={{
                                display: 'block',
                                marginBottom: '0.5rem',
                                fontWeight: '600',
                                color: '#333',
                                fontSize: '16px'
                            }}>
                                {getString('language')}
                            </label>
                            <select
                                value={preferences.language}
                                onChange={(e) => setPreferences({
                                    ...preferences,
                                    language: e.target.value
                                })}
                                style={{
                                    width: '100%',
                                    padding: '8px 12px',
                                    borderRadius: '6px',
                                    border: '1px solid #ccc',
                                    fontSize: '14px',
                                    backgroundColor: '#fff',
                                    cursor: 'pointer'
                                }}
                            >
                                {Object.entries(LANGUAGES).map(([code, name]) => (
                                    <option key={code} value={code}>{name}</option>
                                ))}
                            </select>
                        </div>
                        <div style={{
                            flex: 0.6,
                            fontSize: '13px',
                            color: '#666',
                            paddingTop: '26px',
                            lineHeight: '1.4'
                        }}>
                            {getString('languageDescription')}
                        </div>
                    </div>
                </div>

                {/* Response Type */}
                <div style={{
                    marginBottom: '2rem',
                    paddingBottom: '2rem',
                    borderBottom: '1px solid #eee'
                }}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        gap: '1rem'
                    }}>
                        <div style={{ flex: 1 }}>
                            <label style={{
                                display: 'block',
                                marginBottom: '0.75rem',
                                fontWeight: '600',
                                color: '#333',
                                fontSize: '16px'
                            }}>
                                {getString('responseType')}
                            </label>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <label style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    cursor: 'pointer',
                                    fontSize: '14px'
                                }}>
                                    <input
                                        type="radio"
                                        name="response_type"
                                        value="full"
                                        checked={preferences.response_type === 'full'}
                                        onChange={(e) => setPreferences({
                                            ...preferences,
                                            response_type: e.target.value
                                        })}
                                        style={{
                                            marginRight: '8px',
                                            cursor: 'pointer'
                                        }}
                                    />
                                    {getString('fullResponses')}
                                </label>
                                <label style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    cursor: 'pointer',
                                    fontSize: '14px'
                                }}>
                                    <input
                                        type="radio"
                                        name="response_type"
                                        value="brief"
                                        checked={preferences.response_type === 'brief'}
                                        onChange={(e) => setPreferences({
                                            ...preferences,
                                            response_type: e.target.value
                                        })}
                                        style={{
                                            marginRight: '8px',
                                            cursor: 'pointer'
                                        }}
                                    />
                                    {getString('briefResponses')}
                                </label>
                            </div>
                        </div>
                        <div style={{
                            flex: 0.6,
                            fontSize: '13px',
                            color: '#666',
                            paddingTop: '36px',
                            lineHeight: '1.4'
                        }}>
                            {getString('responseTypeDescription')}
                        </div>
                    </div>
                </div>

                {/* Voice Responses */}
                <div style={{
                    marginBottom: '2rem',
                    paddingBottom: '2rem'
                }}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        gap: '1rem'
                    }}>
                        <div style={{ flex: 1 }}>
                            <label style={{
                                display: 'block',
                                marginBottom: '0.75rem',
                                fontWeight: '600',
                                color: '#333',
                                fontSize: '16px'
                            }}>
                                {getString('voice')}
                            </label>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <label style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    cursor: 'pointer',
                                    fontSize: '14px'
                                }}>
                                    <input
                                        type="radio"
                                        name="voice_enabled"
                                        value="true"
                                        checked={preferences.voice_enabled === true}
                                        onChange={(e) => setPreferences({
                                            ...preferences,
                                            voice_enabled: e.target.value === 'true'
                                        })}
                                        style={{
                                            marginRight: '8px',
                                            cursor: 'pointer'
                                        }}
                                    />
                                    {getString('voiceOn')}
                                </label>
                                <label style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    cursor: 'pointer',
                                    fontSize: '14px'
                                }}>
                                    <input
                                        type="radio"
                                        name="voice_enabled"
                                        value="false"
                                        checked={preferences.voice_enabled === false}
                                        onChange={(e) => setPreferences({
                                            ...preferences,
                                            voice_enabled: e.target.value === 'true'
                                        })}
                                        style={{
                                            marginRight: '8px',
                                            cursor: 'pointer'
                                        }}
                                    />
                                    {getString('voiceOff')}
                                </label>
                            </div>
                        </div>
                        <div style={{
                            flex: 0.6,
                            fontSize: '13px',
                            color: '#666',
                            paddingTop: '36px',
                            lineHeight: '1.4'
                        }}>
                            {getString('voiceDescription')}
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div style={{
                    display: 'flex',
                    gap: '1rem',
                    marginTop: '2rem',
                    paddingTop: '1.5rem',
                    borderTop: '1px solid #eee'
                }}>
                    <button
                        type="submit"
                        disabled={saving}
                        style={{
                            flex: 1,
                            padding: '12px',
                            backgroundColor: '#9370db',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: saving ? 'not-allowed' : 'pointer',
                            fontSize: '14px',
                            fontWeight: '600',
                            transition: 'background-color 0.3s'
                        }}
                        onMouseEnter={(e) => !saving && (e.target.style.backgroundColor = '#7b5bb5')}
                        onMouseLeave={(e) => (e.target.style.backgroundColor = '#9370db')}
                    >
                        {saving ? getString('saving') : getString('save')}
                    </button>
                    <button
                        type="button"
                        onClick={() => onNavigateToPage(0)}
                        style={{
                            flex: 1,
                            padding: '12px',
                            backgroundColor: '#ddd',
                            color: '#333',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: '600',
                            transition: 'background-color 0.3s'
                        }}
                        onMouseEnter={(e) => (e.target.style.backgroundColor = '#ccc')}
                        onMouseLeave={(e) => (e.target.style.backgroundColor = '#ddd')}
                    >
                        {getString('cancel')}
                    </button>
                </div>
            </form>
        </div>
    );
}

export default PreferencesPage;
