import { useEffect, useRef, useCallback } from 'react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

/**
 * Custom hook for Server-Sent Events (SSE) connection
 * Maintains a persistent connection to receive real-time notifications
 * 
 * @param {string} userId - User ID to subscribe to
 * @param {string} token - Authentication token
 * @param {boolean} isAuthenticated - Whether user is authenticated
 * @param {Function} onMessage - Callback when message is received
 * @returns {object} Connection status and reconnect function
 */
export function useSSE(userId, token, isAuthenticated, onMessage) {
    const eventSourceRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);
    const reconnectAttemptsRef = useRef(0);
    const maxReconnectAttempts = 5;
    const baseReconnectDelay = 1000; // 1 second
    
    const connect = useCallback(() => {
        if (!userId || !token || !isAuthenticated) {
            return;
        }
        
        // Clean up existing connection
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
        }
        
        try {
            // Create SSE connection with auth header
            // Note: EventSource doesn't support custom headers in standard browsers
            // We pass token as query parameter (secure over HTTPS)
            const url = `${API_URL}/events/${userId}?token=${encodeURIComponent(token)}`;
            console.log('[SSE] Attempting to connect to:', url.replace(/token=[^&]+/, 'token=***'));
            
            const eventSource = new EventSource(url);
            
            eventSource.onopen = () => {
                console.log('[SSE] Connected to notification stream');
                reconnectAttemptsRef.current = 0; // Reset on successful connection
            };
            
            eventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    
                    if (data.type === 'connected') {
                        console.log('[SSE] Connection confirmed:', data.timestamp);
                    } else if (data.type === 'message_ready') {
                        console.log('[SSE] Message ready notification received');
                        if (onMessage) {
                            onMessage(data);
                        }
                    }
                } catch (err) {
                    console.error('[SSE] Error parsing event:', err);
                }
            };
            
            eventSource.onerror = (error) => {
                console.error('[SSE] Connection error:', error);
                console.error('[SSE] EventSource readyState:', eventSource.readyState);
                console.error('[SSE] EventSource URL:', eventSource.url);
                eventSource.close();
                
                // Attempt to reconnect with exponential backoff
                if (reconnectAttemptsRef.current < maxReconnectAttempts) {
                    const delay = baseReconnectDelay * Math.pow(2, reconnectAttemptsRef.current);
                    console.log(`[SSE] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts})`);
                    
                    reconnectTimeoutRef.current = setTimeout(() => {
                        reconnectAttemptsRef.current++;
                        connect();
                    }, delay);
                } else {
                    console.error('[SSE] Max reconnect attempts reached. Falling back to polling.');
                }
            };
            
            eventSourceRef.current = eventSource;
        } catch (err) {
            console.error('[SSE] Error creating connection:', err);
        }
    }, [userId, token, isAuthenticated, onMessage]);
    
    const disconnect = useCallback(() => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
        }
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
        }
    }, []);
    
    // Connect on mount and when dependencies change
    useEffect(() => {
        if (userId && token && isAuthenticated) {
            connect();
        }
        
        return () => {
            disconnect();
        };
    }, [userId, token, isAuthenticated, connect, disconnect]);
    
    return {
        reconnect: connect,
        disconnect,
        isConnected: eventSourceRef.current !== null && eventSourceRef.current.readyState === EventSource.OPEN
    };
}
