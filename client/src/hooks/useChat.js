import { useState, useEffect, useCallback, useRef } from "react";
import { fetchWithTokenRefresh } from "../utils/fetchWithTokenRefresh.js";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3000";

export function useChat(userId, token, isAuthenticated, authUserId) {
    const [chat, setChat] = useState([]);
    const [message, setMessage] = useState("");
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState(null);
    const previousUserIdRef = useRef(null);
    
    const loadMessages = useCallback(async () => {
        try {
            if (!token || !userId) return [];
            const headers = { "Authorization": `Bearer ${token}` };
            const url = `${API_URL}/chat/history/${userId}`;
            console.log('[CHAT] Loading messages for user:', userId);
            const res = await fetchWithTokenRefresh(url, { headers });
            if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
            const data = await res.json();
            console.log('[CHAT] ✓ Loaded', data.length, 'messages');
            setChat(Array.isArray(data) ? data : []);
            setLoaded(true);
            setError(null);
            return data;
        } catch (err) {
            console.error('[CHAT] Error loading messages:', err.message);
            setError(err.message);
            return [];
        }
    }, [userId, token]);
    
    const requestOpening = useCallback(async () => {
        try {
            if (!token || !userId) return;
            const headers = { "Authorization": `Bearer ${token}` };
            const url = `${API_URL}/chat/opening/${userId}`;
            const res = await fetchWithTokenRefresh(url, { headers });
            if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
            await res.json();
        } catch (err) {
            // Opening request failed, continue silently
        }
    }, [userId, token]);
    
    const sendMessage = useCallback(async () => {
        if (!message.trim()) return;
        setChat(prevChat => [...prevChat, { id: Date.now(), role: "user", content: message }]);
        try {
            const headers = { "Content-Type": "application/json", "Authorization": `Bearer ${token}` };
            const res = await fetchWithTokenRefresh(`${API_URL}/chat`, {
                method: "POST",
                headers,
                body: JSON.stringify({ userId, message }),
            });
            if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
            await loadMessages();
        } catch (err) {
            setError(err.message);
        }
        setMessage("");
    }, [message, userId, token, loadMessages]);

    // Load messages and request opening when user changes
    useEffect(() => {
        if (isAuthenticated && authUserId && token) {
            if (previousUserIdRef.current !== authUserId) {
                console.log('[CHAT] User changed from', previousUserIdRef.current, 'to', authUserId, '- refetching messages');
                previousUserIdRef.current = authUserId;
                
                setChat([]);
                setLoaded(false);
                
                setTimeout(() => {
                    loadMessages();
                    requestOpening();
                }, 500);
            }
        }
    }, [authUserId, isAuthenticated, token, loadMessages, requestOpening]);

    // Poll for new messages every 2 seconds
    useEffect(() => {
        if (!isAuthenticated || !authUserId || !token) return;
        const interval = setInterval(loadMessages, 2000);
        return () => clearInterval(interval);
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
