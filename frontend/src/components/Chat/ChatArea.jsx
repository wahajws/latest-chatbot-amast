import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
// Import syntax highlighter styles
let vscDarkPlus;
try {
  vscDarkPlus = require('react-syntax-highlighter/dist/cjs/styles/prism').vscDarkPlus;
} catch (e) {
  // Fallback if import fails
  vscDarkPlus = {};
}
import MessageActions from './MessageActions';
import api from '../../services/api';
import './ChatArea.css';

function ChatArea({ messages, loading, messagesEndRef, onEditSql, selectedDatabase }) {
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  useEffect(() => {
    if (selectedDatabase && messages.length === 0) {
      loadSuggestions();
    } else if (!selectedDatabase) {
      setSuggestions([]);
    }
  }, [selectedDatabase?.id, messages.length]);

  const loadSuggestions = async () => {
    setLoadingSuggestions(true);
    try {
      const response = await api.get('/chat/suggestions');
      setSuggestions(response.data.suggestions || []);
    } catch (error) {
      console.error('Error loading suggestions:', error);
      // Fallback to default suggestions
      setSuggestions([
        'What was the revenue last month?',
        'Show me top 10 outlets by sales',
        'Compare sales this year and last year',
        'What are the best selling products?',
        'Show me recent transactions',
        'What is the total inventory value?'
      ]);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  return (
    <div className="chat-area">
      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="empty-state">
            <h2>How can I help you today?</h2>
            <p>Ask me anything about the {selectedDatabase?.name || 'AMAST'} database</p>
            {loadingSuggestions ? (
              <div className="example-questions-loading">
                <div className="loading-spinner-small"></div>
                <span>Generating suggestions...</span>
              </div>
            ) : suggestions.length > 0 ? (
              <div className="example-questions">
                {suggestions.map((suggestion, index) => (
                  <div 
                    key={index} 
                    className="example-question"
                    onClick={() => {
                      // Dispatch custom event that parent can listen to
                      const event = new CustomEvent('chatSuggestionClick', { detail: suggestion });
                      window.dispatchEvent(event);
                    }}
                  >
                    {suggestion}
                  </div>
                ))}
              </div>
            ) : (
              <div className="example-questions">
                <div className="example-question">What was the revenue last month?</div>
                <div className="example-question">Show me top 10 outlets by sales</div>
                <div className="example-question">Compare sales this year and last year</div>
              </div>
            )}
          </div>
        )}
        
        {messages.map((message) => (
          <div key={message.id} className={`message ${message.role}`}>
            <div className="message-content">
              {message.role === 'user' ? (
                <div className="user-message">{message.message}</div>
              ) : (
                <div className="assistant-message">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      code({ node, inline, className, children, ...props }) {
                        const match = /language-(\w+)/.exec(className || '');
                        return !inline && match ? (
                          <SyntaxHighlighter
                            style={vscDarkPlus}
                            language={match[1]}
                            PreTag="div"
                            {...props}
                          >
                            {String(children).replace(/\n$/, '')}
                          </SyntaxHighlighter>
                        ) : (
                          <code className={className} {...props}>
                            {children}
                          </code>
                        );
                      },
                      table: ({ node, children, ...props }) => (
                        <div className="chat-table-wrapper">
                          <table className="chat-table" {...props}>
                            {children}
                          </table>
                        </div>
                      ),
                      thead: ({ node, ...props }) => <thead className="chat-thead" {...props} />,
                      tbody: ({ node, ...props }) => <tbody className="chat-tbody" {...props} />,
                      tr: ({ node, ...props }) => <tr className="chat-tr" {...props} />,
                      th: ({ node, ...props }) => <th className="chat-th" {...props} />,
                      td: ({ node, ...props }) => <td className="chat-td" {...props} />,
                    }}
                  >
                    {message.message}
                  </ReactMarkdown>
                  
                  {message.sqlQuery && (
                    <details className="sql-details" open>
                      <summary>View SQL Query</summary>
                      <div className="sql-code-block">
                        <SyntaxHighlighter 
                          language="sql" 
                          style={vscDarkPlus}
                          customStyle={{
                            background: '#ffffff',
                            padding: '24px',
                            borderRadius: '16px',
                            margin: '0',
                            fontSize: '14px',
                            lineHeight: '1.8',
                            color: '#475569',
                            textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)',
                          }}
                          codeTagProps={{
                            style: {
                              color: '#475569',
                              fontFamily: "'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', 'Consolas', 'Courier New', monospace",
                            }
                          }}
                        >
                          {message.sqlQuery}
                        </SyntaxHighlighter>
                      </div>
                    </details>
                  )}
                </div>
              )}
            </div>
            <MessageActions message={message} onEditSql={onEditSql} />
          </div>
        ))}
        
        {loading && (
          <div className="message assistant">
            <div className="message-content">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}

export default ChatArea;

