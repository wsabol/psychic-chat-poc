import React from 'react';
import CardDisplay from './CardDisplay';
import ReactMarkdown from 'react-markdown';
import { logErrorFromCatch } from '../shared/errorLogger.js';

function ChatHistory({ chat }) {
    return (
        chat.filter(msg => !['horoscope','moon_phase','cosmic_weather','void_of_course','lunar_nodes'].includes(msg.role)).map((msg, index) => {
            const key = msg.id || `msg-${index}-${Date.now()}`;
            if (typeof msg.content === 'string') {
                if (typeof msg.content === 'string' && msg.content.trim().startsWith('{') && msg.content.trim().endsWith('}')) {
                    try {
                        const parsed = JSON.parse(msg.content);
                        return (
                            <div key={key}>
                                <ReactMarkdown>{parsed.text || msg.content}</ReactMarkdown>
                                {parsed.cards && parsed.cards.length > 0 && <CardDisplay cards={parsed.cards} />}
                                {parsed.chart && parsed.chart.url && <img src={parsed.chart.url} alt="Astrological Chart" style={{ maxWidth: '100%', marginTop: '10px' }} />}
                            </div>
                        );
                    } catch (e) {
                        logErrorFromCatch('Parsing error in ChatHistory:', e);
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