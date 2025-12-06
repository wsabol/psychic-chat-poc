/**
 * ChatInputForm - Input field and send button
 */
export default function ChatInputForm({
  inputMessage,
  setInputMessage,
  onSend,
  disabled,
  loading,
  isTemporaryAccount
}) {
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!disabled && !loading && inputMessage.trim()) {
      onSend();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="chat-input-form">
      <input
        type="text"
        value={inputMessage}
        onChange={(e) => setInputMessage(e.target.value)}
        placeholder={disabled ? "" : "Ask the oracle..."}
        disabled={loading || disabled}
        className="chat-input"
        style={{
          backgroundColor: disabled ? '#f5f5f5' : 'white',
          color: disabled ? '#999' : 'black',
          cursor: disabled ? 'not-allowed' : 'text'
        }}
      />
      <button 
        type="submit" 
        disabled={loading || !inputMessage.trim() || disabled}
        className="btn-primary"
      >
        {loading ? 'Sending...' : 'Send'}
      </button>
    </form>
  );
}
