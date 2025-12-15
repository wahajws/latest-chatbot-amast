import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import api from '../services/api';
import QueryBuilder from '../components/Dashboard/QueryBuilder';
import './Dashboard.css';

function Dashboard() {
  const { user } = useAuth();
  const [dashboardItems, setDashboardItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [selectedDatabase, setSelectedDatabase] = useState(null);

  // AI Conversation state
  const [conversationHistory, setConversationHistory] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [previewConfig, setPreviewConfig] = useState(null);
  const [isAutoGenerating, setIsAutoGenerating] = useState(false);

  useEffect(() => {
    loadSelectedDatabase();
  }, []);

  // Reload dashboard items when database changes
  useEffect(() => {
    if (selectedDatabase) {
      // Clear existing items first to avoid showing stale data
      setDashboardItems([]);
      loadDashboardItems();
    } else {
      setDashboardItems([]);
    }
  }, [selectedDatabase?.id]);

  // Reload selected database when page becomes visible (user might have changed it in Settings)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadSelectedDatabase();
      }
    };

    const handleFocus = () => {
      loadSelectedDatabase();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const loadSelectedDatabase = async () => {
    try {
      const response = await api.get('/databases/selected');
      setSelectedDatabase(response.data.database);
    } catch (error) {
      console.error('Error loading selected database:', error);
    }
  };

  const loadDashboardItems = async () => {
    setLoading(true);
    try {
      const response = await api.get('/dashboard-items');
      setDashboardItems(response.data.items || []);
    } catch (error) {
      console.error('Error loading dashboard items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddInsight = () => {
    if (!selectedDatabase) {
      alert('Please select a database in Settings first.');
      return;
    }
    setEditingItem(null);
    setShowCreateModal(true);
    setConversationHistory([]);
    setUserInput('');
    setPreviewData(null);
    setPreviewConfig(null);
  };

  const handleEditItem = async (item) => {
    if (!selectedDatabase) {
      alert('Please select a database in Settings first.');
      return;
    }
    try {
      // Fetch full item details
      const response = await api.get(`/dashboard-items/${item.id}`);
      setEditingItem(response.data.item);
      setShowCreateModal(true);
    } catch (error) {
      console.error('Error loading item for editing:', error);
      alert(`Error loading item: ${error.response?.data?.error || error.message}`);
    }
  };

  const handleSendMessage = async () => {
    if (!userInput.trim() || isGenerating) return;

    const userMessage = userInput.trim();
    setUserInput('');
    setIsGenerating(true);

    // Add user message to history
    const newHistory = [...conversationHistory, { role: 'user', content: userMessage }];
    setConversationHistory(newHistory);

    try {
      const response = await api.post('/dashboard-items/generate-insight', {
        request: userMessage,
        conversationHistory: newHistory,
      });

      const aiResponse = response.data;

      if (aiResponse.status === 'question') {
        // AI needs more information
        setConversationHistory([...newHistory, { role: 'assistant', content: aiResponse.question }]);
      } else if (aiResponse.status === 'ready') {
        // AI has generated the insight
        setPreviewConfig({
          title: aiResponse.title,
          description: aiResponse.description,
          widget_type: aiResponse.widget_type,
          sql_query: aiResponse.sql_query,
        });

        // Preview the insight
        await previewInsight(aiResponse.sql_query, aiResponse.widget_type);
      }
    } catch (error) {
      console.error('Error generating insight:', error);
      setConversationHistory([
        ...newHistory,
        { role: 'assistant', content: `Sorry, I encountered an error: ${error.response?.data?.error || error.message}` }
      ]);
    } finally {
      setIsGenerating(false);
    }
  };

  const previewInsight = async (sqlQuery, widgetType) => {
    try {
      const response = await api.post('/dashboard-items/preview-insight', {
        sql_query: sqlQuery,
        widget_type: widgetType,
      });

      if (response.data.success) {
        setPreviewData(response.data);
      }
    } catch (error) {
      console.error('Error previewing insight:', error);
      alert(`Error previewing insight: ${error.response?.data?.error || error.message}`);
    }
  };

  const handleSaveInsight = async () => {
    if (!previewConfig) return;

    try {
      await api.post('/dashboard-items', {
        title: previewConfig.title,
        description: previewConfig.description,
        widget_type: previewConfig.widget_type,
        widget_config: previewData || {},
        sql_query: previewConfig.sql_query,
      });

      await loadDashboardItems();
      setShowCreateModal(false);
      setConversationHistory([]);
      setPreviewData(null);
      setPreviewConfig(null);
    } catch (error) {
      console.error('Error saving insight:', error);
      alert(`Error saving insight: ${error.response?.data?.error || error.message}`);
    }
  };

  const handleDeleteItem = async (itemId) => {
    if (!window.confirm('Are you sure you want to delete this insight?')) {
      return;
    }

    try {
      await api.delete(`/dashboard-items/${itemId}`);
      await loadDashboardItems();
    } catch (error) {
      console.error('Error deleting item:', error);
      alert(`Error deleting insight: ${error.response?.data?.error || error.message}`);
    }
  };

  const handleAutoGenerate = async () => {
    if (!selectedDatabase) {
      alert('Please select a database in Settings first.');
      return;
    }

    if (!window.confirm('This will generate a complete dashboard with 8-12 insights. This may take a minute. Continue?')) {
      return;
    }

    setIsAutoGenerating(true);
    try {
      const response = await api.post('/dashboard-items/auto-generate');
      
      if (response.data.success) {
        alert(`✅ Successfully generated ${response.data.totalSaved} dashboard insights!`);
        await loadDashboardItems();
      }
    } catch (error) {
      console.error('Error auto-generating dashboard:', error);
      alert(`Error: ${error.response?.data?.error || error.message}`);
    } finally {
      setIsAutoGenerating(false);
    }
  };

  const formatCurrency = (value) => {
    const numValue = parseFloat(value) || 0;
    if (numValue >= 1000000) {
      return `RM ${(numValue / 1000000).toFixed(2)}M`;
    } else if (numValue >= 1000) {
      return `RM ${(numValue / 1000).toFixed(2)}K`;
    }
    return new Intl.NumberFormat('en-MY', {
      style: 'currency',
      currency: 'MYR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(numValue);
  };

  const formatNumber = (value) => {
    return new Intl.NumberFormat('en-US').format(value);
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="dashboard-loading">
          <div className="loading-spinner-large"></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div>
          <h1>AMAST Dashboard</h1>
          <p className="dashboard-subtitle">Real-time insights and analytics</p>
        </div>
        {user?.role === 'admin' && (
          <div className="dashboard-actions">
            <button 
              className="auto-generate-button" 
              onClick={handleAutoGenerate}
              disabled={isAutoGenerating || !selectedDatabase}
              title={!selectedDatabase ? 'Please select a database first' : 'Generate complete dashboard with AI'}
            >
              {isAutoGenerating ? (
                <>
                  <div className="loading-spinner-small"></div>
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path>
                  </svg>
                  <span>Auto-Generate Dashboard</span>
                </>
              )}
            </button>
            <button className="add-insight-button" onClick={handleAddInsight}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              <span>Add Insight</span>
            </button>
          </div>
        )}
      </div>

      {!selectedDatabase && (
        <div className="dashboard-empty-state">
          <div className="empty-state-icon">📊</div>
          <h2>No Database Selected</h2>
          <p>Please select a database in Settings to view insights.</p>
          {user?.role === 'admin' && (
            <button className="primary-button" onClick={() => window.location.href = '/settings'}>
              Go to Settings
            </button>
          )}
        </div>
      )}

      {selectedDatabase && dashboardItems.length === 0 && (
        <div className="dashboard-empty-state">
          <div className="empty-state-icon">📊</div>
          <h2>Your dashboard is empty</h2>
          <p>Get started by auto-generating a complete dashboard or create custom insights.</p>
          {user?.role === 'admin' && (
            <div className="empty-state-actions">
              <button 
                className="primary-button auto-generate-primary" 
                onClick={handleAutoGenerate}
                disabled={isAutoGenerating}
              >
                {isAutoGenerating ? (
                  <>
                    <div className="loading-spinner-small"></div>
                    <span>Generating Dashboard...</span>
                  </>
                ) : (
                  <>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path>
                    </svg>
                    <span>Auto-Generate Dashboard</span>
                  </>
                )}
              </button>
              <button className="secondary-button" onClick={handleAddInsight}>
                Create Custom Insight
              </button>
            </div>
          )}
        </div>
      )}

      {selectedDatabase && dashboardItems.length > 0 && (
        <div className="dashboard-grid">
          {dashboardItems.map((item) => (
            <DashboardWidget
              key={item.id}
              item={item}
              isAdmin={user?.role === 'admin'}
              onDelete={handleDeleteItem}
              onEdit={handleEditItem}
              formatCurrency={formatCurrency}
              formatNumber={formatNumber}
            />
          ))}
        </div>
      )}

      {/* Create/Edit Insight Modal - Visual Query Builder */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={(e) => {
          // Only close if clicking directly on the overlay, not on child elements
          if (e.target === e.currentTarget) {
            setShowCreateModal(false);
            setEditingItem(null);
          }
        }}>
          <div onClick={(e) => e.stopPropagation()}>
            <QueryBuilder
              editItem={editingItem}
              onClose={() => {
                setShowCreateModal(false);
                setEditingItem(null);
                setConversationHistory([]);
                setPreviewData(null);
                setPreviewConfig(null);
              }}
              onSave={async () => {
                await loadDashboardItems();
                setShowCreateModal(false);
                setEditingItem(null);
                setConversationHistory([]);
                setPreviewData(null);
                setPreviewConfig(null);
              }}
              formatCurrency={formatCurrency}
              formatNumber={formatNumber}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Dashboard Widget Component
function DashboardWidget({ item, isAdmin, onDelete, onEdit, formatCurrency, formatNumber }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadWidgetData();
  }, [item.id]);

  const loadWidgetData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/dashboard-items/${item.id}/data`);
      setData(response.data);
    } catch (error) {
      console.error('Error loading widget data:', error);
      setError(error.response?.data?.error || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const renderWidgetContent = () => {
    if (loading) {
      return (
        <div className="widget-loading">
          <div className="loading-spinner"></div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="widget-error">
          <p>{error}</p>
          <button onClick={loadWidgetData} className="retry-button">Retry</button>
        </div>
      );
    }

    switch (item.widget_type) {
      case 'kpi':
        return (
          <div className="widget-kpi">
            <div className="kpi-value-large">
              {formatCurrency(data?.data?.value || 0)}
            </div>
            <div className="kpi-label-large">{data?.data?.label || item.title}</div>
          </div>
        );

      case 'line_chart':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data?.data || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" stroke="#475569" tick={{ fill: '#475569', fontSize: 12 }} />
              <YAxis stroke="#475569" tick={{ fill: '#475569', fontSize: 12 }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#ffffff', 
                  border: '1px solid #e2e8f0', 
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                  color: '#475569'
                }} 
                labelStyle={{ color: '#475569', fontWeight: 600 }}
              />
              <Legend wrapperStyle={{ color: '#475569', fontSize: '12px' }} />
              <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={3} dot={{ fill: '#2563eb', r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        );

      case 'bar_chart':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data?.data || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" stroke="#475569" tick={{ fill: '#475569', fontSize: 12 }} />
              <YAxis stroke="#475569" tick={{ fill: '#475569', fontSize: 12 }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#ffffff', 
                  border: '1px solid #e2e8f0', 
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                  color: '#475569'
                }} 
                labelStyle={{ color: '#475569', fontWeight: 600 }}
              />
              <Legend wrapperStyle={{ color: '#475569', fontSize: '12px' }} />
              <Bar dataKey="value" fill="#2563eb" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'pie_chart':
        const COLORS = ['#2563eb', '#3b82f6', '#1d4ed8', '#60a5fa', '#1e40af', '#1e3a8a'];
        return (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data?.data || []}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#2563eb"
                dataKey="value"
              >
                {(data?.data || []).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#ffffff', 
                  border: '1px solid #e2e8f0', 
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                  color: '#475569'
                }} 
                labelStyle={{ color: '#475569', fontWeight: 600 }}
              />
            </PieChart>
          </ResponsiveContainer>
        );

      case 'table':
        // For table widgets, formattedData is { columns, rows }
        const tableColumns = data?.data?.columns || data?.columns || [];
        const tableRows = data?.data?.rows || [];
        return (
          <div className="widget-table">
            <table>
              <thead>
                <tr>
                  {tableColumns.map((col, idx) => (
                    <th key={idx}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableRows.slice(0, 10).map((row, rowIdx) => (
                  <tr key={rowIdx}>
                    {tableColumns.map((col, colIdx) => (
                      <td key={colIdx}>{row[col]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {tableRows.length > 10 && (
              <div className="table-footer">Showing 10 of {tableRows.length} rows</div>
            )}
          </div>
        );

      default:
        return <div>Unknown widget type: {item.widget_type}</div>;
    }
  };

  return (
    <div className={`dashboard-widget widget-${item.widget_type}`} style={{ 
      gridColumn: `span ${item.width || 4}`,
      gridRow: `span ${item.height || 3}`
    }}>
      <div className="widget-header">
        <div>
          <h3>{item.title}</h3>
          {item.description && <p className="widget-description">{item.description}</p>}
        </div>
        {isAdmin && (
          <div className="widget-actions">
            <button 
              className="widget-edit-button"
              onClick={() => onEdit(item)}
              title="Edit insight"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </button>
            <button 
              className="widget-delete-button"
              onClick={() => onDelete(item.id)}
              title="Delete insight"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        )}
      </div>
      <div className="widget-content">
        {renderWidgetContent()}
      </div>
    </div>
  );
}

// Create Insight Modal Component
function CreateInsightModal({
  conversationHistory,
  userInput,
  setUserInput,
  isGenerating,
  onSend,
  onClose,
  previewData,
  previewConfig,
  onSave,
  formatCurrency,
  formatNumber,
}) {
  const conversationEndRef = React.useRef(null);

  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversationHistory, previewData]);

  const renderPreview = () => {
    if (!previewConfig || !previewData) return null;

    return (
      <div className="insight-preview">
        <h3>Preview: {previewConfig.title}</h3>
        {previewConfig.description && <p>{previewConfig.description}</p>}
        
        <div className="preview-widget">
          {previewConfig.widget_type === 'kpi' && (
            <div className="widget-kpi">
              <div className="kpi-value-large">
                {formatCurrency(previewData.data?.value || 0)}
              </div>
              <div className="kpi-label-large">{previewData.data?.label || previewConfig.title}</div>
            </div>
          )}
          
          {previewConfig.widget_type === 'line_chart' && (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={previewData.data || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#ffffff', 
                  border: '1px solid #e2e8f0', 
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                  color: '#475569'
                }} 
                labelStyle={{ color: '#475569', fontWeight: 600 }}
              />
                <Legend />
                <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          )}
          
          {previewConfig.widget_type === 'bar_chart' && (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={previewData.data || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#ffffff', 
                  border: '1px solid #e2e8f0', 
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                  color: '#475569'
                }} 
                labelStyle={{ color: '#475569', fontWeight: 600 }}
              />
                <Legend />
                <Bar dataKey="value" fill="#2563eb" />
              </BarChart>
            </ResponsiveContainer>
          )}
          
          {previewConfig.widget_type === 'pie_chart' && (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={previewData.data || []}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {(previewData.data || []).map((entry, index) => {
                    const COLORS = ['#2563eb', '#3b82f6', '#1d4ed8', '#60a5fa', '#1e40af', '#1e3a8a'];
                    return <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />;
                  })}
                </Pie>
                <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#ffffff', 
                  border: '1px solid #e2e8f0', 
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                  color: '#475569'
                }} 
                labelStyle={{ color: '#475569', fontWeight: 600 }}
              />
              </PieChart>
            </ResponsiveContainer>
          )}
          
          {previewConfig.widget_type === 'table' && (
            <div className="widget-table">
              <table>
                <thead>
                  <tr>
                    {(previewData.data?.columns || previewData.columns || []).map((col, idx) => (
                      <th key={idx}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(previewData.data?.rows || []).slice(0, 10).map((row, rowIdx) => (
                    <tr key={rowIdx}>
                      {(previewData.data?.columns || previewData.columns || []).map((col, colIdx) => (
                        <td key={colIdx}>{row[col]}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        
        <div className="preview-actions">
          <button className="secondary-button" onClick={onClose}>Cancel</button>
          <button className="primary-button" onClick={onSave}>Save to Dashboard</button>
        </div>
      </div>
    );
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content insight-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create New Insight</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        
        {previewData ? (
          renderPreview()
        ) : (
          <>
            <div className="conversation-container">
              {conversationHistory.length === 0 && (
                <div className="conversation-message ai-message">
                  <div className="message-avatar">🤖</div>
                  <div className="message-content">
                    <p>What would you like to see on your dashboard?</p>
                    <p className="message-hint">I can help you create KPIs, charts, and tables. Just describe what you want in natural language!</p>
                  </div>
                </div>
              )}
              
              {conversationHistory.map((msg, idx) => (
                <div key={idx} className={`conversation-message ${msg.role === 'user' ? 'user-message' : 'ai-message'}`}>
                  <div className="message-avatar">
                    {msg.role === 'user' ? '👤' : '🤖'}
                  </div>
                  <div className="message-content">
                    <p>{msg.content}</p>
                  </div>
                </div>
              ))}
              
              {isGenerating && (
                <div className="conversation-message ai-message">
                  <div className="message-avatar">🤖</div>
                  <div className="message-content">
                    <div className="typing-indicator">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={conversationEndRef} />
            </div>
            
            <div className="conversation-input">
              <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !isGenerating && onSend()}
                placeholder="Describe what you want to see..."
                disabled={isGenerating}
              />
              <button 
                onClick={onSend} 
                disabled={!userInput.trim() || isGenerating}
                className="send-button"
              >
                {isGenerating ? (
                  <div className="loading-spinner-small"></div>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="22" y1="2" x2="11" y2="13"></line>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                  </svg>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
