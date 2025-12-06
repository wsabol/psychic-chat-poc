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
  let messageText = msg.content;
  let cards = null;

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
