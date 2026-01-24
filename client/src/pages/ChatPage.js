import { useEffect, useRef, useState } from 'react';
import { useTranslation } from '../context/TranslationContext';
import { useChat } from '../hooks/useChat';
import ChatMessageList from '../components/ChatMessageList';
import ChatInputForm from '../components/ChatInputForm';
import CircleTimer from '../components/CircleTimer';
import { logErrorFromCatch } from '../shared/errorLogger.js';
import '../styles/responsive.css';
import './ChatPage.css';

/**
 * ChatPage - Main chat page for free trial onboarding
 * - Shows oracle greeting for temp accounts
 * - 90 second countdown timer in circular display
 * - Grays out input after sending message
 * - Shows modal with birth info or exit options after timer
 */
export default function ChatPage({ userId, token, auth, onNavigateToPage, onLogout }) {
  const { t } = useTranslation();
  const isTemporaryAccount = auth?.isTemporaryAccount;
  const [defaultShowBrief, setDefaultShowBrief] = useState(true);
  
  // Fetch user preferences once on mount
  useEffect(() => {
    if (!userId || !token) return;
    
    const fetchPreferences = async () => {
      try {
        const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';
        const response = await fetch(`${API_URL}/user-profile/${userId}/preferences`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          const responseType = data.response_type || 'full';
          // If preference is 'full', show full first (defaultShowBrief = false)
          // If preference is 'brief', show brief first (defaultShowBrief = true)
          setDefaultShowBrief(responseType === 'brief');
        }
      } catch (err) {
        logErrorFromCatch('[CHAT-PAGE] Error fetching preferences:', err);
      }
    };
    
    fetchPreferences();
  }, [userId, token]);
  
  // Chat hook
  const { chat, message, setMessage, sendMessage } = 
    useChat(userId, token, !!token, userId);
  
  // Onboarding flow state
  const [firstMessageSent, setFirstMessageSent] = useState(false);
  const [timerActive, setTimerActive] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(90);
  const [showAstrologyPrompt, setShowAstrologyPrompt] = useState(false);
  const timerRef = useRef(null);
  
  // Refs for message end and message count tracking
  const messagesEndRef = useRef(null);
  const previousMessageCountRef = useRef(0);
  
  // Filter out special message types for display
  const displayMessages = chat.filter(msg => 
    msg.role === 'user' || msg.role === 'assistant'
  );

    // Check for first user message sent and start 90 second timer (temp accounts only)
  useEffect(() => {
    if (isTemporaryAccount && !firstMessageSent) {
      const userMessages = displayMessages.filter(msg => msg.role === 'user');
      if (userMessages.length > 0) {
        setFirstMessageSent(true);
        setTimerActive(true);
        setTimeRemaining(90);
      }
    }
  }, [isTemporaryAccount, firstMessageSent, displayMessages]);

  // 90 second timer countdown
  useEffect(() => {
    if (timerActive && timeRemaining > 0) {
      timerRef.current = setTimeout(() => {
        setTimeRemaining(timeRemaining - 1);
      }, 1000);
      return () => clearTimeout(timerRef.current);
    } else if (timerActive && timeRemaining === 0) {
      setTimerActive(false);
      setShowAstrologyPrompt(true);
    }
  }, [timerActive, timeRemaining]);

  // Auto-scroll to bottom ONLY when NEW messages arrive (not on every render)
  useEffect(() => {
    // Only scroll if messages array has grown (new message arrived)
    if (displayMessages.length > previousMessageCountRef.current) {
      previousMessageCountRef.current = displayMessages.length;
      // Small delay to ensure DOM is updated
      setTimeout(() => {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
      }, 0);
    }
  }, [displayMessages.length]);

  // Handle send message
  const handleSendMessage = async () => {
    await sendMessage();
  };

  // Handle astrology prompt Yes - navigate to Personal Info page
  const handleAstrologyYes = () => {
    setShowAstrologyPrompt(false);
    if (onNavigateToPage) {
      onNavigateToPage(1); // Personal Info is page index 1
    }
  };

  // Handle astrology prompt No - log out and go to login
  const handleAstrologyNo = () => {
    setShowAstrologyPrompt(false);
    if (onLogout) {
      onLogout();
    }
  };

  const inputDisabled = isTemporaryAccount && firstMessageSent && !showAstrologyPrompt;

  return (
    <div style={{ position: 'relative' }}>
      {/* Astrology/Birth Info Prompt Modal */}
      {showAstrologyPrompt && isTemporaryAccount && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'rgba(30, 30, 60, 0.95)',
            padding: '2rem',
            borderRadius: '10px',
            maxWidth: '400px',
            color: 'white',
            textAlign: 'center',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
            border: '1px solid rgba(100, 150, 255, 0.3)'
          }}>
                        <h2 style={{ marginBottom: '1rem' }}>{t('onboarding.enhanceReading')}</h2>
            <p style={{ marginBottom: '2rem', lineHeight: '1.6', color: '#d0d0ff' }}>
              {t('onboarding.birthInfoPrompt')}
            </p>
            <div style={{
              display: 'flex',
              gap: '1rem',
              flexDirection: 'column'
            }}>
              <button
                onClick={handleAstrologyYes}
                style={{
                  padding: '0.75rem',
                  borderRadius: '5px',
                  border: 'none',
                  backgroundColor: '#7c63d8',
                  color: 'white',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                {t('onboarding.enterBirthInfo')}
              </button>
              <button
                onClick={handleAstrologyNo}
                style={{
                  padding: '0.75rem',
                  borderRadius: '5px',
                  border: '1px solid #7c63d8',
                  backgroundColor: 'transparent',
                  color: '#7c63d8',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                {t('common.exit')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main chat UI */}
      <div className="page-safe-area chat-page-container">
        <div className="chat-header">
          <h2 className="heading-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <img src="/StarshipPsychics_Logo.png" alt="Starship Psychics" style={{ width: '80px', height: '80px' }} />
            {isTemporaryAccount ? t('chat.titleTrial') : t('chat.title')}
          </h2>
          <p className="chat-subtitle">{t('chat.subtitle')}</p>
        </div>

        {/* Messages */}
        <ChatMessageList
          messages={displayMessages}
          messagesEndRef={messagesEndRef}
          defaultShowBrief={defaultShowBrief}
        />

        {/* Input form - grayed out after first message for temp accounts */}
        <ChatInputForm
          inputMessage={message}
          setInputMessage={setMessage}
          onSend={handleSendMessage}
          disabled={inputDisabled}
          loading={false}
          isTemporaryAccount={isTemporaryAccount}
        />

        {/* Circular timer display - absolutely positioned overlay, zero layout impact */}
        {isTemporaryAccount && timerActive && (
          <div style={{
            position: 'fixed',
            bottom: '100px',
            right: '2rem',
            zIndex: 50,
            pointerEvents: 'none'
          }}>
            <CircleTimer timeRemaining={timeRemaining} totalTime={90} />
          </div>
        )}
      </div>
    </div>
  );
}
