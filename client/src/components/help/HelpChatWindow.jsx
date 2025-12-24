import React, { useState, useEffect, useRef } from 'react';
import { FAQViewer } from './FAQViewer';
import './HelpChat.css';

/**
 * HelpChatWindow - Persistent help chat modal with FAQ access
 * Shows conversation history and takes user questions
 */
export function HelpChatWindow({ isOpen, onClose, userId, token, apiUrl, currentPage, onMinimize }) {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showFAQ, setShowFAQ] = useState(false);
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
          content: 'Sorry, I had trouble processing your question. Please try again.'
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (err) {
      console.error('[HELP-CHAT] Error:', err);
      const errorMessage = {
        role: 'assistant',
        content: 'Sorry, I had trouble processing your question. Please try again.'
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
    setShowFAQ(false);
    onClose();
  };

  // Show FAQ instead of chat
  if (showFAQ) {
    return <FAQViewer onClose={() => setShowFAQ(false)} />;
  }

  if (!isOpen) return null;

  return (
    <div className={`help-chat-container ${isMinimized ? 'minimized' : ''}`}>
      {/* Header */}
      <div className="help-chat-header">
        <div className="help-chat-title">
          {isMinimized ? '❓ Help' : '❓ Help & Questions'}
        </div>
        <div className="help-chat-controls">
          <button
            onClick={() => setShowFAQ(true)}
            className="help-chat-button faq-btn"
            title="View FAQ"
          >
            📚
          </button>
          <button
            onClick={isMinimized ? handleExpand : handleMinimize}
            className="help-chat-button minimize"
            title={isMinimized ? 'Expand' : 'Minimize'}
          >
            {isMinimized ? '▲' : '▼'}
          </button>
          <button
            onClick={handleClose}
            className="help-chat-button close"
            title="Close"
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
                <p>👋 Welcome to the Help Chat!</p>
                <p>Ask me any questions about how to use the app. I'm here to help!</p>
                <p style={{ fontSize: '11px', color: '#999', marginTop: '1rem' }}>
                  💡 You can ask things like:
                  <br />
                  • How do I update my payment method?
                  <br />
                  • How do I enable 2FA?
                  <br />
                  • Where can I find my birth chart?
                </p>
                <p style={{ fontSize: '11px', color: '#667eea', marginTop: '1rem', fontWeight: '600' }}>
                  👉 Click the 📚 button above to browse the FAQ for instant answers!
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
                  <span className="help-chat-loading">Thinking...</span>
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
              placeholder="Ask a question..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={loading}
            />
            <button
              type="submit"
              className="help-chat-send-button"
              disabled={loading || !inputValue.trim()}
              title="Send"
            >
              Send
            </button>
          </form>
        </>
      )}
    </div>
  );
}
