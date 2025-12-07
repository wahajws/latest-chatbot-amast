import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Chat/Sidebar';
import ChatArea from '../components/Chat/ChatArea';
import InputArea from '../components/Chat/InputArea';
import SqlEditor from '../components/Chat/SqlEditor';
import './Chat.css';

function Chat() {
  const { user, logout } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sqlEditorOpen, setSqlEditorOpen] = useState(false);
  const [editingSql, setEditingSql] = useState(null);
  const [editingOriginalQuestion, setEditingOriginalQuestion] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    loadSessions();
  }, []);

  useEffect(() => {
    if (currentSession) {
      loadMessages(currentSession.id);
    } else {
      setMessages([]);
    }
  }, [currentSession]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadSessions = async () => {
    try {
      const api = (await import('../services/api')).default;
      const response = await api.get('/chat/sessions');
      const sessionsData = response.data.sessions || [];
      setSessions(sessionsData);
      
      // Auto-select first session if no current session
      if (sessionsData.length > 0 && !currentSession) {
        setCurrentSession(sessionsData[0]);
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
      // If unauthorized, redirect to login
      if (error.response?.status === 401) {
        window.location.href = '/login';
      }
    }
  };

  const loadMessages = async (sessionId) => {
    try {
      const api = (await import('../services/api')).default;
      const response = await api.get(`/chat/sessions/${sessionId}`);
      const messagesData = response.data.messages || [];
      
      // Parse query_result if it's a string (JSON)
      const parsedMessages = messagesData.map(msg => ({
        ...msg,
        queryResult: typeof msg.queryResult === 'string' 
          ? JSON.parse(msg.queryResult) 
          : msg.queryResult,
      }));
      
      setMessages(parsedMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
      if (error.response?.status === 401) {
        window.location.href = '/login';
      }
    }
  };

  const createNewSession = async () => {
    try {
      const api = (await import('../services/api')).default;
      const response = await api.post('/chat/sessions', { title: 'New Chat' });
      const newSession = response.data.session;
      if (newSession) {
        setSessions(prev => [newSession, ...prev]);
        setCurrentSession(newSession);
        setMessages([]);
      }
    } catch (error) {
      console.error('Error creating session:', error);
      if (error.response?.status === 401) {
        window.location.href = '/login';
      }
    }
  };

  const selectSession = (session) => {
    setCurrentSession(session);
  };

  const deleteSession = async (sessionId) => {
    try {
      const api = (await import('../services/api')).default;
      await api.delete(`/chat/sessions/${sessionId}`);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      if (currentSession?.id === sessionId) {
        const remainingSessions = sessions.filter(s => s.id !== sessionId);
        if (remainingSessions.length > 0) {
          setCurrentSession(remainingSessions[0]);
        } else {
          setCurrentSession(null);
          setMessages([]);
        }
      }
    } catch (error) {
      console.error('Error deleting session:', error);
      if (error.response?.status === 401) {
        window.location.href = '/login';
      }
    }
  };

  const sendMessage = async (message) => {
    if (!currentSession) {
      await createNewSession();
      // Wait a bit for session to be created, then retry
      setTimeout(async () => {
        if (currentSession) {
          await sendMessage(message);
        }
      }, 200);
      return;
    }

    setLoading(true);
    
    // Add user message to UI immediately
    const userMessage = {
      id: Date.now(),
      role: 'user',
      message: message,
      createdAt: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      const api = (await import('../services/api')).default;
      console.log('📤 Sending message:', message);
      console.log('📤 Session ID:', currentSession.id);
      
      const response = await api.post(`/chat/sessions/${currentSession.id}/messages`, {
        message: message,
      });

      console.log('✅ Response received:', response.data);

      // Add assistant response
      const assistantMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        message: response.data.answer || 'No response received',
        sqlQuery: response.data.sqlQuery || null,
        queryResult: response.data.queryResult || null,
        createdAt: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);

      // Reload sessions to update titles and message counts
      await loadSessions();
    } catch (error) {
      console.error('❌ Error sending message:', error);
      console.error('❌ Error response:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
      console.error('❌ Error message:', error.message);
      
      const errorMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        message: error.response?.data?.error || `Failed to process message: ${error.message}`,
        createdAt: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
      
      if (error.response?.status === 401) {
        window.location.href = '/login';
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEditSql = (sqlQuery, originalQuestion) => {
    setEditingSql(sqlQuery);
    setEditingOriginalQuestion(originalQuestion);
    setSqlEditorOpen(true);
  };

  const handleExecuteSql = async (editedSql, originalQuestion) => {
    if (!currentSession) {
      throw new Error('No active session');
    }

    setLoading(true);
    setSqlEditorOpen(false);

    try {
      const api = (await import('../services/api')).default;
      
      const response = await api.post(`/chat/sessions/${currentSession.id}/execute-sql`, {
        sqlQuery: editedSql,
        originalQuestion: originalQuestion,
      });

      // Add the new assistant response with corrected SQL
      const correctedMessage = {
        id: Date.now(),
        role: 'assistant',
        message: response.data.answer || 'No response received',
        sqlQuery: response.data.sqlQuery || editedSql,
        queryResult: response.data.queryResult || null,
        createdAt: new Date(),
      };
      setMessages(prev => [...prev, correctedMessage]);

      // Reload sessions to update titles and message counts
      await loadSessions();
    } catch (error) {
      console.error('❌ Error executing SQL:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chat-container">
      <Sidebar
        sessions={sessions}
        currentSession={currentSession}
        onNewChat={createNewSession}
        onSelectSession={selectSession}
        onDeleteSession={deleteSession}
        user={user}
        onLogout={logout}
      />
      <div className="chat-main">
        <ChatArea
          messages={messages}
          loading={loading}
          messagesEndRef={messagesEndRef}
          onEditSql={handleEditSql}
        />
        <InputArea
          onSendMessage={sendMessage}
          loading={loading}
        />
      </div>
      
      {sqlEditorOpen && (
        <SqlEditor
          sqlQuery={editingSql}
          originalQuestion={editingOriginalQuestion}
          onExecute={handleExecuteSql}
          onClose={() => {
            setSqlEditorOpen(false);
            setEditingSql(null);
            setEditingOriginalQuestion(null);
          }}
        />
      )}
    </div>
  );
}

export default Chat;

