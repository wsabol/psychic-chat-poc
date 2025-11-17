import React, { useCallback, useState, useEffect } from "react";
import CardDisplay from "./components/CardDisplay";
import Menu from "./components/Menu";
import StarField from "./components/StarField";

// Define ErrorBoundary component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log error for debugging
    console.error("Error in component:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ textAlign: 'center', color: 'red' }}>
          <h2>An error occurred.</h2>
          <p>{this.state.error && this.state.error.message}</p>
          <p>Please refresh the page or check the console for details.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

// Read API base URL from environment variable (Create React App expects REACT_APP_ prefix)
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3000";

function App() {
    const [userId, setUserId] = useState("user1");
    const [message, setMessage] = useState("");
    const [chat, setChat] = useState([]);  // Expect chat to include structured data like { text: '', cards: [] }
    const [loaded, setLoaded] = useState(false);
    const [gotOpening, setGotOpening] = useState(false);
    const [error, setError] = useState(null);
    const [menuOpen, setMenuOpen] = useState(false);
    
    const fetchOpening = useCallback(async function() {
        try {
            const res = await fetch(`${API_URL}/chat/opening/${userId}`);
            if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
            const data = await res.json();
            setChat([...chat, data]);
        } catch (err) {
            setError(err.message);
        }
    }, [chat, userId]);
    
    async function sendMessage() {
        if (!message.trim()) return;
        setChat([...chat, { id: Date.now(), role: "user", content: message }]);
        try {
            await fetch(`${API_URL}/chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId, message }),
            });
            await loadMessages();
        } catch (err) {
            setError(err.message);
        }
        setMessage("");
    }
    
    const loadMessages = useCallback(async function() {
        try {
            const res = await fetch(`${API_URL}/chat/history/${userId}`);
            if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
            const data = await res.json();
            setChat(data);
            setLoaded(true);
        } catch (err) {
            setError(err.message);
        }
    }, [userId]);
    
    useEffect(() => {
        const interval = setInterval(loadMessages, 2000);
        return () => {
            clearInterval(interval);  // Cleanup on unmount
        };
    }, [loadMessages]);
    
    useEffect(() => {
        async function fetchMessages() {
            try {
                const response = await fetch(`${API_URL}/chat/history/${userId}`);
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                const data = await response.json();
                setChat(data);
            } catch (error) {
                setError(error.message);
            }
        }
        fetchMessages();
    }, [userId]);
    
    useEffect(() => {
        if (loaded && !gotOpening) {
            setGotOpening(true);
            fetchOpening();
        }
    }, [loaded, gotOpening, fetchOpening]);
    
    useEffect(() => {}, []);  // Placeholder for removed logs
    
    return (
        <ErrorBoundary>
            <StarField />
            <div style={{ position: "relative" }}>
                <Menu menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
                <div style={{ maxWidth: 600, margin: "2rem auto", fontFamily: "sans-serif", textAlign: "center", position: "relative", zIndex: 10 }}>
                    {error && <p style={{ color: "red" }}>Error: {error}</p>}
                    {/* Display errors */}
                    <h2 style={{ textAlign: "center", color: "white", textShadow: "0 2px 4px rgba(0, 0, 0, 0.5)" }}>Chatbot Demo</h2>
                    <div>
                        <label style={{ color: "white", textShadow: "0 2px 4px rgba(0, 0, 0, 0.5)" }}>User ID: </label>
                        <input
                            value={userId}
                            onChange={(e) => setUserId(e.target.value)}
                            style={{ marginBottom: "1rem", marginLeft: "0.5rem", padding: "0.5rem" }}
                        />
                    </div>
                    <div
                        style={{
                            border: "1px solid #ccc",
                            borderRadius: "8px",
                            padding: "1rem",
                            height: "400px",
                            overflowY: "auto",
                            marginBottom: "1rem",
                            background: "rgba(255, 255, 255, 0.95)",
                            textAlign: "left",
                            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
                        }}
                    >
                        {chat.map((msg, index) => {
                            const key = msg.id || `msg-${index}-${Date.now()}`;
                            if (typeof msg.content === 'string') {
                                try {
                                    const parsed = JSON.parse(msg.content);
                                    return (
                                        <div key={key}>
                                            <p>{parsed.text || msg.content}</p>
                                            {parsed.cards && parsed.cards.length > 0 && <CardDisplay cards={parsed.cards} />}
                                        </div>
                                    );
                                } catch (e) {
                                    return <div key={key}><p>{msg.content}</p></div>;
                                }
                            } else {
                                return <div key={key}><p>{msg.content}</p></div>;
                            }
                        })}
                    </div>
                    <div>
                        <input
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.code === 'Enter') {
                                    e.preventDefault();
                                    sendMessage();
                                }
                            }}
                            placeholder="Type a message..."
                            style={{ width: "70%", marginRight: "0.5rem" }}
                        />
                        <button onClick={sendMessage}>Send</button>
                    </div>
                </div>
            </div>
        </ErrorBoundary>
    );
}

export default App;
