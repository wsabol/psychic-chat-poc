import { useState, useEffect } from "react";

export function useAuth() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [token, setToken] = useState(null);
    const [refreshToken, setRefreshToken] = useState(null);
    const [authUserId, setAuthUserId] = useState(null);
    const [authEmail, setAuthEmail] = useState(null);
    const [showLoginRegister, setShowLoginRegister] = useState(false);
    const [showTwoFactor, setShowTwoFactor] = useState(false);
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [showEmailVerification, setShowEmailVerification] = useState(false);
    const [tempToken, setTempToken] = useState(null);
    const [tempUserId, setTempUserId] = useState(null);
    const [twoFactorMethod, setTwoFactorMethod] = useState("sms");
    const [error, setError] = useState(null);
    
    // On mount: retrieve from localStorage
    useEffect(() => {
        const storedToken = localStorage.getItem("token");
        const storedRefreshToken = localStorage.getItem("refreshToken");
        const storedUserId = localStorage.getItem("userId");
        const storedAuthEmail = localStorage.getItem("authEmail");
        
        if (storedToken && storedUserId) {
            setToken(storedToken);
            setRefreshToken(storedRefreshToken);
            setAuthUserId(storedUserId);
            setAuthEmail(storedAuthEmail);
            setIsAuthenticated(true);
        } else {
            setShowLoginRegister(true);
        }
    }, []);
    
    // Handle successful login
    const handleLoginSuccess = (result) => {
        if (result.type === "2fa") {
            // 2FA required - show 2FA modal
            setTempToken(result.tempToken);
            setTempUserId(result.userId);
            setTwoFactorMethod(result.method || "sms");
            setShowLoginRegister(false);
            setShowTwoFactor(true);
        } else if (result.type === "success") {
            // Direct login success (2FA disabled)
            setToken(result.token);
            setRefreshToken(result.refreshToken);
            setAuthUserId(result.userId);
            setAuthEmail(result.email);
            setIsAuthenticated(true);
            
            localStorage.setItem("token", result.token);
            if (result.refreshToken) {
                localStorage.setItem("refreshToken", result.refreshToken);
            }
            localStorage.setItem("userId", result.userId);
            localStorage.setItem("authEmail", result.email);
            
            setShowLoginRegister(false);
            setError(null);
        } else if (result.type === "emailVerification") {
            // Registration successful - show email verification
            setTempUserId(result.userId);
            setShowLoginRegister(false);
            setShowEmailVerification(true);
        } else if (result.type === "forgotPassword") {
            // Show forgot password modal instead
            setShowLoginRegister(false);
            setShowForgotPassword(true);
        }
    };
    
    // Handle 2FA verification success
    const handle2FASuccess = (result) => {
        setToken(result.token);
        setRefreshToken(result.refreshToken);
        setAuthUserId(result.userId);
        setAuthEmail(result.email);
        setIsAuthenticated(true);
        
        localStorage.setItem("token", result.token);
        if (result.refreshToken) {
            localStorage.setItem("refreshToken", result.refreshToken);
        }
        localStorage.setItem("userId", result.userId);
        localStorage.setItem("authEmail", result.email);
        
        setShowTwoFactor(false);
        setTempToken(null);
        setTempUserId(null);
        setError(null);
    };
    
    // Handle email verification success
    const handleEmailVerificationSuccess = () => {
        setShowEmailVerification(false);
        setShowLoginRegister(true);
        setError(null);
    };
    
    // Handle password reset success
    const handlePasswordResetSuccess = () => {
        setShowForgotPassword(false);
        setShowLoginRegister(true);
        setError(null);
    };
    
    // Handle logout
    const handleLogout = () => {
        setIsAuthenticated(false);
        setToken(null);
        setRefreshToken(null);
        setAuthUserId(null);
        setAuthEmail(null);
        
        localStorage.removeItem("token");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("userId");
        localStorage.removeItem("authEmail");
        
        setShowLoginRegister(true);
        setError(null);
    };
    
    return {
        isAuthenticated,
        token,
        refreshToken,
        authUserId,
        authEmail,
        showLoginRegister,
        setShowLoginRegister,
        showTwoFactor,
        setShowTwoFactor,
        showForgotPassword,
        setShowForgotPassword,
        showEmailVerification,
        setShowEmailVerification,
        tempToken,
        tempUserId,
        twoFactorMethod,
        error,
        setError,
        handleLoginSuccess,
        handle2FASuccess,
        handleEmailVerificationSuccess,
        handlePasswordResetSuccess,
        handleLogout,
    };
}