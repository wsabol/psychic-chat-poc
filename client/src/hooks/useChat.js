import { useState, useEffect, useCallback, useRef } from "react";
import { fetchWithTokenRefresh } from "../utils/fetchWithTokenRefresh.js";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3000";

export function useChat(userId, token, isAuthenticated, authUserId, isTemporaryAccount = false, sessionReady = true) {
    const [chat, setChat] = useState([]);
    const [message, setMessage] = useState("");
    const [loaded, setLoaded] = useState(false);
    const [loading, setLoading] = useState(false); // NEW: Loading state for message sending
    const [error, setError] = useState(null);
    const previousUserIdRef = useRef(null);
    const loadAttemptsRef = useRef(0);
    
    const loadMessages = useCallback(async () => {
        try {
            if (!userId) return [];
            
            // For temp accounts, wait for session to be ready
            if (isTemporaryAccount && !sessionReady) {
                return [];
            }
            
            let url, headers, res;
            
            // Use different endpoints for temp users vs authenticated users
            if (isTemporaryAccount) {
                // Temp users: no authentication, different endpoint
                url = `${API_URL}/free-trial-chat/history/${userId}`;
                res = await fetch(url);
            } else {
                // Authenticated users: use token
                if (!token) return [];
                headers = { "Authorization": `Bearer ${token}` };
                url = `${API_URL}/chat/history/${userId}`;
                res = await fetchWithTokenRefresh(url, { headers });
            }
            
            if (!res.ok) {
                // For temp accounts with 400 error, session might not exist yet
                if (isTemporaryAccount && res.status === 400) {
                    return [];
                }
                throw new Error(`HTTP error! Status: ${res.status}`);
            }
            const data = await res.json();
            setChat(Array.isArray(data) ? data : []);
            setLoaded(true);
            setError(null);
            loadAttemptsRef.current = 0; // Reset counter on success
            return data;
        } catch (err) {
            console.error('Load messages error:', err);
            setError(err.message);
            return [];
        }
    }, [userId, token, isTemporaryAccount, sessionReady]);
    
    
    const requestOpening = useCallback(async () => {
        try {
            if (!userId) return;
            
            // For temp accounts, wait for session to be ready
            if (isTemporaryAccount && !sessionReady) {
                return;
            }
            
            let url, headers, res;
            
            // Use different endpoints for temp users vs authenticated users
            if (isTemporaryAccount) {
                // Temp users: no authentication, different endpoint
                url = `${API_URL}/free-trial-chat/opening/${userId}`;
                res = await fetch(url);
            } else {
                // Authenticated users: use token
                if (!token) return;
                headers = { "Authorization": `Bearer ${token}` };
                url = `${API_URL}/chat/opening/${userId}`;
                res = await fetchWithTokenRefresh(url, { headers });
            }
            
            if (!res.ok) {
                // 204 No Content means opening already exists, just load messages
                if (res.status === 204) {
                    return;
                }
                // For temp accounts with 400 error, session might not exist yet
                if (isTemporaryAccount && res.status === 400) {
                    return;
                }
                throw new Error(`HTTP error! Status: ${res.status}`);
            }
            
            // Handle empty or invalid JSON responses gracefully
            try {
                const openingData = await res.json();
                
                // Add the opening message to chat immediately
                if (openingData && openingData.content) {
                    const openingMessage = {
                        id: Date.now(),
                        role: openingData.role || 'assistant',
                        content: openingData.content
                    };
                    setChat(prevChat => [openingMessage, ...prevChat]);
                }
            } catch (jsonError) {
                console.warn('Could not parse opening response as JSON:', jsonError.message);
                // Continue silently - opening is optional
            }
        } catch (err) {
            // Opening request failed, continue silently
            console.error('Request opening error:', err);
        }
    }, [userId, token, isTemporaryAccount, sessionReady]);
    
    const sendMessage = useCallback(async () => {
        if (!message.trim() || loading) return;
        
        // Add user message to chat immediately
        const userMessage = { id: Date.now(), role: "user", content: message };
        setChat(prevChat => [...prevChat, userMessage]);
        setMessage("");
        setLoading(true);
        
        try {
            let url, headers, body, res;
            
            // Use different endpoints for temp users vs authenticated users
            if (isTemporaryAccount) {
                // Temp users: synchronous endpoint
                url = `${API_URL}/free-trial-chat/send`;
                headers = { "Content-Type": "application/json" };
                body = JSON.stringify({ tempUserId: userId, message: message.trim() });
                res = await fetch(url, {
                    method: "POST",
                    headers,
                    body
                });
            } else {
                // Authenticated users: synchronous direct endpoint
                headers = { 
                    "Content-Type": "application/json", 
                    "Authorization": `Bearer ${token}` 
                };
                body = JSON.stringify({ message: message.trim() });
                res = await fetchWithTokenRefresh(`${API_URL}/chat-direct`, {
                    method: "POST",
                    headers,
                    body
                });
            }
            
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                
                // Handle specific error codes
                if (errorData.code === 'SESSION_NOT_FOUND') {
                    throw new Error('Session not ready. Please wait a moment and try again.');
                }
                if (errorData.code === 'TRIAL_COMPLETED') {
                    throw new Error('Your free trial is complete. Please sign up to continue chatting.');
                }
                
                throw new Error(errorData.error || `Failed to send message (${res.status})`);
            }
            
            // Get the assistant's response directly
            const responseData = await res.json();
            
            if (!responseData.success) {
                throw new Error(responseData.error || 'Failed to process message');
            }
            
            // Add assistant message to chat
            // Note: content might be an object or string
            const assistantMessage = {
                id: responseData.id || Date.now() + 1,
                role: responseData.role || "assistant",
                content: responseData.content,
                brief_content: responseData.contentBrief,
                cards: responseData.cards || null
            };
            
            setChat(prevChat => [...prevChat, assistantMessage]);
            setError(null);
            
        } catch (err) {
            console.error('Send message error:', err);
            setError(err.message);
            // Optionally: Remove the user message on error
            // setChat(prevChat => prevChat.filter(msg => msg.id !== userMessage.id));
        } finally {
            setLoading(false);
        }
    }, [message, userId, token, isTemporaryAccount, loading]);

    // Load messages and request opening when user changes
    useEffect(() => {
        // Handle authenticated users
        if (!isTemporaryAccount && isAuthenticated && authUserId && token) {
            if (previousUserIdRef.current !== authUserId) {
                previousUserIdRef.current = authUserId;
                
                setChat([]);
                setLoaded(false);
                
                setTimeout(() => {
                    loadMessages();
                    requestOpening();
                }, 500);
            }
        }
        
        // Handle temporary/free trial users (no token required)
        // Wait for session to be ready before loading
        if (isTemporaryAccount && userId && sessionReady) {
            if (previousUserIdRef.current !== userId) {
                previousUserIdRef.current = userId;
                
                setChat([]);
                setLoaded(false);
                
                // Give a bit more time for session creation to complete
                setTimeout(() => {
                    loadMessages();
                    requestOpening();
                }, 800);
            }
        }
    }, [authUserId, isAuthenticated, token, isTemporaryAccount, userId, sessionReady, loadMessages, requestOpening]);

    return {
        chat,
        setChat,
        message,
        setMessage,
        loaded,
        loading, // NEW: Expose loading state
        error,
        sendMessage,
        loadMessages,
    };
}
