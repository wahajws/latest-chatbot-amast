import React, { useState } from 'react';
import './Sidebar.css';

function Sidebar({ sessions, currentSession, onNewChat, onSelectSession, onDeleteSession, user, onLogout }) {
  const [collapsed, setCollapsed] = useState(false);

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
                onClick={() => onSelectSession(session)}
              >
                <div className="session-content">
                  <div className="session-title">{session.title || 'New Chat'}</div>
                  <div className="session-meta">
                    {session.message_count || 0} messages • {formatDate(session.updated_at || session.created_at)}
                  </div>
                </div>
                <div className="session-actions">
                  <button
                    className="delete-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm('Delete this chat?')) {
                        onDeleteSession(session.id);
                      }
                    }}
                  >
                    🗑️
                  </button>
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

