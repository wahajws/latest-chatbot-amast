import React, { useState } from 'react';
import './MessageActions.css';

function MessageActions({ message, onEditSql }) {
  const [showActions, setShowActions] = useState(false);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    // You could add a toast notification here
  };

  return (
    <div
      className="message-actions"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {showActions && (
        <div className="actions-menu">
          <button
            className="action-button"
            onClick={() => copyToClipboard(message.message)}
            title="Copy message"
          >
            📋
          </button>
          {message.sqlQuery && (
            <>
              <button
                className="action-button"
                onClick={() => copyToClipboard(message.sqlQuery)}
                title="Copy SQL"
              >
                🔍
              </button>
              <button
                className="action-button action-button-edit"
                onClick={() => onEditSql && onEditSql(message.sqlQuery, message.message)}
                title="Edit SQL"
              >
                ✏️
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default MessageActions;

