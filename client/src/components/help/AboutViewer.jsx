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
        <button
          onClick={onBack}
          className="help-back-button"
          title={t('help.controls.back')}
        >
          ← {t('help.controls.back')}
        </button>
      </div>
      <div className="help-viewer-content">
        {t('help.about.content').split('\n').map((paragraph, idx) => (
          <p key={idx}>{paragraph}</p>
        ))}
      </div>
    </div>
  );
}
