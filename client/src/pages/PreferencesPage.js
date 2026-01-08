import React, { useState } from 'react';
import { useSpeech } from '../hooks/useSpeech';
import { useTranslation } from '../context/TranslationContext';
import { useFetchPreferences, useSavePreferences } from './PreferencesPage/usePreferencesLogic';
import { createGetString } from './PreferencesPage/getStringUtil';
import OracleLanguageSection from './PreferencesPage/OracleLanguageSection';
import ResponseTypeSection from './PreferencesPage/ResponseTypeSection';
import VoiceSection from './PreferencesPage/VoiceSection';
import ActionButtons from './PreferencesPage/ActionButtons';

function PreferencesPage({ userId, token, onNavigateToPage }) {
    const { t, changeLanguage } = useTranslation();
    const { speak, voiceGreetings, isSupported: isSpeechSupported } = useSpeech();
    const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

    const { preferences, setPreferences, personalInfo, loading, error: fetchError } = useFetchPreferences(
        userId,
        token,
        API_URL
    );

    const { save: savePreferences, saving, error: saveError, success } = useSavePreferences(
        API_URL,
        userId,
        token,
        changeLanguage
    );

    const [previewingVoice, setPreviewingVoice] = useState(null);
    const [error, setError] = useState(fetchError);

    const getString = createGetString(preferences.language, t);

    const handleSave = async (e) => {
        e.preventDefault();
        setError(null);

        try {
            console.log('[PREF-PAGE] Saving preferences:', preferences);
            const savedPrefs = await savePreferences(preferences);
            if (savedPrefs) {
                setPreferences(savedPrefs);
            }

            setTimeout(() => {
                onNavigateToPage(0);
            }, 1500);
        } catch (err) {
            setError(err.message);
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

    if (loading) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
                {getString('common.loading')}
            </div>
        );
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

            {(error || saveError) && (
                <div style={{
                    padding: '12px',
                    marginBottom: '1.5rem',
                    backgroundColor: '#ffebee',
                    color: '#c62828',
                    borderRadius: '8px',
                    fontSize: '14px'
                }}>
                    {getString('common.error')}: {error || saveError}
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
                <OracleLanguageSection
                    oracleLanguage={preferences.oracle_language}
                    onLanguageChange={(oracleLanguage, pageLanguage) => {
                        console.log('[PREF-PAGE] Language changed:', { oracleLanguage, pageLanguage });
                        // UPDATE BOTH in a SINGLE call to avoid state race condition
                        setPreferences({ ...preferences, oracle_language: oracleLanguage, language: pageLanguage });
                    }}
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
                />
            </form>
        </div>
    );
}

export default PreferencesPage;
