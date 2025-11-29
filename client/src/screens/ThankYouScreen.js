import React from 'react';
import StarField from '../components/StarField';

export function ThankYouScreen({ onCreateAccount }) {
    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            padding: '2rem'
        }}>
            <StarField />
            <div style={{
                backgroundColor: 'rgba(30, 30, 60, 0.95)',
                padding: '3rem',
                borderRadius: '12px',
                maxWidth: '500px',
                color: 'white',
                textAlign: 'center',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
                border: '1px solid rgba(100, 150, 255, 0.3)',
                position: 'relative',
                zIndex: 10
            }}>
                <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>✨ Thank You ✨</h1>
                <p style={{ fontSize: '1.1rem', lineHeight: '1.8', color: '#d0d0ff', marginBottom: '2rem' }}>
                    Thank you for visiting the Oracle. Your free trial session has ended.
                </p>
                <p style={{ fontSize: '1rem', color: '#aaa', marginBottom: '2rem' }}>
                    To continue your spiritual journey and access unlimited readings, please create an account.
                </p>
                <button
                    onClick={onCreateAccount}
                    style={{
                        padding: '0.75rem 1.5rem',
                        borderRadius: '5px',
                        border: '1px solid #7c63d8',
                        backgroundColor: '#7c63d8',
                        color: 'white',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        fontSize: '1rem'
                    }}
                >
                    Create Account Now
                </button>
                <p style={{ fontSize: '0.9rem', color: '#666', marginTop: '2rem' }}>
                    Refresh the page to start a new trial session.
                </p>
            </div>
        </div>
    );
}
