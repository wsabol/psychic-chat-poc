import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from '../../context/TranslationContext';
import { FAQViewer } from './FAQViewer';
import './HelpChat.css';

/**
 * HelpChatWindow - Persistent help chat modal with FAQ access
 * Shows conversation history and takes user questions
 */
export function HelpChatWindow({ isOpen, onClose, userId, token, apiUrl, currentPage, onMinimize }) {
  const { t } = useTranslation();
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [currentView, setCurrentView] = useState('chat'); // 'chat', 'faq', 'terms', 'privacy', 'about'
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!inputValue.trim() || loading) return;

    // Add user message immediately
    const userMessage = {
      role: 'user',
      content: inputValue.trim()
    };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setLoading(true);

    try {
      const response = await fetch(`${apiUrl}/help/ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          question: userMessage.content,
          currentPage,
          conversationHistory: messages
        })
      });

      const data = await response.json();

      if (response.ok && data.response) {
        const assistantMessage = {
          role: 'assistant',
          content: data.response
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        const errorMessage = {
          role: 'assistant',
          content: t('help.chat.messages.error')
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (err) {
      console.error('[HELP-CHAT] Error:', err);
      const errorMessage = {
        role: 'assistant',
        content: t('help.chat.messages.error')
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleMinimize = () => {
    setIsMinimized(true);
    onMinimize?.();
  };

  const handleExpand = () => {
    setIsMinimized(false);
  };

  const handleClose = () => {
    // Reset everything when closing
    setMessages([]);
    setInputValue('');
    setIsMinimized(false);
    setCurrentView('chat');
    onClose();
  };

  const handleViewChange = (view) => {
    setCurrentView(view);
  };

  // Show FAQ instead of chat
  if (currentView === 'faq') {
    return (
      <FAQViewer onClose={() => setCurrentView('chat')} onViewChange={handleViewChange} />
    );
  }

  // Show Terms
  if (currentView === 'terms') {
    return (
      <DocumentViewer
        title={t('help.terms.title')}
        docType="terms"
        onBack={() => setCurrentView('chat')}
      />
    );
  }

  // Show Privacy
  if (currentView === 'privacy') {
    return (
      <DocumentViewer
        title={t('help.privacy.title')}
        docType="privacy"
        onBack={() => setCurrentView('chat')}
      />
    );
  }

  // Show About
  if (currentView === 'about') {
    return (
      <AboutViewer
        onBack={() => setCurrentView('chat')}
      />
    );
  }

  if (!isOpen) return null;

  return (
    <div className={`help-chat-container ${isMinimized ? 'minimized' : ''}`}>
      {/* Header */}
      <div className="help-chat-header">
        <div className="help-chat-title">
          {isMinimized ? t('help.window.titleMinimized') : t('help.window.titleExpanded')}
        </div>
        <div className="help-chat-controls">
          <button
            onClick={() => handleViewChange('faq')}
            className="help-chat-button faq-btn"
            title={t('help.window.buttons.faq')}
          >
            📚
          </button>
          <button
            onClick={() => handleViewChange('terms')}
            className="help-chat-button terms-btn"
            title={t('help.window.buttons.terms')}
          >
            📋
          </button>
          <button
            onClick={() => handleViewChange('privacy')}
            className="help-chat-button privacy-btn"
            title={t('help.window.buttons.privacy')}
          >
            🔒
          </button>
          <button
            onClick={() => handleViewChange('about')}
            className="help-chat-button about-btn"
            title={t('help.window.buttons.about')}
          >
            ℹ️
          </button>
          <button
            onClick={isMinimized ? handleExpand : handleMinimize}
            className="help-chat-button minimize"
            title={isMinimized ? t('help.controls.expand') : t('help.controls.minimize')}
          >
            {isMinimized ? '▲' : '▼'}
          </button>
          <button
            onClick={handleClose}
            className="help-chat-button close"
            title={t('help.controls.close')}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Chat Content (only show if not minimized) */}
      {!isMinimized && (
        <>
          {/* Messages */}
          <div className="help-chat-messages">
            {messages.length === 0 && (
              <div className="help-chat-welcome">
                <p>{t('help.chat.welcome.greeting')}</p>
                <p>{t('help.chat.welcome.description')}</p>
                <p style={{ fontSize: '11px', color: '#999', marginTop: '1rem' }}>
                  {t('help.chat.welcome.examples')}
                  <br />
                  {t('help.chat.welcome.exampleList').map((example, idx) => (
                    <span key={idx}>• {example}<br /></span>
                  ))}
                </p>
                <p style={{ fontSize: '11px', color: '#667eea', marginTop: '1rem', fontWeight: '600' }}>
                  {t('help.chat.welcome.faqHint')}
                </p>
              </div>
            )}
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`help-chat-message ${msg.role === 'user' ? 'user' : 'assistant'}`}
              >
                <div className="help-chat-message-content">
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="help-chat-message assistant">
                <div className="help-chat-message-content">
                  <span className="help-chat-loading">{t('help.chat.messages.thinking')}</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Form */}
          <form className="help-chat-form" onSubmit={handleSendMessage}>
            <input
              type="text"
              className="help-chat-input"
              placeholder={t('help.chat.placeholder')}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={loading}
            />
            <button
              type="submit"
              className="help-chat-send-button"
              disabled={loading || !inputValue.trim()}
              title={t('help.chat.send')}
            >
              {t('help.chat.send')}
            </button>
          </form>
        </>
      )}
    </div>
  );
}

/**
 * DocumentViewer - Display Terms or Privacy documents
 */
function DocumentViewer({ title, docType, onBack }) {
  const [content, setContent] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const { t } = useTranslation();

  React.useEffect(() => {
    const fetchDocument = async () => {
      try {
        const fileName = docType === 'terms' ? 'TERMS_OF_SERVICE.md' : 'privacy.md';
        const response = await fetch(`/${fileName}`);
        const text = await response.text();
        setContent(text);
      } catch (err) {
        console.error(`Error loading ${docType}:`, err);
        setContent(`Failed to load ${docType} document.`);
      } finally {
        setLoading(false);
      }
    };
    fetchDocument();
  }, [docType]);

  return (
    <div className="help-document-viewer">
      <div className="help-document-header">
        <h2>{title}</h2>
        <button
          onClick={onBack}
          className="help-back-button"
          title={t('help.controls.back')}
        >
          ← {t('help.controls.back')}
        </button>
      </div>
      <div className="help-document-content">
        {loading ? (
          <p>Loading...</p>
        ) : (
          <div className="markdown-content">
            {content.split('\n').map((line, idx) => {
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
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * AboutViewer - Display About page
 */
function AboutViewer({ onBack }) {
  const { t } = useTranslation();

  return (
    <div className="help-about-viewer">
      <div className="help-about-header">
        <h2>{t('help.about.title')}</h2>
        <button
          onClick={onBack}
          className="help-back-button"
          title={t('help.controls.back')}
        >
          ← {t('help.controls.back')}
        </button>
      </div>
      <div className="help-about-content">
        {t('help.about.content').split('\n').map((paragraph, idx) => (
          <p key={idx}>{paragraph}</p>
        ))}
      </div>
    </div>
  );
}
