import React, { useCallback, useState, useEffect } from "react";
import CardDisplay from "./components/CardDisplay";
import Menu from "./components/Menu";
import StarField from "./components/StarField";
import PersonalInfoModal from "./components/PersonalInfoModal";
import AstrologyModal from "./components/AstrologyModal";

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
    const [showPersonalInfoModal, setShowPersonalInfoModal] = useState(false);
    const [showAstrologyModal, setShowAstrologyModal] = useState(false);
    const [birthDate, setBirthDate] = useState(null);
    const [birthTime, setBirthTime] = useState(null);
    const [birthCity, setBirthCity] = useState(null);
    const [birthState, setBirthState] = useState(null);
    const [firstName, setFirstName] = useState(null);
    const [lastName, setLastName] = useState(null);
    
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

    const fetchPersonalInfo = useCallback(async function() {
        try {
            const res = await fetch(`${API_URL}/user-profile/${userId}`);
            if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
            const data = await res.json();
            // Store name info
            if (data.first_name) {
                setFirstName(data.first_name);
            }
            if (data.last_name) {
                setLastName(data.last_name);
            }
            // Store birth info
            if (data.birth_date) {
                setBirthDate(data.birth_date);
            }
            if (data.birth_time) {
                setBirthTime(data.birth_time);
            }
            if (data.birth_city) {
                setBirthCity(data.birth_city);
            }
            if (data.birth_state) {
                setBirthState(data.birth_state);
            }
        } catch (err) {
            console.error('Error fetching personal info:', err);
        }
        console.log('Fetched personal info:', { firstName, birthDate, birthTime, birthCity, birthState });  // Added debug log
    }, [userId]);
    
    // Load initial chat history and personal info on mount or userId change
    useEffect(() => {
        loadMessages();
        fetchPersonalInfo();
    }, [userId, loadMessages, fetchPersonalInfo]);
    
    // Poll for new messages every 3 seconds (reduced rate to avoid 429 errors)
    useEffect(() => {
        const interval = setInterval(loadMessages, 3000);
        return () => {
            clearInterval(interval);  // Cleanup on unmount
        };
    }, [loadMessages]);
    
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
            <PersonalInfoModal 
                userId={userId}
                isOpen={showPersonalInfoModal}
                onClose={() => setShowPersonalInfoModal(false)}
                onSave={() => fetchPersonalInfo()}
            />
            <div style={{ position: "relative" }}>
                <Menu 
                    menuOpen={menuOpen} 
                    setMenuOpen={setMenuOpen}
                    onPersonalInfoClick={() => setShowPersonalInfoModal(true)}
                    onAstrologyClick={() => setShowAstrologyModal(true)}
                />
                <AstrologyModal 
                    userId={userId}
                    isOpen={showAstrologyModal}
                    onClose={() => {
                        setShowAstrologyModal(false);
                        fetchPersonalInfo();  // Refetch to get any new astrology data
                    }}
                    birthDate={birthDate}
                    birthTime={birthTime}
                    birthCity={birthCity}
                    birthState={birthState}
                />
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
