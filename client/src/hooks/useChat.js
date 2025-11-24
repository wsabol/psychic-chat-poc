import { useState, useEffect, useCallback } from "react";
import { fetchWithTokenRefresh } from "../utils/fetchWithTokenRefresh.js";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3000";

export function useChat(userId, token, isAuthenticated, authUserId) {
    const [chat, setChat] = useState([]);
    const [message, setMessage] = useState("");
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState(null);
    
    const loadMessages = useCallback(async () => {
        try {
            if (!token || !userId) return [];
            const headers = { "Authorization": `Bearer ${token}` };
            const url = `${API_URL}/chat/history/${userId}`;
            const res = await fetchWithTokenRefresh(url, { headers });
            if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
            const data = await res.json();
            setChat(Array.isArray(data) ? data : []);
            setLoaded(true);
            setError(null);
            return data;
        } catch (err) {
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
            await loadMessages();
        } catch (err) {
            // Opening request failed, continue silently
        }
    }, [userId, token, loadMessages]);
    
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

    // Load messages on mount or userId change
    useEffect(() => {
        if (isAuthenticated && authUserId && token) {
            loadMessages().then(() => requestOpening());
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
