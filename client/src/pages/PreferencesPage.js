import React, { useState, useEffect } from 'react';
import { fetchWithTokenRefresh } from '../utils/fetchWithTokenRefresh';
import { useSpeech } from '../hooks/useSpeech';
import { useTranslation } from '../context/TranslationContext';
import { useLanguagePreference } from '../hooks/useLanguagePreference';
import LanguageSection from './PreferencesPage/LanguageSection';
import ResponseTypeSection from './PreferencesPage/ResponseTypeSection';
import VoiceSection from './PreferencesPage/VoiceSection';
import ActionButtons from './PreferencesPage/ActionButtons';

function PreferencesPage({ userId, token, onNavigateToPage }) {
    const { t, language, changeLanguage } = useTranslation();
    const { saveLanguagePreference } = useLanguagePreference();
    const [preferences, setPreferences] = useState({
        language: language,
        response_type: 'full',
        voice_enabled: true,
        voice_selected: 'sophia'
    });
    const [personalInfo, setPersonalInfo] = useState({ familiar_name: '' });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const [previewingVoice, setPreviewingVoice] = useState(null);

    const { speak, voiceGreetings, isSupported: isSpeechSupported } = useSpeech();
    const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

    useEffect(() => {
        fetchData();
    }, [userId, token, API_URL]);

    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);
            
            if (!token) {
                console.log('[PREFERENCES] No token available yet');
                setLoading(false);
                return;
            }
            
            const headers = { 'Authorization': `Bearer ${token}` };

            const prefResponse = await fetchWithTokenRefresh(`${API_URL}/user-profile/${userId}/preferences`, { headers });
            if (!prefResponse.ok) throw new Error('Failed to fetch preferences');
            
            const prefData = await prefResponse.json();
            setPreferences({
                language: prefData.language || 'en-US',
                response_type: prefData.response_type || 'full',
                voice_enabled: prefData.voice_enabled !== false,
                voice_selected: prefData.voice_selected || 'sophia'
            });

            const personalResponse = await fetchWithTokenRefresh(`${API_URL}/user-profile/${userId}`, { headers });
            if (personalResponse.ok) {
                const personalData = await personalResponse.json();
                setPersonalInfo({ familiar_name: personalData.address_preference || 'Friend' });
            }
        } catch (err) {
            console.error('Error fetching data:', err);
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
            // Update language in TranslationContext if it changed
            if (preferences.language !== language) {
                await changeLanguage(preferences.language);
            }

            const response = await fetchWithTokenRefresh(`${API_URL}/user-profile/${userId}/preferences`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(preferences)
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Failed to save preferences');
            }

            const data = await response.json();
            if (data.preferences) {
                setPreferences({
                    language: data.preferences.language,
                    response_type: data.preferences.response_type,
                    voice_enabled: data.preferences.voice_enabled,
                    voice_selected: data.preferences.voice_selected
                });
            }
            setSuccess(true);
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

    const handlePreviewVoice = (voiceName) => {
        if (!isSpeechSupported) {
            setError('Voice preview not supported in your browser');
            return;
        }

        setPreviewingVoice(voiceName);
        const greeting = voiceGreetings[voiceName]?.[preferences.language];
        if (greeting) {
            const greetingText = greeting(personalInfo.familiar_name);
            speak(greetingText, { voiceName, rate: 0.95, pitch: 1.2 });
            setTimeout(() => setPreviewingVoice(null), 3000);
        }
    };

    // Create a local getString function that uses preferences language for old-style translations
    // but also falls back to new TranslationContext
    const getString = (key) => {
        try {
            return t(key);
        } catch (e) {
            return key;
        }
    };

    if (loading) {
        return <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>{getString('common.loading')}</div>;
    }

    return (
        <div style={{
            maxWidth: '700px',
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
                {getString('settings.preferences')}
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
                    {getString('common.error')}: {error}
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
                    ✓ {getString('common.saved')}
                </div>
            )}

            <form onSubmit={handleSave}>
                <LanguageSection
                    value={preferences.language}
                    onChange={(lang) => setPreferences({ ...preferences, language: lang })}
                    getString={getString}
                />

                <ResponseTypeSection
                    value={preferences.response_type}
                    onChange={(type) => setPreferences({ ...preferences, response_type: type })}
                    getString={getString}
                />

                <VoiceSection
                    voiceEnabled={preferences.voice_enabled}
                    voiceSelected={preferences.voice_selected}
                    previewingVoice={previewingVoice}
                    onVoiceEnabledChange={(enabled) => setPreferences({ ...preferences, voice_enabled: enabled })}
                    onVoiceSelectedChange={(voice) => setPreferences({ ...preferences, voice_selected: voice })}
                    onPreviewVoice={handlePreviewVoice}
                    getString={getString}
                />

                <ActionButtons
                    saving={saving}
                    onSubmit={handleSave}
                    onCancel={() => onNavigateToPage(0)}
                    getString={getString}
                    language={preferences.language}
                    onLanguageChange={(newLang) => setPreferences({ ...preferences, language: newLang })}
                />
            </form>
        </div>
    );
}

export default PreferencesPage;
