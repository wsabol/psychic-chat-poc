import React from 'react';

function CardDisplay({ cards }) {
    if (!cards || cards.length === 0) {
        return null;
    }
    let layoutStyle = {};
    if (cards.length === 7) {
        layoutStyle = { display: 'flex', flexWrap: 'wrap', justifyContent: 'center' };  // Simplified Lotus-like circle
    } else if (cards.length === 10) {
        layoutStyle = { display: 'grid', gridTemplateAreas: "'card1 card2 card3 card4' 'card5 card6 card7 card8' 'card9 card10 . .'", gap: '10px' };  // Simplified Celtic Cross
    }
    return (
        <div style={{ ...layoutStyle }}>
            {cards.map((card, idx) => (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <img
                        src={`/images/${card.name.toLowerCase().replace(/\s+/g, '').replace(/^the\s+/, '')}.jpeg`}
                        alt={card.name}
                        style={{ width: '50px', height: 'auto', transform: card.inverted ? 'rotate(180deg)' : 'none' }}
                        onError={(e) => {
                            console.error('Image error for ' + card.name + ': URL ' + e.target.src + ', Event:', e);
                            // Use an existing image as a safe fallback to avoid missing placeholder file
                            e.target.src = '/images/theworld.jpeg';
                        }}
                    />
                    <p>{card.name}</p>
                </div>
            ))}
        </div>
    );
}

export default CardDisplay;