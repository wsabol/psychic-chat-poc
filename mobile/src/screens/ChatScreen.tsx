import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import chatService, { ChatMessage, ChatSession } from '../services/chat.service';

const ChatScreen = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [session, setSession] = useState<ChatSession | null>(null);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    loadChatSession();
  }, []);

  const loadChatSession = async () => {
    try {
      setLoading(true);
      const sessions = await chatService.getChatSessions();
      
      // Get the most recent active session or start a new one
      const activeSession = sessions.find(s => s.status === 'active');
      
      if (activeSession) {
        setSession(activeSession);
        const sessionMessages = await chatService.getMessages(activeSession.id);
        setMessages(sessionMessages);
      } else {
        // Start a new session with default psychic
        const newSession = await chatService.startChatSession('default-psychic');
        setSession(newSession);
        setMessages(newSession.messages || []);
      }
    } catch (error) {
      console.error('Error loading chat session:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() || !session) return;

    const messageText = inputText.trim();
    setInputText('');
    setSending(true);

    // Optimistically add message to UI
    const tempMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      text: messageText,
      sender: 'user',
      timestamp: new Date().toISOString(),
      status: 'sending',
    };
    setMessages(prev => [...prev, tempMessage]);

    try {
      const sentMessage = await chatService.sendMessage(session.id, messageText);
      
      // Replace temp message with actual message
      setMessages(prev => 
        prev.map(msg => msg.id === tempMessage.id ? sentMessage : msg)
      );

      // Poll for psychic response (in production, use WebSocket)
      setTimeout(async () => {
        const updatedMessages = await chatService.getMessages(session.id);
        setMessages(updatedMessages);
      }, 2000);
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Mark message as error
      setMessages(prev =>
        prev.map(msg =>
          msg.id === tempMessage.id ? { ...msg, status: 'error' as const } : msg
        )
      );
    } finally {
      setSending(false);
    }
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.sender === 'user';
    
    return (
      <View style={[styles.messageContainer, isUser ? styles.userMessage : styles.psychicMessage]}>
        <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.psychicBubble]}>
          <Text style={[styles.messageText, isUser ? styles.userText : styles.psychicText]}>
            {item.text}
          </Text>
          <Text style={styles.timestamp}>
            {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
          {item.status === 'sending' && <Text style={styles.statusText}>Sending...</Text>}
          {item.status === 'error' && <Text style={styles.errorText}>Failed to send</Text>}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#9d4edd" />
        <Text style={styles.loadingText}>Loading chat...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Psychic Chat</Text>
        {session && <Text style={styles.headerSubtitle}>with {session.psychicName}</Text>}
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.messageList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Type your message..."
          placeholderTextColor="#666"
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[styles.sendButton, (!inputText.trim() || sending) && styles.sendButtonDisabled]}
          onPress={sendMessage}
          disabled={!inputText.trim() || sending}
        >
          <Text style={styles.sendButtonText}>{sending ? '...' : 'Send'}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1e',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0f0f1e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    marginTop: 10,
    fontSize: 16,
  },
  header: {
    backgroundColor: '#1a1a2e',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a3e',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: '#999',
    fontSize: 14,
    marginTop: 4,
  },
  messageList: {
    padding: 15,
    flexGrow: 1,
  },
  messageContainer: {
    marginBottom: 15,
    maxWidth: '80%',
  },
  userMessage: {
    alignSelf: 'flex-end',
  },
  psychicMessage: {
    alignSelf: 'flex-start',
  },
  messageBubble: {
    padding: 12,
    borderRadius: 16,
  },
  userBubble: {
    backgroundColor: '#9d4edd',
  },
  psychicBubble: {
    backgroundColor: '#2a2a3e',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userText: {
    color: '#fff',
  },
  psychicText: {
    color: '#fff',
  },
  timestamp: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    marginTop: 4,
  },
  statusText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    fontStyle: 'italic',
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 11,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: '#1a1a2e',
    borderTopWidth: 1,
    borderTopColor: '#2a2a3e',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: '#2a2a3e',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 16,
    maxHeight: 100,
    marginRight: 10,
  },
  sendButton: {
    backgroundColor: '#9d4edd',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#4a4a5e',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ChatScreen;
