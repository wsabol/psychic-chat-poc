import React from 'react';

export default function OnboardingModal({ show, isTemporary, onSetupAccount, onExit, onboardingData = {} }) {
    if (!show || !isTemporary) return null;

    const handleSetupClick = () => {
        // Pass onboarding data to the setup handler
        if (onSetupAccount) {
            onSetupAccount(onboardingData);
        }
    };

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
                maxWidth: '450px',
                color: 'white',
                textAlign: 'center',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
                border: '1px solid rgba(100, 150, 255, 0.3)'
            }}>
                <h2 style={{ marginBottom: '1rem' }}>✨ Complete Your Onboarding</h2>
                <p style={{ marginBottom: '2rem', lineHeight: '1.6', color: '#d0d0ff', fontSize: '0.95rem' }}>
                    Thank you for exploring with our oracle. To save your readings and continue your spiritual journey, please complete your onboarding.
                </p>
                <div style={{
                    display: 'flex',
                    gap: '1rem',
                    flexDirection: 'column'
                }}>
                    <button
                        onClick={handleSetupClick}
                        style={{
                            padding: '0.75rem',
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
                    <button
                        onClick={onExit}
                        style={{
                            padding: '0.75rem',
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
                </div>
            </div>
        </div>
    );
}
