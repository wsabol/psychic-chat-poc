import { useState, useEffect, useCallback, useRef } from "react";
import { fetchWithTokenRefresh } from "../utils/fetchWithTokenRefresh.js";
import { useSSE } from "./useSSE.js";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3000";

export function useChat(userId, token, isAuthenticated, authUserId, isTemporaryAccount = false) {
    const [chat, setChat] = useState([]);
    const [message, setMessage] = useState("");
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState(null);
    const previousUserIdRef = useRef(null);
    
    const loadMessages = useCallback(async () => {
        try {
            if (!userId) return [];
            
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
    }, [userId, token, isTemporaryAccount]);
    
    
    const requestOpening = useCallback(async () => {
        try {
            if (!userId) return;
            
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
            
            if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
            await res.json();
        } catch (err) {
            // Opening request failed, continue silently
        }
    }, [userId, token, isTemporaryAccount]);
    
    // SSE notification handler
    const handleSSEMessage = useCallback(async (data) => {
        // New message ready - load messages
        await loadMessages();
    }, [loadMessages]);
    
    // Initialize SSE connection for real-time notifications
    useSSE(userId, token, isAuthenticated, handleSSEMessage);
    
    const sendMessage = useCallback(async () => {
        if (!message.trim()) return;
        setChat(prevChat => [...prevChat, { id: Date.now(), role: "user", content: message }]);
        try {
            let url, headers, body, res;
            
            // Use different endpoints for temp users vs authenticated users
            if (isTemporaryAccount) {
                // Temp users: no authentication, different endpoint
                url = `${API_URL}/free-trial-chat/send`;
                headers = { "Content-Type": "application/json" };
                body = JSON.stringify({ tempUserId: userId, message });
                res = await fetch(url, {
                    method: "POST",
                    headers,
                    body
                });
            } else {
                // Authenticated users: use token
                headers = { "Content-Type": "application/json", "Authorization": `Bearer ${token}` };
                body = JSON.stringify({ userId, message });
                res = await fetchWithTokenRefresh(`${API_URL}/chat`, {
                    method: "POST",
                    headers,
                    body
                });
            }
            
            if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
            
            // SSE will notify when response is ready - no polling needed
        } catch (err) {
            setError(err.message);
        }
        setMessage("");
    }, [message, userId, token, isTemporaryAccount]);

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
        if (isTemporaryAccount && userId) {
            if (previousUserIdRef.current !== userId) {
                previousUserIdRef.current = userId;
                
                setChat([]);
                setLoaded(false);
                
                setTimeout(() => {
                    loadMessages();
                    requestOpening();
                }, 500);
            }
        }
    }, [authUserId, isAuthenticated, token, isTemporaryAccount, userId, loadMessages, requestOpening]);

    // Fallback polling every 10 seconds (in case SSE fails)
    // Works for both authenticated users AND temporary free trial users
    useEffect(() => {
        // For authenticated users: need token
        // For temp users: no token needed
        if (isTemporaryAccount && userId) {
            const interval = setInterval(loadMessages, 10000); // 10 seconds
            return () => clearInterval(interval);
        } else if (isAuthenticated && authUserId && token) {
            const interval = setInterval(loadMessages, 10000); // 10 seconds
            return () => clearInterval(interval);
        }
    }, [loadMessages, isAuthenticated, authUserId, token, isTemporaryAccount, userId]);

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
