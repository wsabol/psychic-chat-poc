import { useTranslation } from '../context/TranslationContext';

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
  const { t } = useTranslation();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!disabled && !loading && inputMessage.trim()) {
      onSend();
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit} className="chat-input-form">
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder={disabled ? "" : t('chat.placeholder')}
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
          {loading ? t('chat.sending') : t('chat.send')}
        </button>
      </form>
      <p className="privacy-notice" style={{ 
        fontSize: '0.75rem', 
        color: '#888', 
        marginTop: '0.5rem',
        textAlign: 'center',
        fontStyle: 'italic',
        padding: '0 1rem'
      }}>
        {t('chat.privacyNotice')}
      </p>
    </div>
  );
}
