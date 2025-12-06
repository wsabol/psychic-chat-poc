import { useEffect, useRef } from 'react';
import { useChat } from '../hooks/useChat';
import { useOnboarding } from '../hooks/useOnboarding';
import { useOnboardingHandlers } from '../hooks/useOnboardingHandlers';
import ChatMessageList from '../components/ChatMessageList';
import ChatInputForm from '../components/ChatInputForm';
import OnboardingFlow from '../components/OnboardingFlow';
import '../styles/responsive.css';
import './ChatPage.css';

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3000";

/**
 * ChatPage - Simplified main chat page
 * Uses existing useChat hook and new modular hooks
 */
export default function ChatPage({ userId, token, auth }) {
  const isTemporaryAccount = auth?.authEmail?.startsWith('temp_');
  
  // Use existing chat hook (returns chat, message, setMessage, sendMessage)
  const { chat, message, setMessage, sendMessage } = 
    useChat(userId, token, !!token, userId);
  
  // Use new onboarding hook
  const onboarding = useOnboarding(auth, API_URL, isTemporaryAccount);
  const handlers = useOnboardingHandlers(auth, onboarding, userId, token, API_URL);
  
  // Refs for message end
  const messagesEndRef = useRef(null);
  
  // Filter out special message types for display
  const displayMessages = chat.filter(msg => 
    msg.role === 'user' || msg.role === 'assistant'
  );

  // Check for first response and capture it
  useEffect(() => {
    if (isTemporaryAccount && !onboarding.firstResponseReceived && displayMessages.length >= 2) {
      const oracleMessages = displayMessages.filter(msg => msg.role === 'assistant');
      if (oracleMessages.length >= 1) {
        const firstOracleMessage = oracleMessages[0];
        
        onboarding.captureFirstMessage(firstOracleMessage);
        onboarding.setFirstResponseReceived(true);
      }
    }
  }, [isTemporaryAccount, onboarding, displayMessages]);

  // Handle sending message with onboarding logic
  const handleSendMessage = async () => {
    // For temp accounts, start timer immediately when sending first message
    if (isTemporaryAccount && !onboarding.firstResponseReceived) {
      onboarding.startCountdown();
    }

    // Send the message
    await sendMessage();
  };



  return (
    <div style={{ position: 'relative' }}>
      {/* All onboarding modals and pages */}
      <OnboardingFlow
        // State
        showAstrologyPrompt={onboarding.showAstrologyPrompt}
        setShowAstrologyPrompt={onboarding.setShowAstrologyPrompt}
        showPersonalInfoModal={onboarding.showPersonalInfoModal}
        setShowPersonalInfoModal={onboarding.setShowPersonalInfoModal}
        showHoroscopePage={onboarding.showHoroscopePage}
        setShowHoroscopePage={onboarding.setShowHoroscopePage}
        showFinalModal={onboarding.showFinalModal}
        setShowFinalModal={onboarding.setShowFinalModal}
        isTemporaryAccount={isTemporaryAccount}
        onboardingFirstMessage={onboarding.onboardingFirstMessage}
        onboardingHoroscope={onboarding.onboardingHoroscope}
        
        // User data
        userId={userId}
        token={token}
        auth={auth}
        
        // Handlers
        handleAstrologyPromptNo={handlers.handleAstrologyPromptNo}
        handleAstrologyPromptYes={handlers.handleAstrologyPromptYes}
        handlePersonalInfoClose={handlers.handlePersonalInfoClose}
        handlePersonalInfoSave={handlers.handlePersonalInfoSave}
        handleHoroscopeClose={handlers.handleHoroscopeClose}
        handleSetupAccount={handlers.handleSetupAccount}
        handleExit={handlers.handleExit}
      />

      {/* Main chat UI */}
      <div className="page-safe-area chat-page-container">
        <div className="chat-header">
          <h2 className="heading-primary">
            {isTemporaryAccount ? '🔮 Oracle Chat (Free Trial)' : '🔮 Chat with Oracle'}
          </h2>
          <p className="chat-subtitle">Ask me anything about your journey</p>
        </div>

        {/* Messages and timer */}
        <ChatMessageList
          messages={displayMessages}
          messagesEndRef={messagesEndRef}
          timerActive={onboarding.timerActive}
          timeRemaining={onboarding.timeRemaining}
        />

        {/* Input form */}
        <ChatInputForm
          inputMessage={message}
          setInputMessage={setMessage}
          onSend={handleSendMessage}
          disabled={onboarding.inputDisabled}
          loading={false}
          isTemporaryAccount={isTemporaryAccount}
        />
      </div>
    </div>
  );
}
