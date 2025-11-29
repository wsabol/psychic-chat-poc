import { useState, useCallback } from 'react';
import { sendEmailVerification } from 'firebase/auth';

/**
 * Manages email verification for email/password accounts
 * Handles sending verification emails and checking status
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
            console.log('[EMAIL-VERIFY] Verification email sent to', user.email);
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
            // Reload user to get latest verification status
            await user.reload();
            const verified = user.emailVerified;
            setIsVerified(verified);
            
            if (verified) {
                console.log('[EMAIL-VERIFY] Email verified for', user.email);
            }
            return verified;
        } catch (err) {
            console.error('[EMAIL-VERIFY] Error checking verification:', err.message);
            return false;
        }
    }, []);

    // Poll for verification (user clicks link in email)
    const startVerificationPolling = useCallback((user, maxAttempts = 40) => {
        setCheckCount(0);
        let attemptCount = 0;
        
        const pollInterval = setInterval(async () => {
            attemptCount++;
            setCheckCount(attemptCount);
            const verified = await checkEmailVerification(user);
            
            if (verified) {
                clearInterval(pollInterval);
                setIsVerified(true);
                console.log('[EMAIL-VERIFY] Verification detected!');
                return;
            }
            
            if (attemptCount >= maxAttempts) {
                clearInterval(pollInterval);
                console.log('[EMAIL-VERIFY] Verification polling stopped after', attemptCount, 'attempts');
            }
        }, 3000); // Check every 3 seconds

        return () => clearInterval(pollInterval);
    }, [checkEmailVerification]);

    // Resend verification email
    const resendVerificationEmail = useCallback(async (user) => {
        setLoading(true);
        setError(null);
        try {
            await sendEmailVerification(user);
            console.log('[EMAIL-VERIFY] Verification email resent to', user.email);
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
