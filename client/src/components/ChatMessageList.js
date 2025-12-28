import ChatMessage from './ChatMessage';
import { CountdownTimer } from './CountdownTimer';

/**
 * ChatMessageList - Displays all chat messages and timer
 */
export default function ChatMessageList({ 
  messages = [], 
  messagesEndRef, 
  timerActive, 
  timeRemaining,
  defaultShowBrief = true
}) {
  return (
    <div className="chat-messages" style={{ position: 'relative' }}>
      {!messages || messages.length === 0 ? (
        <div className="chat-empty-state">
          <p className="body-text">Welcome! Ask me anything about your journey, challenges, or questions.</p>
        </div>
      ) : (
        messages.map((msg, idx) => (
          <ChatMessage key={idx} msg={msg} defaultShowBrief={defaultShowBrief} />
        ))
      )}
      <div ref={messagesEndRef} />
      
      {/* Countdown Timer */}
      {timerActive && (
        <div style={{
          position: 'fixed',
          right: '20px',
          bottom: '100px',
          width: '110px',
          zIndex: 100
        }}>
          <CountdownTimer 
            secondsRemaining={timeRemaining}
            isVisible={timerActive}
          />
        </div>
      )}
    </div>
  );
}
