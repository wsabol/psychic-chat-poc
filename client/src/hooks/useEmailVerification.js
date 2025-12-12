import { useState, useCallback } from 'react';
import { sendEmailVerification } from 'firebase/auth';

/**
 * Manages email verification for email/password accounts
 * Handles sending verification emails and checking status
 * FIXED: Now properly reloads user to detect verification changes
 */
export function useEmailVerification() {
    const [verificationSent, setVerificationSent] = useState(false);
    const [isVerified, setIsVerified] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [checkCount, setCheckCount] = useState(0);

    // Send verification email
    const sendVerificationEmailFunc = useCallback(async (user) => {
        setLoading(true);
        setError(null);
        try {
            await sendEmailVerification(user);
            setVerificationSent(true);
            return true;
        } catch (err) {
            console.error('[EMAIL-VERIFY] Failed to send verification email:', err.message);
            setError(err.message);
            return false;
        } finally {
            setLoading(false);
        }
    }, []);

    // Check if email is verified
    const checkEmailVerification = useCallback(async (user) => {
        try {
            // Reload user to get latest verification status from Firebase
            await user.reload();
            const verified = user.emailVerified;
            setIsVerified(verified);
            return verified;
        } catch (err) {
            console.error('[EMAIL-VERIFY] Error checking verification:', err.message);
            return false;
        }
    }, []);

    // Poll for verification (user clicks link in email)
    const startVerificationPolling = useCallback((user, maxAttempts = 40, onVerified = null) => {
        setCheckCount(0);
        let attemptCount = 0;
        
        const pollInterval = setInterval(async () => {
            attemptCount++;
            setCheckCount(attemptCount);
            
            try {
                // CRITICAL: Force reload to get latest Firebase status
                // Firebase email verification link doesn't trigger onAuthStateChanged
                await user.reload();
                const verified = user.emailVerified;
                setIsVerified(verified);
                
                if (verified) {
                    clearInterval(pollInterval);
                    setIsVerified(true);
                    try { await fetch('http://localhost:3000/auth/log-email-verified', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user.uid }) }); } catch (err) { console.warn('[AUDIT] Email verification logging skipped'); }
                    
                    // Call parent callback if provided (to update auth context)
                    if (onVerified) {
                        onVerified();
                    }
                    return;
                } 
            } catch (err) {
                console.error('[EMAIL-VERIFY-POLL] Error during polling:', err.message);
            }
            
            if (attemptCount >= maxAttempts) {
                clearInterval(pollInterval);
            }
        }, 3000); // Check every 3 seconds

        return () => {
            clearInterval(pollInterval);
        };
    }, []);

    // Resend verification email
    const resendVerificationEmail = useCallback(async (user) => {
        setLoading(true);
        setError(null);
        try {
            await sendEmailVerification(user);
            return true;
        } catch (err) {
            console.error('[EMAIL-VERIFY] Failed to resend verification:', err.message);
            setError(err.message);
            return false;
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        verificationSent,
        isVerified,
        setIsVerified,
        loading,
        error,
        checkCount,
        sendVerificationEmailFunc,
        checkEmailVerification,
        startVerificationPolling,
        resendVerificationEmail,
    };
}
