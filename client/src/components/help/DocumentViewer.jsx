import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../context/TranslationContext';
import { logErrorFromCatch } from '../../shared/errorLogger.js';
import './DocumentViewer.css';

/**
 * DocumentViewer - Display Terms or Privacy documents (PDF or Markdown)
 */
export function DocumentViewer({ title, docType, onBack }) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [fileType, setFileType] = useState('md'); // 'md' or 'pdf'
  const { t } = useTranslation();

  useEffect(() => {
    const fetchDocument = async () => {
      try {
        // Use PDF files for both terms and privacy
        const fileName = docType === 'terms' ? 'Terms_of_Service.pdf' : 'privacy.pdf';
        const extension = fileName.endsWith('.pdf') ? 'pdf' : 'md';
        setFileType(extension);

        if (extension === 'pdf') {
          // For PDF, just set the URL
          setContent(`/${fileName}`);
          setLoading(false);
        } else {
          // For markdown, fetch and parse the content
          const response = await fetch(`/${fileName}`);
          const text = await response.text();
          setContent(text);
          setLoading(false);
        }
      } catch (err) {
        logErrorFromCatch(`Error loading ${docType}:`, err);
        setContent(`Failed to load ${docType} document.`);
        setLoading(false);
      }
    };
    fetchDocument();
  }, [docType]);

  return (
    <div className="help-document-viewer">
      <div className="help-viewer-header">
        <h2>{title}</h2>
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
        {loading ? (
          <p>Loading...</p>
        ) : fileType === 'pdf' ? (
          <iframe
            src={content}
            title={title}
            className="pdf-viewer"
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              minHeight: '600px'
            }}
          />
        ) : (
          <div className="markdown-content">
            {content.split('\n').map((line, idx) => renderMarkdownLine(line, idx))}
          </div>
        )}
      </div>
    </div>
  );
}

function renderMarkdownLine(line, idx) {
  if (line.startsWith('#')) {
    const level = line.match(/^#+/)[0].length;
    const text = line.replace(/^#+\s+/, '');
    return React.createElement(`h${Math.min(level + 1, 6)}`, { key: idx }, text);
  }
  if (line.startsWith('-')) {
    return <li key={idx}>{line.replace(/^-\s+/, '')}</li>;
  }
  if (line.trim() === '') {
    return <br key={idx} />;
  }
  return <p key={idx}>{line}</p>;
}
