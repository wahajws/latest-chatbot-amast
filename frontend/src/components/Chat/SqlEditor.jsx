import React, { useState } from 'react';
import './SqlEditor.css';

function SqlEditor({ sqlQuery, originalQuestion, onExecute, onClose }) {
  const [editedSql, setEditedSql] = useState(sqlQuery || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleExecute = async () => {
    if (!editedSql.trim()) {
      setError('SQL query cannot be empty');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await onExecute(editedSql, originalQuestion);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to execute SQL');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="sql-editor-overlay" onClick={onClose}>
      <div className="sql-editor-modal" onClick={(e) => e.stopPropagation()}>
        <div className="sql-editor-header">
          <h3>Edit SQL Query</h3>
          <button className="sql-editor-close" onClick={onClose}>×</button>
        </div>
        
        <div className="sql-editor-content">
          {error && (
            <div className="sql-editor-error">
              {error}
            </div>
          )}
          
          <div className="sql-editor-label">SQL Query:</div>
          <textarea
            className="sql-editor-textarea"
            value={editedSql}
            onChange={(e) => setEditedSql(e.target.value)}
            placeholder="Enter your SQL query here..."
            spellCheck={false}
          />
          
          {originalQuestion && (
            <div className="sql-editor-context">
              <strong>Original Question:</strong> {originalQuestion}
            </div>
          )}
        </div>
        
        <div className="sql-editor-actions">
          <button 
            className="sql-editor-button sql-editor-button-cancel" 
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button 
            className="sql-editor-button sql-editor-button-execute" 
            onClick={handleExecute}
            disabled={loading || !editedSql.trim()}
          >
            {loading ? 'Executing...' : 'Execute & Get Insights'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default SqlEditor;


