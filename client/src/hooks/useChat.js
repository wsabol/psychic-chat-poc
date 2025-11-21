import { useState, useEffect, useCallback } from "react";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3000";

export function useChat(userId, token, isAuthenticated, authUserId) {
    const [chat, setChat] = useState([]);
    const [message, setMessage] = useState("");
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState(null);
    
    const loadMessages = useCallback(async () => {
        try {
            const headers = token ? { "Authorization": `Bearer ${token}` } : {};
            const res = await fetch(`${API_URL}/chat/history/${userId}`, { headers });
            if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
            const data = await res.json();
            setChat(data);
            setLoaded(true);
            setError(null);
            return data;
        } catch (err) {
            console.error('Error loading messages:', err);
            if (isAuthenticated && authUserId) {
                setError(err.message);
            }
            return [];
        }
    }, [userId, token, isAuthenticated, authUserId]);
    
    const requestOpening = useCallback(async () => {
        try {
            const headers = token ? { "Authorization": `Bearer ${token}` } : {};
            const res = await fetch(`${API_URL}/chat/opening/${userId}`, { headers });
            if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
            await res.json();
            // Greeting is now saved, reload messages to display it
            await loadMessages();
        } catch (err) {
            console.error('Error requesting opening:', err);
        }
    }, [userId, token, loadMessages]);
    
    const sendMessage = useCallback(async () => {
        if (!message.trim()) return;
        setChat(prevChat => [...prevChat, { id: Date.now(), role: "user", content: message }]);
        try {
            const headers = {
                "Content-Type": "application/json",
            };
            if (token) {
                headers["Authorization"] = `Bearer ${token}`;
            }
            await fetch(`${API_URL}/chat`, {
                method: "POST",
                headers,
                body: JSON.stringify({ userId, message }),
            });
            await loadMessages();
        } catch (err) {
            setError(err.message);
        }
        setMessage("");
    }, [message, userId, token, loadMessages]);

    // Load messages on mount or userId change
    useEffect(() => {
        if (isAuthenticated && authUserId) {
            loadMessages().then(data => {
                // Always request opening greeting on mount
                    requestOpening();
            });
        }
    }, [authUserId, isAuthenticated, loadMessages, requestOpening]);

    // Poll for new messages every 2 seconds (per project instructions)
    useEffect(() => {
        if (!isAuthenticated || !authUserId) return;
        const interval = setInterval(loadMessages, 2000);
        return () => clearInterval(interval);
    }, [loadMessages, isAuthenticated, authUserId]);

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

