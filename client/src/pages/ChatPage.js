import { useState, useEffect, useRef } from 'react';
import '../styles/responsive.css';
import './ChatPage.css';

/**
 * ChatPage - Full page version of ChatScreen
 * Displays chat messages and input for oracle interaction
 */
export default function ChatPage({ userId, token, auth }) {
  const messagesEndRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3000";

  // Load chat history on mount
  useEffect(() => {
    const loadChat = async () => {
      if (!userId || !token) return;
      
      try {
        const response = await fetch(`${API_URL}/chat/history/${userId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
          const data = await response.json();
          setMessages(data);
          scrollToBottom();
        }
      } catch (err) {
        console.error('[CHAT] Error loading history:', err);
      }
    };

    loadChat();
  }, [userId, token, API_URL]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    
    if (!inputMessage.trim() || !userId || !token) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId,
          message: inputMessage
        })
      });

      if (response.ok) {
        setInputMessage('');
        
        // Reload messages
        const historyResponse = await fetch(`${API_URL}/chat/history/${userId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (historyResponse.ok) {
          const data = await historyResponse.json();
          setMessages(data);
          scrollToBottom();
        }
      }
    } catch (err) {
      console.error('[CHAT] Error sending message:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-safe-area chat-page-container">
      <div className="chat-header">
        <h2 className="heading-primary">🔮 Chat with Oracle</h2>
        <p className="chat-subtitle">Ask me anything about your journey</p>
      </div>

      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="chat-empty-state">
            <p className="body-text">Welcome! Ask me anything about your journey, challenges, or questions.</p>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div key={idx} className={`chat-message chat-message-${msg.role}`}>
              <div className="message-content">
                {msg.content}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={sendMessage} className="chat-input-form">
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder="Ask the oracle..."
          disabled={loading}
          className="chat-input"
        />
        <button 
          type="submit" 
          disabled={loading || !inputMessage.trim()}
          className="btn-primary"
        >
          {loading ? 'Sending...' : 'Send'}
        </button>
      </form>
    </div>
  );
}


