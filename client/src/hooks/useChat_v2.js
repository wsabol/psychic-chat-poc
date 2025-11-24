import { useState, useEffect, useCallback } from "react";
import { fetchWithTokenRefresh } from "../utils/fetchWithTokenRefresh.js";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3000";
console.log('[useChat] API_URL:', API_URL);

export function useChat(userId, token, isAuthenticated, authUserId) {
    const [chat, setChat] = useState([]);
    const [message, setMessage] = useState("");
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState(null);
    
    const loadMessages = useCallback(async () => {
        try {
            if (!token) {
                console.log('[useChat] Skipping load - no token');
                return [];
            }
            if (!userId) {
                console.log('[useChat] Skipping load - no userId');
                return [];
            }
            
            const headers = { "Authorization": `Bearer ${token}` };
            const url = `${API_URL}/chat/history/${userId}`;
            console.log('[useChat] Loading messages from:', url);
            
            const res = await fetchWithTokenRefresh(url, { headers });
            console.log('[useChat] Response status:', res.status);
            
            if (!res.ok) {
                throw new Error(`HTTP error! Status: ${res.status}`);
            }
            
            const data = await res.json();
            console.log('[useChat] Loaded', Array.isArray(data) ? data.length : 'invalid', 'messages');
            setChat(Array.isArray(data) ? data : []);
            setLoaded(true);
            setError(null);
            return data;
        } catch (err) {
            console.error('[useChat] Error loading messages:', err);
            setError(err.message);
            return [];
        }
    }, [userId, token]);
    
    const requestOpening = useCallback(async () => {
        try {
            if (!token || !userId) return;
            
            const headers = { "Authorization": `Bearer ${token}` };
            const url = `${API_URL}/chat/opening/${userId}`;
            console.log('[useChat] Requesting opening from:', url);
            
            const res = await fetchWithTokenRefresh(url, { headers });
            console.log('[useChat] Opening response status:', res.status);
            
            if (!res.ok) {
                throw new Error(`HTTP error! Status: ${res.status}`);
            }
            
            await res.json();
            console.log('[useChat] Opening greeting created');
            // Greeting is now saved, reload messages to display it
            await loadMessages();
        } catch (err) {
            console.error('[useChat] Error requesting opening:', err);
        }
    }, [userId, token, loadMessages]);
    
    const sendMessage = useCallback(async () => {
        if (!message.trim()) return;
        
        setChat(prevChat => [...prevChat, { id: Date.now(), role: "user", content: message }]);
        try {
            const headers = {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            };
            const url = `${API_URL}/chat`;
            console.log('[useChat] Sending message to:', url);
            
            const res = await fetchWithTokenRefresh(url, {
                method: "POST",
                headers,
                body: JSON.stringify({ userId, message }),
            });
            console.log('[useChat] Send response status:', res.status);
            
            if (!res.ok) {
                throw new Error(`HTTP error! Status: ${res.status}`);
            }
            
            await loadMessages();
        } catch (err) {
            console.error('[useChat] Error sending message:', err);
            setError(err.message);
        }
        setMessage("");
    }, [message, userId, token, loadMessages]);

    // Load messages on mount or userId change
    useEffect(() => {
        console.log('[useChat] Mount effect - isAuthenticated:', isAuthenticated, 'authUserId:', authUserId);
        if (isAuthenticated && authUserId && token) {
            console.log('[useChat] Loading initial messages');
            loadMessages().then(data => {
                console.log('[useChat] Initial load complete, requesting opening');
                requestOpening();
            });
        }
    }, [authUserId, isAuthenticated, token, loadMessages, requestOpening]);

    // Poll for new messages every 2 seconds
    useEffect(() => {
        if (!isAuthenticated || !authUserId || !token) {
            console.log('[useChat] Skipping polling - missing auth data');
            return;
        }
        
        console.log('[useChat] Starting polling');
        const interval = setInterval(() => {
            console.log('[useChat] Polling...');
            loadMessages();
        }, 2000);
        
        return () => {
            clearInterval(interval);
            console.log('[useChat] Polling stopped');
        };
    }, [loadMessages, isAuthenticated, authUserId, token]);

    return {
        chat,
        setChat,
        message,
        setMessage,
        loaded,
        error,
        sendMessage,
        loadMessages,
    };
}
