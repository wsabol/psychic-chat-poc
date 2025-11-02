import React, { useCallback, useState, useEffect } from "react";
import CardDisplay from "./components/CardDisplay";

// Read API base URL from environment variable (Create React App expects REACT_APP_ prefix)
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3000";

function App() {
    const [userId, setUserId] = useState("user1");
    const [message, setMessage] = useState("");
    const [birthDate, setBirthDate] = useState("");
    const [birthTime, setBirthTime] = useState("");
    const [birthPlace, setBirthPlace] = useState("");
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [twoFA, setTwoFA] = useState("");
    const [chat, setChat] = useState([]);  // Expect chat to include structured data like { text: '', cards: [] }
    const [loaded, setLoaded] = useState(false);
    const [gotOpening, setGotOpening] = useState(false);
    const [error, setError] = useState(null);
    
    const handleProfileEdit = () => {
        // Placeholder for profile editing logic
        console.log('Edit profile');
    };
    
    const sendAstrologyRequest = async () => {
        if (!birthDate || !birthTime || !birthPlace) {
            setError("Please provide all birth details");
            return;
        }
        try {
            await fetch(`${API_URL}/reading`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId, birthDate, birthTime, birthPlace }),
            });
            // Optionally, refresh chat or handle response
            await loadMessages();
        } catch (err) {
            setError(err.message);
        }
    };
    
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
        <div style={{ position: "relative" }}>
            <div style={{ position: "absolute", top: 0, left: 0 }}>
                <button onClick={handleProfileEdit}>Edit Profile</button>
            </div>
            <div style={{ maxWidth: 600, margin: "2rem auto", fontFamily: "sans-serif", textAlign: "center" }}>
                {error && <p style={{ color: "red" }}>Error: {error}</p>}
                {/* Display errors */}
                <h2 style={{ textAlign: "center" }}>Chatbot Demo</h2>
                <div>
                    <label>User ID: </label>
                    <input
                        value={userId}
                        onChange={(e) => setUserId(e.target.value)}
                        style={{ marginBottom: "1rem" }}
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
                        background: "#f9f9f9",
                        textAlign: "left",
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
    );
}

export default App;
