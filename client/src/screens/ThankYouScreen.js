import React from 'react';

export function ThankYouScreen({ onCreateAccount, onContinue, onExit }) {
    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            padding: '2rem'
        }}>
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
                <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>✨ Complete Your Onboarding</h1>
                <p style={{ fontSize: '0.95rem', lineHeight: '1.6', color: '#d0d0ff', marginBottom: '2rem' }}>
                    Thank you for exploring with our oracle. To save your readings and continue your spiritual journey, please complete your onboarding.
                </p>
                <div style={{
                    display: 'flex',
                    gap: '1rem',
                    flexDirection: 'column'
                }}>
                    <button
                        onClick={onCreateAccount}
                        style={{
                            padding: '0.75rem 1.5rem',
                            borderRadius: '5px',
                            border: 'none',
                            backgroundColor: '#7c63d8',
                            color: 'white',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            fontSize: '1rem'
                        }}
                    >
                        📝 Set Up an Account
                    </button>

                    {onExit && (
                        <button
                            onClick={onExit}
                            style={{
                                padding: '0.75rem 1.5rem',
                                borderRadius: '5px',
                                border: '1px solid #999',
                                backgroundColor: 'transparent',
                                color: '#999',
                                cursor: 'pointer',
                                fontWeight: 'bold',
                                fontSize: '1rem'
                            }}
                        >
                            ❌ Exit
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
