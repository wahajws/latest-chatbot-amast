import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import './Settings.css';

function Settings() {
  const { user } = useAuth();
  const [databases, setDatabases] = useState([]);
  const [selectedDatabase, setSelectedDatabase] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [extractingSchema, setExtractingSchema] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    instructions: '',
    database_type: 'postgresql',
    host: '',
    port: '5432',
    database_name: '',
    username: '',
    password: '',
    ssl_enabled: false,
  });
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    loadDatabases();
    loadSelectedDatabase();
  }, []);

  const loadDatabases = async () => {
    try {
      if (user?.role !== 'admin') {
        setLoading(false);
        return;
      }
      const response = await api.get('/databases');
      setDatabases(response.data.databases || []);
    } catch (error) {
      console.error('Error loading databases:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSelectedDatabase = async () => {
    try {
      const response = await api.get('/databases/selected');
      setSelectedDatabase(response.data.database || null);
    } catch (error) {
      console.error('Error loading selected database:', error);
    }
  };

  const handleTestConnection = async (db) => {
    if (user?.role !== 'admin') return;
    
    setTestingConnection(db.id);
    try {
      const response = await api.post(`/databases/${db.id}/test`);
      if (response.data.success) {
        alert('✅ Connection successful!');
      } else {
        alert(`❌ Connection failed: ${response.data.error}`);
      }
    } catch (error) {
      alert(`❌ Connection failed: ${error.response?.data?.error || error.message}`);
    } finally {
      setTestingConnection(false);
    }
  };

  const handleExtractSchema = async (db) => {
    if (user?.role !== 'admin') return;
    
    if (!window.confirm(`Extract schema from "${db.name}"? This may take a few minutes.`)) {
      return;
    }
    
    setExtractingSchema(db.id);
    try {
      const response = await api.post(`/databases/${db.id}/extract-schema`);
      if (response.data.success) {
        alert(`✅ Schema extracted successfully!\n\n${response.data.message}`);
        await loadDatabases();
      } else {
        alert(`❌ Schema extraction failed: ${response.data.error}`);
      }
    } catch (error) {
      alert(`❌ Schema extraction failed: ${error.response?.data?.error || error.message}`);
    } finally {
      setExtractingSchema(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/databases/${editingId}`, formData);
        alert('✅ Database updated successfully!');
      } else {
        await api.post('/databases', formData);
        alert('✅ Database added successfully!');
      }
      setShowAddForm(false);
      setEditingId(null);
      setFormData({
        name: '',
        description: '',
        instructions: '',
        database_type: 'postgresql',
        host: '',
        port: '5432',
        database_name: '',
        username: '',
        password: '',
        ssl_enabled: false,
      });
      await loadDatabases();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to save database');
    }
  };

  const handleEdit = (db) => {
    setEditingId(db.id);
    setFormData({
      name: db.name,
      description: db.description || '',
      instructions: db.instructions || '',
      database_type: db.database_type || 'postgresql',
      host: db.host,
      port: db.port.toString(),
      database_name: db.database_name,
      username: db.username,
      password: '', // Don't pre-fill password
      ssl_enabled: db.ssl_enabled || false,
    });
    setShowAddForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this database connection?')) {
      return;
    }
    try {
      await api.delete(`/databases/${id}`);
      alert('✅ Database deleted successfully!');
      await loadDatabases();
      if (selectedDatabase?.id === id) {
        await loadSelectedDatabase();
      }
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to delete database');
    }
  };

  const handleSelectDatabase = async (databaseId) => {
    try {
      await api.post('/databases/selected', { databaseId });
      await loadSelectedDatabase();
      alert('✅ Database selected successfully!');
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to select database');
    }
  };

  if (loading) {
    return <div className="settings-container">Loading...</div>;
  }

  return (
    <div className="settings-container">
      <div className="settings-header">
        <h1>Database Settings</h1>
        {user?.role === 'admin' && (
          <button className="create-button" onClick={() => {
            setShowAddForm(true);
            setEditingId(null);
            setFormData({
              name: '',
              description: '',
              instructions: '',
              database_type: 'postgresql',
              host: '',
              port: '5432',
              database_name: '',
              username: '',
              password: '',
              ssl_enabled: false,
            });
          }}>
            + Add Database
          </button>
        )}
      </div>

      {/* Selected Database Section */}
      <div className="settings-section">
        <h2>Selected Database</h2>
        {selectedDatabase ? (
          <div className="selected-database-card">
            <div className="database-info">
              <h3>{selectedDatabase.name}</h3>
              <p>{selectedDatabase.description || 'No description'}</p>
              <div className="database-details">
                <span>Host: {selectedDatabase.host}</span>
                <span>Database: {selectedDatabase.database_name}</span>
                <span>Schema: {selectedDatabase.schema_extracted ? '✅ Extracted' : '❌ Not extracted'}</span>
              </div>
            </div>
            <button 
              className="select-button"
              onClick={() => handleSelectDatabase(null)}
            >
              Clear Selection
            </button>
          </div>
        ) : (
          <div className="no-selection">
            <p>No database selected. Please select a database to use in chat.</p>
          </div>
        )}
      </div>

      {/* Available Databases Section */}
      <div className="settings-section">
        <h2>Available Databases</h2>
        {databases.length === 0 ? (
          <div className="no-databases">
            <p>No databases configured. {user?.role === 'admin' && 'Add your first database to get started!'}</p>
          </div>
        ) : (
          <div className="databases-list">
            {databases.map((db) => (
              <div key={db.id} className={`database-card ${selectedDatabase?.id === db.id ? 'selected' : ''}`}>
                <div className="database-header">
                  <h3>{db.name}</h3>
                  {selectedDatabase?.id === db.id && (
                    <span className="selected-badge">Selected</span>
                  )}
                </div>
                <p className="database-description">{db.description || 'No description'}</p>
                {db.instructions && (
                  <div className="database-instructions" style={{ 
                    marginTop: '8px', 
                    padding: '8px', 
                    backgroundColor: 'rgba(138, 43, 226, 0.1)', 
                    borderRadius: '4px',
                    fontSize: '13px',
                    color: '#ccc',
                    marginBottom: '8px'
                  }}>
                    <strong>Instructions:</strong> {db.instructions.substring(0, 150)}{db.instructions.length > 150 ? '...' : ''}
                  </div>
                )}
                <div className="database-details">
                  <div className="detail-item">
                    <strong>Host:</strong> {db.host}:{db.port}
                  </div>
                  <div className="detail-item">
                    <strong>Database:</strong> {db.database_name}
                  </div>
                  <div className="detail-item">
                    <strong>User:</strong> {db.username}
                  </div>
                  <div className="detail-item">
                    <strong>Type:</strong> {db.database_type === 'mysql' ? 'MySQL' : 'PostgreSQL'}
                  </div>
                  <div className="detail-item">
                    <strong>SSL:</strong> {db.ssl_enabled ? 'Enabled' : 'Disabled'}
                  </div>
                  <div className="detail-item">
                    <strong>Schema:</strong> {db.schema_extracted ? (
                      <span className="status-success">✅ Extracted</span>
                    ) : (
                      <span className="status-warning">❌ Not extracted</span>
                    )}
                  </div>
                </div>
                <div className="database-actions">
                  <button
                    className="select-button"
                    onClick={() => handleSelectDatabase(db.id)}
                    disabled={selectedDatabase?.id === db.id}
                  >
                    {selectedDatabase?.id === db.id ? 'Selected' : 'Select'}
                  </button>
                  {user?.role === 'admin' && (
                    <>
                      <button
                        className="test-button"
                        onClick={() => handleTestConnection(db)}
                        disabled={testingConnection === db.id}
                      >
                        {testingConnection === db.id ? 'Testing...' : 'Test Connection'}
                      </button>
                      <button
                        className="extract-button"
                        onClick={() => handleExtractSchema(db)}
                        disabled={extractingSchema === db.id}
                      >
                        {extractingSchema === db.id ? 'Extracting...' : 'Extract Schema'}
                      </button>
                      <button
                        className="edit-button"
                        onClick={() => handleEdit(db)}
                      >
                        Edit
                      </button>
                      <button
                        className="delete-button"
                        onClick={() => handleDelete(db.id)}
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Form Modal */}
      {showAddForm && (
        <div className="modal-overlay" onClick={() => {
          setShowAddForm(false);
          setEditingId(null);
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{editingId ? 'Edit Database' : 'Add New Database'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="e.g., Production Database"
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional description"
                  rows="2"
                />
              </div>
              <div className="form-group">
                <label>Instructions</label>
                <textarea
                  value={formData.instructions}
                  onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                  placeholder="Optional instructions for the LLM to better understand this database (e.g., business context, naming conventions, special rules)"
                  rows="4"
                />
                <small style={{ color: '#999', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                  These instructions will be added to the AI prompt to help generate better SQL queries for this database.
                </small>
              </div>
              <div className="form-group">
                <label>Database Type *</label>
                <select
                  value={formData.database_type}
                  onChange={(e) => {
                    const newType = e.target.value;
                    setFormData({ 
                      ...formData, 
                      database_type: newType,
                      port: newType === 'mysql' ? '3306' : '5432'
                    });
                  }}
                  required
                  className="database-type-select"
                >
                  <option value="postgresql">PostgreSQL</option>
                  <option value="mysql">MySQL</option>
                </select>
              </div>
              <div className="form-group">
                <label>Host *</label>
                <input
                  type="text"
                  value={formData.host}
                  onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                  required
                  placeholder="e.g., localhost or 192.168.1.100"
                />
              </div>
              <div className="form-group">
                <label>Port *</label>
                <input
                  type="number"
                  value={formData.port}
                  onChange={(e) => setFormData({ ...formData, port: e.target.value })}
                  required
                  placeholder={formData.database_type === 'mysql' ? '3306' : '5432'}
                />
              </div>
              <div className="form-group">
                <label>Database Name *</label>
                <input
                  type="text"
                  value={formData.database_name}
                  onChange={(e) => setFormData({ ...formData, database_name: e.target.value })}
                  required
                  placeholder="e.g., my_database"
                />
              </div>
              <div className="form-group">
                <label>Username *</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  required
                  placeholder="Database username"
                />
              </div>
              <div className="form-group">
                <label>Password *</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required={!editingId}
                  placeholder={editingId ? "Leave blank to keep current" : "Database password"}
                />
              </div>
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.ssl_enabled}
                    onChange={(e) => setFormData({ ...formData, ssl_enabled: e.target.checked })}
                  />
                  Enable SSL
                </label>
              </div>
              <div className="form-actions">
                <button type="submit" className="submit-button">
                  {editingId ? 'Update' : 'Add'} Database
                </button>
                <button
                  type="button"
                  className="cancel-button"
                  onClick={() => {
                    setShowAddForm(false);
                    setEditingId(null);
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Settings;

