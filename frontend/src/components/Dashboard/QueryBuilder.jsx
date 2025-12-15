import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import api from '../../services/api';
import './QueryBuilder.css';

function QueryBuilder({ editItem, onClose, onSave, formatCurrency, formatNumber }) {
  const [schema, setSchema] = useState(null);
  const [loading, setLoading] = useState(true);
  const [buildingSQL, setBuildingSQL] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [generatedSQL, setGeneratedSQL] = useState(null);
  const [error, setError] = useState(null);

  // Form state
  const [selectedTables, setSelectedTables] = useState([]);
  const [metrics, setMetrics] = useState([{ column: '', function: 'sum', alias: '' }]);
  const [groupBy, setGroupBy] = useState([]);
  const [filters, setFilters] = useState([]);
  const [timeRange, setTimeRange] = useState('');
  const [timeColumn, setTimeColumn] = useState('');
  const [widgetType, setWidgetType] = useState('table');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [limit, setLimit] = useState(100);

  useEffect(() => {
    loadSchema();
  }, []);

  useEffect(() => {
    if (editItem && schema) {
      loadEditData();
    }
  }, [editItem, schema]);

  const loadEditData = async () => {
    if (!editItem) return;

    // Set basic info
    setTitle(editItem.title || '');
    setDescription(editItem.description || '');
    setWidgetType(editItem.widget_type || 'table');
    setGeneratedSQL(editItem.sql_query || null);

    // Try to load query builder selections from widget_config
    const widgetConfig = typeof editItem.widget_config === 'string' 
      ? JSON.parse(editItem.widget_config) 
      : editItem.widget_config;

    if (widgetConfig && widgetConfig.queryBuilderSelections) {
      const selections = widgetConfig.queryBuilderSelections;
      setSelectedTables(selections.tables || []);
      setMetrics(selections.metrics && selections.metrics.length > 0 
        ? selections.metrics 
        : [{ column: '', function: 'sum', alias: '' }]);
      setGroupBy(selections.groupBy || []);
      setFilters(selections.filters || []);
      setTimeRange(selections.timeRange || '');
      setTimeColumn(selections.timeColumn || '');
      setLimit(selections.limit || 100);
    } else {
      // If no query builder data (e.g., created via AI), show a message
      // User can still see the SQL and modify it
      setError('This insight was created via AI. You can view the SQL below. To edit with Query Builder, you may need to rebuild it.');
    }

    // Auto-preview if SQL exists
    if (editItem.sql_query) {
      try {
        await previewQuery(editItem.sql_query);
      } catch (error) {
        console.error('Error previewing existing query:', error);
      }
    }
  };

  const loadSchema = async () => {
    try {
      const response = await api.get('/dashboard-items/query-builder/schema');
      setSchema(response.data.schema);
    } catch (error) {
      console.error('Error loading schema:', error);
      setError('Failed to load database schema. Please ensure schema is extracted.');
    } finally {
      setLoading(false);
    }
  };

  const handleTableSelect = (tableName) => {
    if (selectedTables.includes(tableName)) {
      setSelectedTables(selectedTables.filter(t => t !== tableName));
    } else {
      setSelectedTables([...selectedTables, tableName]);
    }
  };

  const handleAddMetric = () => {
    setMetrics([...metrics, { column: '', function: 'sum', alias: '' }]);
  };

  const handleRemoveMetric = (index) => {
    setMetrics(metrics.filter((_, i) => i !== index));
  };

  const handleMetricChange = (index, field, value) => {
    const newMetrics = [...metrics];
    newMetrics[index][field] = value;
    setMetrics(newMetrics);
  };

  const handleAddGroupBy = () => {
    setGroupBy([...groupBy, '']);
  };

  const handleRemoveGroupBy = (index) => {
    setGroupBy(groupBy.filter((_, i) => i !== index));
  };

  const handleGroupByChange = (index, value) => {
    const newGroupBy = [...groupBy];
    newGroupBy[index] = value;
    setGroupBy(newGroupBy);
  };

  const handleAddFilter = () => {
    setFilters([...filters, { column: '', operator: 'equals', value: '' }]);
  };

  const handleRemoveFilter = (index) => {
    setFilters(filters.filter((_, i) => i !== index));
  };

  const handleFilterChange = (index, field, value) => {
    const newFilters = [...filters];
    newFilters[index][field] = value;
    setFilters(newFilters);
  };

  const handleBuildSQL = async () => {
    if (selectedTables.length === 0) {
      setError('Please select at least one table');
      return;
    }

    if (widgetType === 'kpi' && metrics.length === 0) {
      setError('Please add at least one metric for KPI');
      return;
    }

    setBuildingSQL(true);
    setError(null);

    try {
      const selections = {
        tables: selectedTables,
        metrics: metrics.filter(m => m.column),
        groupBy: groupBy.filter(gb => gb),
        filters: filters.filter(f => f.column),
        timeRange: timeRange || null,
        timeColumn: timeColumn || null,
        limit,
        widgetType,
      };

      const response = await api.post('/dashboard-items/query-builder/build-sql', { selections });
      setGeneratedSQL(response.data.sql);

      // Preview the query
      await previewQuery(response.data.sql);
    } catch (error) {
      console.error('Error building SQL:', error);
      setError(error.response?.data?.error || 'Failed to build SQL query');
    } finally {
      setBuildingSQL(false);
    }
  };

  const previewQuery = async (sql) => {
    try {
      const response = await api.post('/dashboard-items/preview-insight', {
        sql_query: sql,
        widget_type: widgetType,
      });

      if (response.data.success) {
        // Ensure data is in the correct format
        const formattedData = response.data.data;
        
        // For charts, ensure data is an array
        if (widgetType !== 'kpi' && widgetType !== 'table') {
          if (!Array.isArray(formattedData)) {
            console.warn('Chart data is not an array, converting...', formattedData);
            // Try to extract array from object
            if (formattedData && typeof formattedData === 'object') {
              if (Array.isArray(formattedData.rows)) {
                // Convert rows to chart format
                const columns = formattedData.columns || [];
                if (columns.length >= 2) {
                  const chartData = formattedData.rows.map(row => ({
                    name: String(row[columns[0]] || ''),
                    value: parseFloat(row[columns[1]]) || 0,
                  }));
                  setPreviewData({ ...response.data, data: chartData });
                  return;
                }
              }
            }
            setPreviewData({ ...response.data, data: [] });
            return;
          }
        }
        
        setPreviewData(response.data);
      } else {
        setError('Query executed but returned no data');
      }
    } catch (error) {
      console.error('Error previewing query:', error);
      setError(error.response?.data?.error || 'Failed to preview query');
    }
  };

  const handlePreviewExistingSQL = async () => {
    if (!generatedSQL) {
      setError('No SQL query available');
      return;
    }
    setBuildingSQL(true);
    setError(null);
    try {
      await previewQuery(generatedSQL);
    } catch (error) {
      console.error('Error previewing SQL:', error);
      setError(error.response?.data?.error || 'Failed to preview query');
    } finally {
      setBuildingSQL(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      setError('Please enter a title for this insight');
      return;
    }

    if (!generatedSQL) {
      setError('Please build and preview the query first');
      return;
    }

    try {
      // Store query builder selections in widget_config for future editing
      const queryBuilderSelections = {
        tables: selectedTables,
        metrics: metrics.filter(m => m.column),
        groupBy: groupBy.filter(gb => gb),
        filters: filters.filter(f => f.column),
        timeRange: timeRange || null,
        timeColumn: timeColumn || null,
        limit,
        widgetType,
      };

      const widgetConfig = {
        ...(previewData || {}),
        queryBuilderSelections,
      };

      if (editItem) {
        // Update existing item
        await api.put(`/dashboard-items/${editItem.id}`, {
          title,
          description,
          widget_type: widgetType,
          widget_config: widgetConfig,
          sql_query: generatedSQL,
        });
      } else {
        // Create new item
        await api.post('/dashboard-items', {
          title,
          description,
          widget_type: widgetType,
          widget_config: widgetConfig,
          sql_query: generatedSQL,
        });
      }

      if (onSave) {
        onSave();
      }
    } catch (error) {
      console.error('Error saving insight:', error);
      setError(error.response?.data?.error || 'Failed to save insight');
    }
  };

  const getAvailableColumns = (tableName) => {
    if (!schema || !tableName) return [];
    const table = schema.tables.find(t => t.name === tableName);
    return table ? table.columns : [];
  };

  const getAllColumns = () => {
    if (!schema) return [];
    const allColumns = [];
    selectedTables.forEach(tableName => {
      const table = schema.tables.find(t => t.name === tableName);
      if (table) {
        table.columns.forEach(col => {
          allColumns.push({
            value: `${tableName}.${col.name}`,
            label: `${table.displayName}.${col.displayName}`,
            table: tableName,
            column: col.name,
            type: col.type,
            category: col.category,
          });
        });
      }
    });
    return allColumns;
  };

  const renderPreviewWidget = () => {
    if (!previewData || !previewData.success) {
      return <p>No preview data available</p>;
    }

    // Helper function to ensure data is an array
    const getChartData = () => {
      const data = previewData.data;
      if (!data) return [];
      if (Array.isArray(data)) return data;
      // If data is an object, try to extract array from common structures
      if (data.rows && Array.isArray(data.rows)) return data.rows;
      if (data.data && Array.isArray(data.data)) return data.data;
      return [];
    };

    const chartData = getChartData();

    switch (widgetType) {
      case 'kpi':
        const kpiData = previewData.data;
        const kpiValue = typeof kpiData === 'object' && kpiData !== null 
          ? (kpiData.value || kpiData.data?.value || 0)
          : (typeof kpiData === 'number' ? kpiData : 0);
        const kpiLabel = typeof kpiData === 'object' && kpiData !== null
          ? (kpiData.label || kpiData.data?.label || title)
          : title;
        return (
          <div className="widget-kpi">
            <div className="kpi-value-large">
              {formatCurrency(kpiValue)}
            </div>
            <div className="kpi-label-large">{kpiLabel}</div>
          </div>
        );

      case 'line_chart':
        if (!Array.isArray(chartData) || chartData.length === 0) {
          return <p className="preview-no-data">No data available for line chart</p>;
        }
        // Validate chart data structure
        const validLineData = chartData.filter(item => 
          item && typeof item === 'object' && ('name' in item || 'value' in item)
        );
        if (validLineData.length === 0) {
          return <p className="preview-no-data">Invalid data format for line chart</p>;
        }
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={validLineData}>
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
        if (!Array.isArray(chartData) || chartData.length === 0) {
          return <p className="preview-no-data">No data available for bar chart</p>;
        }
        // Validate chart data structure
        const validBarData = chartData.filter(item => 
          item && typeof item === 'object' && ('name' in item || 'value' in item)
        );
        if (validBarData.length === 0) {
          return <p className="preview-no-data">Invalid data format for bar chart</p>;
        }
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={validBarData}>
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
        if (!Array.isArray(chartData) || chartData.length === 0) {
          return <p className="preview-no-data">No data available for pie chart</p>;
        }
        // Validate chart data structure
        const validPieData = chartData.filter(item => 
          item && typeof item === 'object' && ('name' in item || 'value' in item)
        );
        if (validPieData.length === 0) {
          return <p className="preview-no-data">Invalid data format for pie chart</p>;
        }
        const COLORS = ['#2563eb', '#3b82f6', '#1d4ed8', '#60a5fa', '#1e40af', '#1e3a8a'];
        return (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={validPieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {validPieData.map((entry, index) => (
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
        const tableColumns = previewData.data?.columns || previewData.columns || [];
        const tableRows = previewData.data?.rows || [];
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
        return <p>Unknown widget type</p>;
    }
  };

  if (loading) {
    return (
      <div className="query-builder-loading">
        <div className="loading-spinner"></div>
        <p>Loading database schema...</p>
      </div>
    );
  }

  if (error && !schema) {
    return (
      <div className="query-builder-error">
        <p>{error}</p>
        <button onClick={onClose} className="primary-button">Close</button>
      </div>
    );
  }

  return (
    <div className="query-builder">
      <div className="query-builder-header">
        <h2>{editItem ? 'Edit Insight' : 'Create Insight'} - Visual Query Builder</h2>
        <button className="modal-close" onClick={onClose}>×</button>
      </div>

      <div className="query-builder-content">
        {error && (
          <div className="query-builder-error-message">
            <p>{error}</p>
          </div>
        )}

        <div className="query-builder-form">
          {/* Basic Info */}
          <div className="form-section">
            <h3>Basic Information</h3>
            <div className="form-group">
              <label>Title *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Total Revenue This Month"
              />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
                rows="2"
              />
            </div>
            <div className="form-group">
              <label>Widget Type *</label>
              <select value={widgetType} onChange={(e) => setWidgetType(e.target.value)}>
                <option value="kpi">KPI Card</option>
                <option value="line_chart">Line Chart</option>
                <option value="bar_chart">Bar Chart</option>
                <option value="pie_chart">Pie Chart</option>
                <option value="table">Table</option>
              </select>
            </div>
          </div>

          {/* Tables */}
          <div className="form-section">
            <h3>Select Tables *</h3>
            <div className="table-selector">
              {schema?.tables.map(table => (
                <label key={table.name} className="table-checkbox">
                  <input
                    type="checkbox"
                    checked={selectedTables.includes(table.name)}
                    onChange={() => handleTableSelect(table.name)}
                  />
                  <span>{table.displayName}</span>
                  <small>({table.rowCount.toLocaleString()} rows)</small>
                </label>
              ))}
            </div>
          </div>

          {/* Metrics */}
          <div className="form-section">
            <h3>Metrics {widgetType === 'kpi' && '*'}</h3>
            {metrics.map((metric, index) => (
              <div key={index} className="metric-row">
                <select
                  value={metric.column}
                  onChange={(e) => handleMetricChange(index, 'column', e.target.value)}
                  className="metric-column"
                >
                  <option value="">Select column...</option>
                  {getAllColumns()
                    .filter(col => col.category === 'numeric')
                    .map(col => (
                      <option key={col.value} value={col.value}>
                        {col.label} ({col.type})
                      </option>
                    ))}
                </select>
                <select
                  value={metric.function}
                  onChange={(e) => handleMetricChange(index, 'function', e.target.value)}
                  className="metric-function"
                >
                  <option value="sum">SUM</option>
                  <option value="count">COUNT</option>
                  <option value="avg">AVG</option>
                  <option value="min">MIN</option>
                  <option value="max">MAX</option>
                  <option value="distinct_count">DISTINCT COUNT</option>
                  <option value="none">None (Raw Value)</option>
                </select>
                {metrics.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveMetric(index)}
                    className="remove-button"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
            <button type="button" onClick={handleAddMetric} className="add-button">
              + Add Metric
            </button>
          </div>

          {/* Group By */}
          {widgetType !== 'kpi' && (
            <div className="form-section">
              <h3>Group By (for charts)</h3>
              {groupBy.map((gb, index) => (
                <div key={index} className="groupby-row">
                  <select
                    value={gb}
                    onChange={(e) => handleGroupByChange(index, e.target.value)}
                    className="groupby-select"
                  >
                    <option value="">Select column...</option>
                    {getAllColumns()
                      .filter(col => col.category !== 'numeric')
                      .map(col => (
                        <option key={col.value} value={col.value}>
                          {col.label}
                        </option>
                      ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => handleRemoveGroupBy(index)}
                    className="remove-button"
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button type="button" onClick={handleAddGroupBy} className="add-button">
                + Add Group By
              </button>
            </div>
          )}

          {/* Time Range */}
          <div className="form-section">
            <h3>Time Range (Optional)</h3>
            <div className="time-range-row">
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="time-range-select"
              >
                <option value="">No time filter</option>
                <option value="today">Today</option>
                <option value="this_week">This Week</option>
                <option value="this_month">This Month</option>
                <option value="this_year">This Year</option>
                <option value="last_7_days">Last 7 Days</option>
                <option value="last_30_days">Last 30 Days</option>
                <option value="last_90_days">Last 90 Days</option>
              </select>
              {timeRange && (
                <select
                  value={timeColumn}
                  onChange={(e) => setTimeColumn(e.target.value)}
                  className="time-column-select"
                >
                  <option value="">Select date column...</option>
                  {schema?.dateColumns.map(col => (
                    <option key={`${col.table}.${col.column}`} value={`${col.table}.${col.column}`}>
                      {col.displayName}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Filters */}
          <div className="form-section">
            <h3>Filters (Optional)</h3>
            {filters.map((filter, index) => (
              <div key={index} className="filter-row">
                <select
                  value={filter.column}
                  onChange={(e) => handleFilterChange(index, 'column', e.target.value)}
                  className="filter-column"
                >
                  <option value="">Select column...</option>
                  {getAllColumns().map(col => (
                    <option key={col.value} value={col.value}>
                      {col.label}
                    </option>
                  ))}
                </select>
                <select
                  value={filter.operator}
                  onChange={(e) => handleFilterChange(index, 'operator', e.target.value)}
                  className="filter-operator"
                >
                  <option value="equals">Equals</option>
                  <option value="not_equals">Not Equals</option>
                  <option value="greater_than">Greater Than</option>
                  <option value="less_than">Less Than</option>
                  <option value="greater_or_equal">Greater or Equal</option>
                  <option value="less_or_equal">Less or Equal</option>
                  <option value="contains">Contains</option>
                  <option value="starts_with">Starts With</option>
                  <option value="ends_with">Ends With</option>
                  <option value="is_null">Is Null</option>
                  <option value="is_not_null">Is Not Null</option>
                  <option value="in">In (comma-separated)</option>
                </select>
                {!['is_null', 'is_not_null'].includes(filter.operator) && (
                  <input
                    type="text"
                    value={filter.value}
                    onChange={(e) => handleFilterChange(index, 'value', e.target.value)}
                    placeholder="Value"
                    className="filter-value"
                  />
                )}
                <button
                  type="button"
                  onClick={() => handleRemoveFilter(index)}
                  className="remove-button"
                >
                  Remove
                </button>
              </div>
            ))}
            <button type="button" onClick={handleAddFilter} className="add-button">
              + Add Filter
            </button>
          </div>

          {/* Limit */}
          <div className="form-section">
            <div className="form-group">
              <label>Result Limit</label>
              <input
                type="number"
                value={limit}
                onChange={(e) => setLimit(parseInt(e.target.value) || 100)}
                min="1"
                max="1000"
              />
            </div>
          </div>
        </div>

        {/* Preview Section */}
        {generatedSQL && (
          <div className="query-builder-preview">
            <div className="sql-preview-header">
              <h3>{editItem ? 'Current SQL' : 'Generated SQL'}</h3>
              {editItem && (
                <button
                  onClick={handlePreviewExistingSQL}
                  disabled={buildingSQL}
                  className="preview-sql-button"
                >
                  {buildingSQL ? 'Previewing...' : 'Preview SQL'}
                </button>
              )}
            </div>
            <pre className="sql-preview">{generatedSQL}</pre>
          </div>
        )}

        {previewData && (
          <div className="query-builder-preview-data">
            <h3>Preview</h3>
            <div className="preview-widget-container">
              {renderPreviewWidget()}
            </div>
          </div>
        )}
      </div>

      <div className="query-builder-actions">
        <button onClick={onClose} className="secondary-button">Cancel</button>
        <button
          onClick={handleBuildSQL}
          disabled={buildingSQL || selectedTables.length === 0}
          className="primary-button"
        >
          {buildingSQL ? 'Building...' : 'Build & Preview SQL'}
        </button>
        {generatedSQL && (
          <button
            onClick={handleSave}
            disabled={!title.trim()}
            className="primary-button"
          >
            {editItem ? 'Update Insight' : 'Save to Dashboard'}
          </button>
        )}
      </div>
    </div>
  );
}

export default QueryBuilder;

