import React from 'react';
import { useTranslation } from '../../context/TranslationContext';
import './DocumentViewer.css';

/**
 * AboutViewer - Display About page content
 */
export function AboutViewer({ onBack }) {
  const { t } = useTranslation();

  return (
    <div className="help-about-viewer">
      <div className="help-viewer-header">
        <h2>{t('help.about.title')}</h2>
        <div className="help-viewer-controls">
          <button
            onClick={onBack}
            className="help-back-button"
            title={t('help.controls.back')}
          >
            ← {t('help.controls.back')}
          </button>
          <button
            onClick={onBack}
            className="help-close-button"
            title={t('help.controls.close')}
          >
            ✕
          </button>
        </div>
      </div>
      <div className="help-viewer-content" tabIndex={0}>
        {t('help.about.content').split('\n').map((paragraph, idx) => (
          <p key={idx}>{paragraph}</p>
        ))}
      </div>
    </div>
  );
}
