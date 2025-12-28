import { useState } from 'react';
import { getCardImageByID, getCardImageByName } from '../utils/cardImageMap.js';

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

function cleanMarkdownToHTML(text) {
  if (!text || typeof text !== 'string') return text;
  
  if (text.includes('<') && text.includes('>')) {
    return text;
  }
  
  let html = text;
  html = html.replace(/\\n/g, '\n');
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^# (.+)$/gm, '<h3>$1</h3>');
  
  const paragraphs = html.split(/\n\n+/).map(para => {
    para = para.trim();
    if (para.match(/^<[hou]/)) return para;
    return para ? `<p>${para}</p>` : '';
  }).join('');
  
  return paragraphs;
}

export default function ChatMessage({ msg }) {
  const [showingBrief, setShowingBrief] = useState(true);
  let fullText = msg.content;
  let briefText = null;
  let cards = null;

  // Parse full content
  if (typeof msg.content === 'string') {
    try {
      const parsed = JSON.parse(msg.content);
      if (parsed.text && parsed.cards) {
        fullText = parsed.text;
        cards = parsed.cards;
      } else {
        fullText = msg.content;
      }
    } catch {
      fullText = msg.content;
    }
  } else if (typeof msg.content === 'object' && msg.content !== null) {
    if (msg.content.text) {
      fullText = msg.content.text;
      cards = msg.content.cards || null;
    }
  }

  // Parse brief content if it exists
  if (msg.brief_content) {
    if (typeof msg.brief_content === 'string') {
      try {
        const parsed = JSON.parse(msg.brief_content);
        briefText = parsed.text || msg.brief_content;
      } catch {
        briefText = msg.brief_content;
      }
    } else if (typeof msg.brief_content === 'object' && msg.brief_content.text) {
      briefText = msg.brief_content.text;
    }
  }

  // Check if we have both brief and full (determines if toggle should show)
  const hasToggle = msg.role === 'assistant' && briefText;
  const displayText = (showingBrief && briefText) ? briefText : fullText;

  return (
    <div className={`chat-message chat-message-${msg.role}`}>
      <div className="message-content">
        {msg.role === 'assistant' ? (
          <>
            <div dangerouslySetInnerHTML={{ __html: cleanMarkdownToHTML(displayText) }} />
            {cards && <CardsDisplay cards={cards} />}
            
            {/* Toggle button for brief/full responses */}
            {hasToggle && (
              <button
                onClick={() => setShowingBrief(!showingBrief)}
                style={{
                  marginTop: '1rem',
                  padding: '0.5rem 1rem',
                  backgroundColor: '#7c63d8',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: '500',
                  transition: 'background-color 0.3s'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#6b52c1'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#7c63d8'}
              >
                {showingBrief ? '📖 Tell me more' : '📋 Show less'}
              </button>
            )}
          </>
        ) : (
          <div>{fullText}</div>
        )}
      </div>
    </div>
  );
}
