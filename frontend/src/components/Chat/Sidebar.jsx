import React, { useState } from 'react';
import './Sidebar.css';

function Sidebar({ sessions, currentSession, onNewChat, onSelectSession, onDeleteSession, onUpdateSessionTitle, user, onLogout }) {
  const [collapsed, setCollapsed] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState(null);
  const [editTitle, setEditTitle] = useState('');

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

  const handleStartEdit = (session, e) => {
    e.stopPropagation();
    setEditingSessionId(session.id);
    setEditTitle(session.title || 'New Chat');
  };

  const handleSaveEdit = async (sessionId, e) => {
    e.stopPropagation();
    const newTitle = editTitle.trim() || 'New Chat';
    if (onUpdateSessionTitle) {
      await onUpdateSessionTitle(sessionId, newTitle);
    }
    setEditingSessionId(null);
    setEditTitle('');
  };

  const handleCancelEdit = (e) => {
    e.stopPropagation();
    setEditingSessionId(null);
    setEditTitle('');
  };

  const handleKeyDown = (e, sessionId) => {
    if (e.key === 'Enter') {
      handleSaveEdit(sessionId, e);
    } else if (e.key === 'Escape') {
      handleCancelEdit(e);
    }
  };

  return (
    <div className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        {!collapsed && (
          <button className="new-chat-button" onClick={onNewChat}>
            <span>+</span> New chat
          </button>
        )}
        <button className="collapse-button" onClick={() => setCollapsed(!collapsed)}>
          {collapsed ? '☰' : '←'}
        </button>
      </div>

      {!collapsed && (
        <>
          <div className="sidebar-sessions">
            {sessions.map((session) => (
              <div
                key={session.id}
                className={`session-item ${currentSession?.id === session.id ? 'active' : ''}`}
                onClick={() => {
                  if (editingSessionId !== session.id) {
                    onSelectSession(session);
                  }
                }}
              >
                <div className="session-content">
                  {editingSessionId === session.id ? (
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onBlur={(e) => handleSaveEdit(session.id, e)}
                      onKeyDown={(e) => handleKeyDown(e, session.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="session-title-input"
                      autoFocus
                    />
                  ) : (
                    <div className="session-title">{session.title || 'New Chat'}</div>
                  )}
                  <div className="session-meta">
                    {session.message_count || 0} messages • {formatDate(session.updated_at || session.created_at)}
                  </div>
                </div>
                <div className="session-actions">
                  {editingSessionId === session.id ? (
                    <>
                      <button
                        className="save-button"
                        onClick={(e) => handleSaveEdit(session.id, e)}
                        title="Save"
                      >
                        ✓
                      </button>
                      <button
                        className="cancel-button"
                        onClick={handleCancelEdit}
                        title="Cancel"
                      >
                        ✕
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        className="edit-button"
                        onClick={(e) => handleStartEdit(session, e)}
                        title="Rename chat"
                      >
                        ✏️
                      </button>
                      <button
                        className="delete-button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm('Delete this chat?')) {
                            onDeleteSession(session.id);
                          }
                        }}
                        title="Delete chat"
                      >
                        🗑️
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

        </>
      )}
    </div>
  );
}

export default Sidebar;

