import { useState, useEffect, useRef, useCallback } from 'react';
import { getCardImageByID, getCardImageByName } from '../utils/cardImageMap.js';
import '../styles/responsive.css';
import './ChatPage.css';

/**
 * Convert loose markdown to HTML (defensive cleanup layer)
 * Handles any markdown that slipped through from backend
 */
function cleanMarkdownToHTML(text) {
  if (!text || typeof text !== 'string') return text;
  
  // If already HTML, return as-is
  if (text.includes('<') && text.includes('>')) {
    return text;
  }
  
  let html = text;
  
  // Replace escaped newlines
  html = html.replace(/\\n/g, '\n');
  
  // Convert markdown bold to HTML
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  
  // Convert markdown headers to HTML
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^# (.+)$/gm, '<h3>$1</h3>');
  
  // Wrap paragraphs in <p> tags
  const paragraphs = html.split(/\n\n+/).map(para => {
    para = para.trim();
    // Don't wrap already-wrapped elements
    if (para.match(/^<[hou]/)) return para;
    return para ? `<p>${para}</p>` : '';
  }).join('');
  
  return paragraphs;
}

/**
 * TarotCard - Display a single tarot card with image and label
 */
function TarotCard({ card }) {
  let imageFilename = card.id !== undefined ? getCardImageByID(card.id) : null;
  
  if (!imageFilename && card.name) {
    imageFilename = getCardImageByName(card.name);
  }

  const isReversed = card.inverted;
  const cardLabel = isReversed ? `${card.name} (Reversed)` : card.name;

  if (!imageFilename) {
    console.warn(`[TAROT] Could not find image for card:`, card);
    return null;
  }

  return (
    <div className="card-item">
      <img
        src={`/images/${imageFilename}`}
        alt={cardLabel}
        className={`card-image ${isReversed ? 'reversed' : ''}`}
        loading="lazy"
      />
      <div className="card-label">{cardLabel}</div>
    </div>
  );
}

/**
 * CardsDisplay - Show multiple tarot cards in horizontal scroll
 */
function CardsDisplay({ cards }) {
  if (!cards || cards.length === 0) {
    return null;
  }

  return (
    <div className="cards-container">
      <div className="cards-scroll-wrapper">
        {cards.map((card, idx) => (
          <TarotCard key={idx} card={card} />
        ))}
      </div>
    </div>
  );
}

/**
 * ChatMessage - Render a single message with optional cards
 */
function ChatMessage({ msg }) {
  let messageText = msg.content;
  let cards = null;

  // Parse content if it's stored as JSON with text + cards
  if (typeof msg.content === 'string') {
    try {
      const parsed = JSON.parse(msg.content);
      if (parsed.text && parsed.cards) {
        messageText = parsed.text;
        cards = parsed.cards;
      } else {
        messageText = msg.content;
      }
    } catch {
      messageText = msg.content;
    }
  } else if (typeof msg.content === 'object' && msg.content !== null) {
    if (msg.content.text) {
      messageText = msg.content.text;
      cards = msg.content.cards || null;
    }
  }

  return (
    <div className={`chat-message chat-message-${msg.role}`}>
      <div className="message-content">
        {msg.role === 'assistant' ? (
          <>
            <div dangerouslySetInnerHTML={{ __html: cleanMarkdownToHTML(messageText) }} />
            {cards && <CardsDisplay cards={cards} />}
          </>
        ) : (
          <div>{messageText}</div>
        )}
      </div>
    </div>
  );
}

/**
 * ChatPage - Full page version of ChatScreen
 */
export default function ChatPage({ userId, token, auth }) {
  const messagesEndRef = useRef(null);
  const pollIntervalRef = useRef(null);
  const lastMessageCountRef = useRef(0);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3000";

  const fetchMessages = useCallback(async () => {
    if (!userId || !token) return 0;
    try {
      const response = await fetch(`${API_URL}/chat/history/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const rawData = await response.json();
        const filtered = rawData.filter(msg => 
          msg.role === 'user' || msg.role === 'assistant'
        );
        setMessages(filtered);
        scrollToBottom();
        return filtered.length;
      }
    } catch (err) {
      console.error('[CHAT] Error fetching messages:', err);
    }
    return 0;
  }, [userId, token, API_URL]);

  const startPolling = () => {
    if (pollIntervalRef.current) return;
    
    let pollCount = 0;
    const maxPolls = 120;
    
    pollIntervalRef.current = setInterval(async () => {
      pollCount++;
      const messageCount = await fetchMessages();
      
      if (messageCount > lastMessageCountRef.current || pollCount >= maxPolls) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
        lastMessageCountRef.current = messageCount;
      }
    }, 500);
  };

  useEffect(() => {
    const loadChat = async () => {
      const count = await fetchMessages();
      lastMessageCountRef.current = count;
    };
    loadChat();
  }, [fetchMessages]);

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

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
        const count = await fetchMessages();
        lastMessageCountRef.current = count;
        startPolling();
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
            <ChatMessage key={idx} msg={msg} />
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
