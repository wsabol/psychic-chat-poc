import React from 'react';

export default function AstrologyPromptModal({ show, isTemporary, onYes, onNo }) {
    if (!show || !isTemporary) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
        }}>
            <div style={{
                backgroundColor: 'rgba(30, 30, 60, 0.95)',
                padding: '2rem',
                borderRadius: '10px',
                maxWidth: '400px',
                color: 'white',
                textAlign: 'center',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
                border: '1px solid rgba(100, 150, 255, 0.3)'
            }}>
                <h2 style={{ marginBottom: '1rem' }}>✨ Enhance Your Reading</h2>
                <p style={{ marginBottom: '2rem', lineHeight: '1.6', color: '#d0d0ff' }}>
                    As your oracle, I can enhance your reading with astrology. If you would like, please enter your birth date, and optional time and place of birth.
                </p>
                <div style={{
                    display: 'flex',
                    gap: '1rem',
                    flexDirection: 'column'
                }}>
                    <button
                        onClick={onYes}
                        style={{
                            padding: '0.75rem',
                            borderRadius: '5px',
                            border: 'none',
                            backgroundColor: '#7c63d8',
                            color: 'white',
                            cursor: 'pointer',
                            fontWeight: 'bold'
                        }}
                    >
                        Yes, Enter My Birth Info
                    </button>
                    <button
                        onClick={onNo}
                        style={{
                            padding: '0.75rem',
                            borderRadius: '5px',
                            border: '1px solid #7c63d8',
                            backgroundColor: 'transparent',
                            color: '#7c63d8',
                            cursor: 'pointer',
                            fontWeight: 'bold'
                        }}
                    >
                        No, Exit
                    </button>
                </div>
            </div>
        </div>
    );
}
