import React from 'react';

function CardDisplay({ cards }) {
    if (!cards || cards.length === 0) {
        return null;
    }
    return (
        <div style={{ border: '2px solid blue', margin: '1rem 0', padding: '1rem', backgroundColor: '#f0f0f0' }}>
            <h3 style={{ color: 'blue' }}>Tarot Cards:</h3>
            {cards.map((card, idx) => {
                let imageName = card.name.toLowerCase().replace(/\s+/g, '');  // Convert to lowercase and remove spaces, keep 'the'
                return (
                    <div key={idx} style={{ borderBottom: '1px solid gray', padding: '0.5rem', display: 'flex', alignItems: 'center' }}>
                        {card.name && (
                            <img 
                                src={`/images/${imageName}.jpeg`} 
                                alt={card.name} 
                                style={{ width: '50px', height: 'auto', marginRight: '1rem', transform: card.inverted ? 'rotate(180deg)' : 'none' }}  // Apply rotation for inverted cards
                                onError={(e) => { console.error('Image load error for', imageName, e); e.target.src = '/path/to/placeholder.jpg'; }}  // Add error handling
                            />
                        )}
                        <p><strong>{card.name}</strong>: {card.upright} {card.inverted ? '(inverted)' : ''}</p>
                    </div>
                );
            })}
        </div>
    );
}

export default CardDisplay;