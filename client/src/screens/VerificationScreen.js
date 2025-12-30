import React, { useState, useEffect } from 'react';
import { useTranslation } from '../context/TranslationContext';

/**
 * Email verification screen shown after sign-up
 * Three strikes logic: After 3 resends or timeout, redirect to Thank You screen
 * Now includes Sign Out button to try different email
 */
export function VerificationScreen({
    userEmail,
    onVerified,
    onResendEmail,
    isLoading,
    error,
    resendLoading,
    checkCount = 0,
    onVerificationFailed,
        onSignOut,
}) {
    const { t } = useTranslation();
    const [showResendMessage, setShowResendMessage] = useState(false);
    const [resendCount, setResendCount] = useState(0);
    const MAX_CHECKS = 40; // ~2 minutes at 3 second intervals
    const STRONG_MESSAGE_THRESHOLD = 30; // After ~1.5 minutes
    const MAX_RESENDS = 3; // Three strikes
    const [failureTimeout, setFailureTimeout] = useState(false);

    // Track if max attempts reached
    useEffect(() => {
        if (checkCount >= MAX_CHECKS) {
            setFailureTimeout(true);
            // After 3 seconds, call the failure handler
            const timer = setTimeout(() => {
                if (onVerificationFailed) {
                    onVerificationFailed();
                }
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [checkCount, onVerificationFailed]);

    const handleResend = async () => {
        if (resendCount >= MAX_RESENDS) {
            // Three strikes - fail
            if (onVerificationFailed) {
                onVerificationFailed();
            }
            return;
        }

        const success = await onResendEmail();
        if (success) {
            setResendCount(prev => prev + 1);
            setShowResendMessage(true);
            setTimeout(() => setShowResendMessage(false), 3000);
        }
    };

    const isStrongMessageMode = checkCount >= STRONG_MESSAGE_THRESHOLD;
    const strikesRemaining = MAX_RESENDS - resendCount;

    if (failureTimeout) {
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
                                        <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>{t('verification.errors.tooManyAttempts')}</h1>
                    <p style={{
                        fontSize: '1rem',
                        lineHeight: '1.8',
                        color: '#ff9999',
                        marginBottom: '2rem'
                    }}>
                        {t('errors.sessionExpired')}
                    </p>
                    <p style={{
                        fontSize: '0.9rem',
                        color: '#aaa',
                        marginBottom: '1rem'
                    }}>
                        Redirecting...
                    </p>
                </div>
            </div>
        );
    }

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
                <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>✉️ {t('verification.title')}</h1>

                {isStrongMessageMode ? (
                    <>
                        <p style={{
                            fontSize: '1rem',
                            lineHeight: '1.8',
                            color: '#ffd699',
                            marginBottom: '1.5rem'
                        }}>
                            {t('verification.message', { email: userEmail })}
                        </p>

                        <div style={{
                            backgroundColor: 'rgba(100, 100, 150, 0.3)',
                            padding: '1rem',
                            borderRadius: '8px',
                            marginBottom: '2rem',
                            border: '1px solid rgba(100, 150, 255, 0.3)'
                        }}>
                            <p style={{ margin: 0, fontSize: '0.95rem', wordBreak: 'break-all', color: '#fff' }}>
                                {userEmail}
                            </p>
                        </div>

                        <p style={{
                            fontSize: '0.95rem',
                            color: '#aaa',
                            marginBottom: '2rem',
                            lineHeight: '1.6'
                        }}>
                            {t('verification.checkInbox')} - {strikesRemaining} attempt{strikesRemaining === 1 ? '' : 's'} remaining.
                        </p>
                    </>
                ) : (
                    <>
                        <p style={{
                            fontSize: '1rem',
                            lineHeight: '1.8',
                            color: '#d0d0ff',
                            marginBottom: '1.5rem'
                        }}>
                            {t('verification.message', { email: userEmail })}
                        </p>

                        <div style={{
                            backgroundColor: 'rgba(100, 100, 150, 0.3)',
                            padding: '1rem',
                            borderRadius: '8px',
                            marginBottom: '2rem',
                            border: '1px solid rgba(100, 150, 255, 0.3)'
                        }}>
                            <p style={{ margin: 0, fontSize: '0.95rem', wordBreak: 'break-all', color: '#fff' }}>
                                {userEmail}
                            </p>
                        </div>

                        <p style={{
                            fontSize: '0.95rem',
                            color: '#aaa',
                            marginBottom: '1.5rem',
                            lineHeight: '1.6'
                        }}>
                                                        {t('verification.checkInbox')}
                        </p>
                        <p style={{
                            fontSize: '0.85rem',
                            color: '#ffd699',
                            marginBottom: '2rem',
                            lineHeight: '1.6',
                            fontStyle: 'italic'
                        }}>
                            💡 {t('verification.checkInbox')}
                        </p>
                    </>
                )}

                <button
                    onClick={handleResend}
                    disabled={resendLoading || resendCount >= MAX_RESENDS}
                    style={{
                        padding: '0.75rem 2rem',
                        borderRadius: '5px',
                        border: '1px solid #7c63d8',
                        backgroundColor: resendCount >= MAX_RESENDS ? '#555' : '#7c63d8',
                        color: 'white',
                        cursor: (resendLoading || resendCount >= MAX_RESENDS) ? 'not-allowed' : 'pointer',
                        fontWeight: 'bold',
                        fontSize: '1rem',
                        opacity: (resendLoading || resendCount >= MAX_RESENDS) ? 0.6 : 1,
                        marginBottom: '1rem',
                        width: '100%'
                    }}
                >
                    {resendCount >= MAX_RESENDS ? t('verification.errors.tooManyAttempts') : resendLoading ? t('common.loading') : t('verification.resendCode')}
                </button>

                {showResendMessage && (
                    <div style={{
                        backgroundColor: 'rgba(50, 150, 100, 0.2)',
                        padding: '0.75rem',
                        borderRadius: '8px',
                        border: '1px solid #5cd65c',
                        color: '#7cfc7c',
                        fontSize: '0.9rem',
                        marginBottom: '1rem'
                    }}>
                        ✓ {t('verification.resendSent')} - Attempt {resendCount} of {MAX_RESENDS}
                    </div>
                )}

                {resendCount > 0 && resendCount < MAX_RESENDS && (
                    <p style={{
                        fontSize: '0.85rem',
                        color: '#ffd699',
                        margin: '1rem 0 0 0'
                    }}>
                        {strikesRemaining} attempt{strikesRemaining === 1 ? '' : 's'} remaining
                    </p>
                )}

                {resendCount >= MAX_RESENDS && (
                    <p style={{
                        fontSize: '0.85rem',
                        color: '#ff6b6b',
                        margin: '1rem 0 0 0',
                        fontWeight: 'bold'
                    }}>
                        ✗ {t('verification.errors.tooManyAttempts')}
                    </p>
                )}

                <p style={{
                    fontSize: '0.85rem',
                    color: '#666',
                    margin: '2rem 0 0 0',
                    marginBottom: '2rem'
                }}>
                    ⏱️ {t('verification.checkInbox')}
                </p>

                {/* Sign Out Button */}
                <button
                    onClick={onSignOut}
                    style={{
                        padding: '0.75rem 2rem',
                        borderRadius: '5px',
                        border: '1px solid #999',
                        backgroundColor: 'transparent',
                        color: '#999',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        fontSize: '1rem',
                        width: '100%',
                        marginBottom: '1rem'
                    }}
                >
                    {t('verification.actions.signOut')}
                </button>

                {error && (
                    <div style={{
                        backgroundColor: 'rgba(220, 50, 50, 0.2)',
                        padding: '1rem',
                        borderRadius: '8px',
                        marginTop: '1rem',
                        border: '1px solid #dc3232',
                        color: '#ff6b6b'
                    }}>
                        {error}
                    </div>
                )}
            </div>
        </div>
    );
}
