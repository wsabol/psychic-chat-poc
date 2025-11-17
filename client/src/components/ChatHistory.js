import React from 'react';
import CardDisplay from './CardDisplay';

function ChatHistory({ chat }) {
    return (
        chat.map((msg, index) => {
            const key = msg.id || `msg-${index}-${Date.now()}`;
            if (typeof msg.content === 'string') {
                if (typeof msg.content === 'string' && msg.content.trim().startsWith('{') && msg.content.trim().endsWith('}')) {
                    try {
                        const parsed = JSON.parse(msg.content);
                        return (
                            <div key={key}>
                                <p>{parsed.text || msg.content}</p>
                                {parsed.cards && parsed.cards.length > 0 && <CardDisplay cards={parsed.cards} />}
                                {parsed.chart && parsed.chart.url && <img src={parsed.chart.url} alt="Astrological Chart" style={{ maxWidth: '100%', marginTop: '10px' }} />}
                            </div>
                        );
                    } catch (e) {
                        console.error('Parsing error in ChatHistory:', e);
                        return <div key={key}><p>{msg.content}</p></div>;
                    }
                } else {
                    return <div key={key}><p>{msg.content}</p></div>;
                }
            } else {
                return <div key={key}><p>{msg.content}</p></div>;
            }
        })
    );
}

export default ChatHistory;