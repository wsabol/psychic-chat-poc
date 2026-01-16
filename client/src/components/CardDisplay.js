import React from 'react';
import { logErrorFromCatch } from '../shared/errorLogger.js';

function CardDisplay({ cards }) {
    if (!cards || cards.length === 0) {
        return null;
    }

    // Deduplicate cards using normalized card names (Option B)
    // Uses Set to track seen card names (case-insensitive, trimmed)
    const seenCardNames = new Set();
    const uniqueCards = [];
    
    for (const card of cards) {
        // Normalize: lowercase, trim, remove extra spaces
        const normalizedName = card.name.toLowerCase().trim();
        const cardKey = `${normalizedName}-${card.inverted ? 'inverted' : 'upright'}`;
        
        if (!seenCardNames.has(cardKey)) {
            seenCardNames.add(cardKey);
            uniqueCards.push(card);
        }
    }

    let layoutStyle = {};
    let cardsPerRow = 1;

    // Determine grid layout based on number of unique cards
    if (uniqueCards.length === 3) {
        layoutStyle = { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', justifyContent: 'center' };
        cardsPerRow = 3;
    } else if (uniqueCards.length === 5) {
        layoutStyle = { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', justifyContent: 'center' };
        cardsPerRow = 3;
    } else if (uniqueCards.length === 7) {
        layoutStyle = { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', justifyContent: 'center' };
        cardsPerRow = 4;
    } else if (uniqueCards.length === 10) {
        layoutStyle = { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', justifyContent: 'center' };
        cardsPerRow = 4;
    } else if (uniqueCards.length === 1) {
        layoutStyle = { display: 'flex', justifyContent: 'center' };
    } else {
        layoutStyle = { display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '15px' };
    }

    return (
        <div style={{ ...layoutStyle, maxWidth: '100%', margin: '1rem 0' }}>
            {uniqueCards.map((card, idx) => (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '80px' }}>
                    <img
                        src={`/images/${card.name.toLowerCase().replace(/\s+/g, '').replace(/^the\s+/, '')}.jpeg`}
                        alt={card.name}
                        style={{ 
                            width: '80px', 
                            height: 'auto', 
                            borderRadius: '4px',
                            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
                            transform: card.inverted ? 'rotate(180deg)' : 'none',
                            transition: 'transform 0.3s ease'
                        }}
                        onError={(e) => {
                            logErrorFromCatch('Image error for ' + card.name + ': URL ' + e.target.src);
                            e.target.src = '/images/theworld.jpeg';
                        }}
                    />
                    <p style={{ 
                        fontSize: '12px', 
                        marginTop: '8px', 
                        textAlign: 'center',
                        maxWidth: '90px',
                        wordWrap: 'break-word',
                        fontWeight: card.inverted ? 'bold' : 'normal',
                        color: card.inverted ? '#9370db' : '#333'
                    }}>
                        {card.name}
                        {card.inverted && <span style={{ display: 'block', fontSize: '10px', color: '#9370db' }}>(inverted)</span>}
                    </p>
                </div>
            ))}
        </div>
    );
}

export default CardDisplay;
