import React from 'react';

function ChatInput({ message, onChange, onSend }) {
    return (
        <div>
            <input
                value={message}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.code === 'Enter') {
                        e.preventDefault();
                        onSend();
                    }
                }}
                placeholder="Type a message..."
                style={{ width: "70%", marginRight: "0.5rem" }}
            />
            <button onClick={onSend}>Send</button>
        </div>
    );
}

export default ChatInput;