import React, { useCallback, useState, useEffect } from "react";

function App() {
    const [userId, setUserId] = useState("user1");
    const [message, setMessage] = useState("");
    const [chat, setChat] = useState([]);
    const [loaded, setLoaded] = useState(false);
    const [gotOpening, setGotOpening] = useState(false);

    const fetchOpening = useCallback(async function() {
        const res = await fetch(`http://localhost:3000/chat/opening/${userId}`);
        const data = await res.json();
        setChat([...chat, { id: Date.now(), role: "assistant", content: data.message }]);
    }, [chat, userId]);

    async function sendMessage() {
        if (!message.trim()) return;

        // Optimistically update UI
        setChat([...chat, { id: Date.now(), role: "user", content: message }]);

        await fetch("http://localhost:3000/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId, message }),
        });

        setMessage("");
    }

    const loadMessages = useCallback(async function() {
        const res = await fetch(`http://localhost:3000/chat/history/${userId}`);
        const data = await res.json();
        setChat(data);
        setLoaded(true);
    }, [userId]);

    useEffect(() => {
        const interval = setInterval(loadMessages, 2000);
        return () => clearInterval(interval);
    }, [userId, loadMessages]);

    useEffect(() => {
        if (loaded && !gotOpening) {
            setGotOpening(true);
            fetchOpening();
        }
    }, [loaded, gotOpening, fetchOpening]);

    return (
        <div style={{ maxWidth: 600, margin: "2rem auto", fontFamily: "sans-serif" }}>
            <h2>Chatbot Demo</h2>
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
                }}
            >
                {chat.map((msg) => (
                    <div key={msg.id} style={{ marginBottom: "0.5rem" }}>
                        <strong>{msg.role === "user" ? "You" : "Bot"}:</strong> {msg.content}
                    </div>
                ))}
            </div>

            <div>
                <input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type a message..."
                    style={{ width: "70%", marginRight: "0.5rem" }}
                />
                <button onClick={sendMessage}>Send</button>
            </div>
        </div>
    );
}

export default App;
