import apiService from './api.service';

export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'psychic';
  timestamp: string;
  status?: 'sending' | 'sent' | 'error';
}

export interface ChatSession {
  id: string;
  psychicId: string;
  psychicName: string;
  startTime: string;
  endTime?: string;
  status: 'active' | 'ended';
  messages: ChatMessage[];
}

class ChatService {
  async getChatSessions(): Promise<ChatSession[]> {
    try {
      const response = await apiService.get<{ sessions: ChatSession[] }>('/chat/sessions');
      return response.sessions || [];
    } catch (error) {
      console.error('Error fetching chat sessions:', error);
      return [];
    }
  }

  async startChatSession(psychicId: string): Promise<ChatSession> {
    try {
      const response = await apiService.post<{ session: ChatSession }>('/chat/sessions/start', {
        psychicId,
      });
      return response.session;
    } catch (error) {
      console.error('Error starting chat session:', error);
      throw error;
    }
  }

  async sendMessage(sessionId: string, message: string): Promise<ChatMessage> {
    try {
      const response = await apiService.post<{ message: ChatMessage }>(`/chat/sessions/${sessionId}/messages`, {
        text: message,
      });
      return response.message;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  async getMessages(sessionId: string): Promise<ChatMessage[]> {
    try {
      const response = await apiService.get<{ messages: ChatMessage[] }>(`/chat/sessions/${sessionId}/messages`);
      return response.messages || [];
    } catch (error) {
      console.error('Error fetching messages:', error);
      return [];
    }
  }

  async endChatSession(sessionId: string): Promise<void> {
    try {
      await apiService.post(`/chat/sessions/${sessionId}/end`);
    } catch (error) {
      console.error('Error ending chat session:', error);
      throw error;
    }
  }

  async getAvailablePsychics(): Promise<Array<{ id: string; name: string; specialty: string; available: boolean }>> {
    try {
      const response = await apiService.get<{ psychics: any[] }>('/chat/psychics');
      return response.psychics || [];
    } catch (error) {
      console.error('Error fetching available psychics:', error);
      return [];
    }
  }
}

export default new ChatService();
