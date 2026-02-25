import { useEffect, useRef, useState } from 'react';
import { useTranslation } from '../context/TranslationContext';
import { useChat } from '../hooks/useChat';
import ChatMessageList from '../components/ChatMessageList';
import ChatInputForm from '../components/ChatInputForm';
import LogoWithCopyright from '../components/LogoWithCopyright';
import { logErrorFromCatch } from '../shared/errorLogger.js';
import '../styles/responsive.css';
import './ChatPage.css';

/**
 * ChatPage - Main chat page for free trial onboarding
 * - Shows oracle greeting for temp accounts
 * - Continue button appears after oracle responds (replaces 90-second timer)
 * - User can take time to read and consider the oracle's response
 * - Clicking Continue goes DIRECTLY to Personal Info page (no intermediate prompt)
 */
export default function ChatPage({ userId, token, auth, onNavigateToPage, onLogout, freeTrialState }) {
  const { t } = useTranslation();
  const isTemporaryAccount = auth?.isTemporaryAccount;
  // Default to full response for temp (free trial) accounts — they have no token so the
  // preference fetch below is skipped and they'd otherwise be stuck on brief mode.
  const [defaultShowBrief, setDefaultShowBrief] = useState(false);
  
  // Determine if free trial session is ready for temp users
  const sessionReady = isTemporaryAccount 
    ? (freeTrialState?.sessionId !== null && !freeTrialState?.loading)
    : true; // Non-temp users are always ready
  
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
          setDefaultShowBrief(responseType === 'brief');
        }
      } catch (err) {
        logErrorFromCatch('[CHAT-PAGE] Error fetching preferences:', err);
      }
    };
    
    fetchPreferences();
  }, [userId, token]);
  
  // Chat hook - pass sessionReady for temp accounts to prevent race conditions
  const { chat, message, setMessage, sendMessage, loading } = 
    useChat(userId, token, !!token, userId, isTemporaryAccount, sessionReady);
  
  // Onboarding flow state
  const [firstMessageSent, setFirstMessageSent] = useState(false);
  const [showContinueButton, setShowContinueButton] = useState(false);
  
  // Refs for message end and message count tracking
  const messagesEndRef = useRef(null);
  const previousMessageCountRef = useRef(0);
  
  // Filter out special message types for display
  const displayMessages = chat.filter(msg => 
    msg.role === 'user' || msg.role === 'assistant'
  );

  // Check for first user message sent and show Continue button after oracle responds (temp accounts only)
  useEffect(() => {
    if (isTemporaryAccount && !firstMessageSent) {
      const userMessages = displayMessages.filter(msg => msg.role === 'user');
      if (userMessages.length > 0) {
        setFirstMessageSent(true);
      }
    }
    
    // Show Continue button after oracle has responded to the first message
    if (isTemporaryAccount && firstMessageSent && !showContinueButton) {
      const assistantMessages = displayMessages.filter(msg => msg.role === 'assistant');
      // At least 2 assistant messages means: 1) opening greeting, 2) response to user's first question
      if (assistantMessages.length >= 2) {
        setShowContinueButton(true);
      }
    }
  }, [isTemporaryAccount, firstMessageSent, showContinueButton, displayMessages]);

  // Auto-scroll to bottom ONLY when NEW messages arrive (not on every render)
  useEffect(() => {
    if (displayMessages.length > previousMessageCountRef.current) {
      previousMessageCountRef.current = displayMessages.length;
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

  // Handle Continue button click — go DIRECTLY to Personal Info page (no intermediate prompt)
  const handleContinue = () => {
    setShowContinueButton(false);
    if (onNavigateToPage) {
      try {
        onNavigateToPage(1); // Personal Info is page index 1
      } catch (err) {
        logErrorFromCatch('[CHAT-PAGE] Failed to navigate to PersonalInfoPage', err);
      }
    }
  };

  // Disable input after first message is sent in free trial
  const inputDisabled = isTemporaryAccount && firstMessageSent;

  return (
    <div style={{ position: 'relative' }}>
      {/* Main chat UI */}
      <div className="page-safe-area chat-page-container">
        <div className="chat-header">
          <LogoWithCopyright size="80px" alt="Starship Psychics" />
          <div className="chat-header-text">
            <h2 className="heading-primary">{isTemporaryAccount ? t('chat.titleTrial') : t('chat.title')}</h2>
            <p className="chat-subtitle">{t('chat.subtitle')}</p>
          </div>
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
          loading={loading}
          isTemporaryAccount={isTemporaryAccount}
        />

        {/* Continue button - appears after oracle responds to first message */}
        {isTemporaryAccount && showContinueButton && (
          <div style={{
            position: 'fixed',
            bottom: '100px',
            right: '2rem',
            zIndex: 50,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <button
              onClick={handleContinue}
              style={{
                padding: '1rem 2rem',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#7c63d8',
                color: 'white',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '1.1rem',
                boxShadow: '0 4px 12px rgba(124, 99, 216, 0.4)',
                transition: 'all 0.2s ease',
                minWidth: '150px'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#6952c2';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(124, 99, 216, 0.5)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '#7c63d8';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(124, 99, 216, 0.4)';
              }}
            >
              {t('common.continue') || 'Continue'}
            </button>
            <div style={{
              fontSize: '0.85rem',
              color: '#999',
              textAlign: 'center',
              maxWidth: '200px'
            }}>
              {t('chat.continueHint') || 'Ready to continue?'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
