import React, { useState } from 'react';
import { useTranslation } from '../context/TranslationContext';
import { useLanguagePreference } from '../hooks/useLanguagePreference';
import { logErrorFromCatch } from '../shared/errorLogger.js';

/**
 * LanguageSwitcher Component
 * 
 * Displays available languages and allows user to change language preference
 * Can be used in settings or as a floating button
 * 
 * Props:
 * - compact: boolean - if true, shows as icon button. if false, shows full list
 * - onLanguageChanged: callback function when language changes
 * - style: optional style overrides
 */
export function LanguageSwitcher({ compact = false, onLanguageChanged, style = {} }) {
  const { language, availableLanguages, isLoading } = useTranslation();
  const { saveLanguagePreference } = useLanguagePreference();
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleLanguageChange = async (newLanguage) => {
    if (newLanguage === language || isSaving) {
      return;
    }

    setIsSaving(true);
    try {
      const success = await saveLanguagePreference(newLanguage);
      if (success) {
        setIsOpen(false);
        if (onLanguageChanged) {
          onLanguageChanged(newLanguage);
        }
      }
    } catch (err) {
      logErrorFromCatch('Error changing language:', err);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return null;
  }

  // Compact mode - icon button
  if (compact) {
    return (
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          disabled={isSaving}
          style={{
            background: 'none',
            border: '1px solid rgba(124, 99, 216, 0.3)',
            padding: '0.5rem 0.75rem',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '1rem',
            color: 'white',
            transition: 'all 0.2s ease',
            opacity: isSaving ? 0.6 : 1,
            ...style
          }}
          title="Change Language"
        >
          {availableLanguages[language]?.flag} {language.split('-')[0].toUpperCase()}
        </button>

        {isOpen && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: '0.5rem',
              backgroundColor: 'rgba(20, 20, 40, 0.95)',
              border: '1px solid rgba(124, 99, 216, 0.3)',
              borderRadius: '8px',
              zIndex: 1000,
              minWidth: '150px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)'
            }}
          >
            {Object.entries(availableLanguages).map(([code, { name, flag }]) => (
              <button
                key={code}
                onClick={() => handleLanguageChange(code)}
                disabled={code === language || isSaving}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '0.75rem 1rem',
                  background: code === language ? 'rgba(124, 99, 216, 0.2)' : 'transparent',
                  border: 'none',
                  color: code === language ? '#7c63d8' : 'white',
                  cursor: code === language || isSaving ? 'default' : 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s ease',
                  fontSize: '0.9rem',
                  opacity: code === language ? 1 : 0.7,
                  ':hover': {
                    backgroundColor: 'rgba(124, 99, 216, 0.1)'
                  }
                }}
                onMouseEnter={(e) => {
                  if (code !== language && !isSaving) {
                    e.target.style.backgroundColor = 'rgba(124, 99, 216, 0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (code !== language) {
                    e.target.style.backgroundColor = 'transparent';
                  }
                }}
              >
                {flag} {name} {code === language && '✓'}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Full list mode
  return (
    <div style={{ width: '100%', ...style }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '1rem'
      }}>
        {Object.entries(availableLanguages).map(([code, { name, flag }]) => (
          <button
            key={code}
            onClick={() => handleLanguageChange(code)}
            disabled={code === language || isSaving}
            style={{
              padding: '1rem',
              background: code === language ? 'rgba(124, 99, 216, 0.2)' : 'rgba(30, 30, 60, 0.6)',
              border: code === language ? '2px solid #7c63d8' : '1px solid rgba(124, 99, 216, 0.2)',
              borderRadius: '8px',
              color: code === language ? '#7c63d8' : 'white',
              cursor: code === language || isSaving ? 'default' : 'pointer',
              transition: 'all 0.2s ease',
              fontSize: '1rem',
              fontWeight: code === language ? 'bold' : 'normal',
              opacity: isSaving ? 0.6 : 1,
              textAlign: 'center'
            }}
            onMouseEnter={(e) => {
              if (code !== language && !isSaving) {
                e.target.style.backgroundColor = 'rgba(124, 99, 216, 0.1)';
                e.target.style.transform = 'translateY(-2px)';
              }
            }}
            onMouseLeave={(e) => {
              if (code !== language) {
                e.target.style.backgroundColor = code === language ? 'rgba(124, 99, 216, 0.2)' : 'rgba(30, 30, 60, 0.6)';
                e.target.style.transform = 'translateY(0)';
              }
            }}
          >
            <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>
              {flag}
            </div>
            <div>{name}</div>
            {code === language && <div style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>✓ Selected</div>}
          </button>
        ))}
      </div>
    </div>
  );
}
