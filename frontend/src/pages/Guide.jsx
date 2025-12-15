import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import './Guide.css';

function Guide() {
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState('getting-started');
  const [expandedItems, setExpandedItems] = useState({});

  const toggleExpand = (id) => {
    setExpandedItems(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const sections = [
    { id: 'getting-started', label: 'Getting Started', icon: '🚀' },
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'chatbot', label: 'AI Chatbot', icon: '💬' },
    { id: 'reports', label: 'Reports', icon: '📄' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
    { id: 'tips', label: 'Tips & Tricks', icon: '💡' },
    { id: 'faq', label: 'FAQ', icon: '❓' },
  ];

  return (
    <div className="guide-container">
      <div className="guide-header">
        <div>
          <h1>AMAST Analytics Platform Guide</h1>
          <p className="guide-subtitle">Your comprehensive guide to mastering the platform</p>
        </div>
        <div className="guide-badge">
          <span className="badge-icon">📚</span>
          <span>Interactive Guide</span>
        </div>
      </div>

      <div className="guide-content-wrapper">
        <div className="guide-sidebar">
          <nav className="guide-nav">
            {sections.map(section => (
              <button
                key={section.id}
                className={`guide-nav-item ${activeSection === section.id ? 'active' : ''}`}
                onClick={() => setActiveSection(section.id)}
              >
                <span className="nav-icon">{section.icon}</span>
                <span className="nav-label">{section.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="guide-main-content">
          {activeSection === 'getting-started' && <GettingStartedSection />}
          {activeSection === 'dashboard' && <DashboardSection toggleExpand={toggleExpand} expandedItems={expandedItems} />}
          {activeSection === 'chatbot' && <ChatbotSection toggleExpand={toggleExpand} expandedItems={expandedItems} />}
          {activeSection === 'reports' && <ReportsSection toggleExpand={toggleExpand} expandedItems={expandedItems} />}
          {activeSection === 'settings' && <SettingsSection toggleExpand={toggleExpand} expandedItems={expandedItems} user={user} />}
          {activeSection === 'tips' && <TipsSection toggleExpand={toggleExpand} expandedItems={expandedItems} />}
          {activeSection === 'faq' && <FAQSection toggleExpand={toggleExpand} expandedItems={expandedItems} />}
        </div>
      </div>
    </div>
  );
}

// Getting Started Section
function GettingStartedSection() {
  return (
    <div className="guide-section">
      <div className="section-header">
        <h2>🚀 Getting Started</h2>
        <p className="section-description">Welcome to AMAST Analytics Platform! Let's get you started on your journey.</p>
      </div>

      <div className="steps-container">
        <div className="step-card">
          <div className="step-number">1</div>
          <div className="step-content">
            <h3>Database Setup</h3>
            <p>First, you need to connect your database. Only administrators can add and configure databases.</p>
            <div className="step-details">
              <ul>
                <li>Go to <strong>Settings</strong> (Admin only)</li>
                <li>Click <strong>"Add Database"</strong></li>
                <li>Enter connection details (host, port, username, password)</li>
                <li>Choose database type (PostgreSQL or MySQL)</li>
                <li>Test the connection</li>
                <li>Extract the schema to enable AI features</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="step-card">
          <div className="step-number">2</div>
          <div className="step-content">
            <h3>Schema Extraction</h3>
            <p>After connecting, extract the database schema. This enables the AI to understand your data structure.</p>
            <div className="step-details">
              <ul>
                <li>Click <strong>"Extract Schema"</strong> in Settings</li>
                <li>Wait for the process to complete (may take 1-2 minutes)</li>
                <li>The system analyzes all tables, columns, and relationships</li>
                <li>Schema is cached for fast AI responses</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="step-card">
          <div className="step-number">3</div>
          <div className="step-content">
            <h3>Select Active Database</h3>
            <p>Admins select which database is active for all users. This is the database used for Dashboard, Reports, and Chat.</p>
            <div className="step-details">
              <ul>
                <li>In Settings, find your database in the list</li>
                <li>Click <strong>"Set as Active"</strong></li>
                <li>This database will be used across all features</li>
                <li>Only one database can be active at a time</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="step-card">
          <div className="step-number">4</div>
          <div className="step-content">
            <h3>Start Exploring</h3>
            <p>Now you're ready! Explore the Dashboard, ask questions in Chat, or generate Reports.</p>
            <div className="step-details">
              <ul>
                <li><strong>Dashboard:</strong> Create visual insights and KPIs</li>
                <li><strong>Chatbot:</strong> Ask natural language questions about your data</li>
                <li><strong>Reports:</strong> Generate comprehensive business intelligence reports</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="info-box success">
        <div className="info-icon">✅</div>
        <div>
          <h4>Pro Tip</h4>
          <p>Add database-specific instructions in Settings to help the AI better understand your business context and terminology.</p>
        </div>
      </div>
    </div>
  );
}

// Dashboard Section
function DashboardSection({ toggleExpand, expandedItems }) {
  return (
    <div className="guide-section">
      <div className="section-header">
        <h2>📊 Dashboard Guide</h2>
        <p className="section-description">Create beautiful, interactive dashboards with AI-powered insights.</p>
      </div>

      <div className="feature-grid">
        <div className="feature-card">
          <div className="feature-icon">✨</div>
          <h3>Auto-Generate Dashboard</h3>
          <p>Let AI create a complete dashboard for you with one click!</p>
          <button 
            className="expand-button"
            onClick={() => toggleExpand('auto-gen')}
          >
            {expandedItems['auto-gen'] ? 'Hide Details' : 'Show Details'}
          </button>
          {expandedItems['auto-gen'] && (
            <div className="expand-content">
              <ol>
                <li>Click <strong>"Auto-Generate Dashboard"</strong> button</li>
                <li>AI analyzes your database schema</li>
                <li>Generates 8-12 relevant insights automatically</li>
                <li>Creates KPIs, charts, and tables</li>
                <li>All insights are saved and ready to view</li>
              </ol>
              <p className="note">💡 This feature creates insights based on common business metrics like revenue, sales trends, top products, etc.</p>
            </div>
          )}
        </div>

        <div className="feature-card">
          <div className="feature-icon">🎨</div>
          <h3>Visual Query Builder</h3>
          <p>Create custom insights without writing SQL - just point and click!</p>
          <button 
            className="expand-button"
            onClick={() => toggleExpand('query-builder')}
          >
            {expandedItems['query-builder'] ? 'Hide Details' : 'Show Details'}
          </button>
          {expandedItems['query-builder'] && (
            <div className="expand-content">
              <ol>
                <li>Click <strong>"Add Insight"</strong></li>
                <li>Select tables from the checklist</li>
                <li>Add metrics (SUM, COUNT, AVG, etc.)</li>
                <li>Choose grouping columns for charts</li>
                <li>Add filters and time ranges</li>
                <li>Select widget type (KPI, Line Chart, Bar Chart, Pie Chart, Table)</li>
                <li>Click <strong>"Build & Preview SQL"</strong></li>
                <li>Review the preview and save</li>
              </ol>
              <p className="note">💡 The Query Builder automatically generates correct SQL for your database type (PostgreSQL or MySQL).</p>
            </div>
          )}
        </div>

        <div className="feature-card">
          <div className="feature-icon">✏️</div>
          <h3>Edit Insights</h3>
          <p>Modify any dashboard widget to change metrics, filters, or visualization.</p>
          <button 
            className="expand-button"
            onClick={() => toggleExpand('edit-insights')}
          >
            {expandedItems['edit-insights'] ? 'Hide Details' : 'Show Details'}
          </button>
          {expandedItems['edit-insights'] && (
            <div className="expand-content">
              <ol>
                <li>Hover over any dashboard widget</li>
                <li>Click the <strong>pencil icon</strong> (Edit button)</li>
                <li>Query Builder opens with all current settings</li>
                <li>Modify tables, metrics, filters, etc.</li>
                <li>Click <strong>"Build & Preview SQL"</strong> to see changes</li>
                <li>Click <strong>"Update Insight"</strong> to save</li>
              </ol>
              <p className="note">💡 All your original configuration is preserved, so you can easily tweak existing insights.</p>
            </div>
          )}
        </div>

        <div className="feature-card">
          <div className="feature-icon">📈</div>
          <h3>Widget Types</h3>
          <p>Choose the perfect visualization for your data.</p>
          <button 
            className="expand-button"
            onClick={() => toggleExpand('widget-types')}
          >
            {expandedItems['widget-types'] ? 'Hide Details' : 'Show Details'}
          </button>
          {expandedItems['widget-types'] && (
            <div className="expand-content">
              <div className="widget-types-list">
                <div className="widget-type-item">
                  <strong>KPI Card:</strong> Single number/metric (e.g., Total Revenue)
                </div>
                <div className="widget-type-item">
                  <strong>Line Chart:</strong> Time series data (e.g., Sales over time)
                </div>
                <div className="widget-type-item">
                  <strong>Bar Chart:</strong> Categorical comparison (e.g., Top products)
                </div>
                <div className="widget-type-item">
                  <strong>Pie Chart:</strong> Distribution/breakdown (e.g., Sales by category)
                </div>
                <div className="widget-type-item">
                  <strong>Table:</strong> Detailed data listing
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="info-box tip">
        <div className="info-icon">💡</div>
        <div>
          <h4>Best Practices</h4>
          <ul>
            <li>Start with Auto-Generate to get a baseline dashboard</li>
            <li>Use KPI cards for key metrics you check frequently</li>
            <li>Use line charts for trends over time</li>
            <li>Use bar charts for comparing categories</li>
            <li>Delete insights you don't need to keep the dashboard clean</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

// Chatbot Section
function ChatbotSection({ toggleExpand, expandedItems }) {
  return (
    <div className="guide-section">
      <div className="section-header">
        <h2>💬 AI Chatbot Guide</h2>
        <p className="section-description">Ask questions in natural language and get instant answers from your data.</p>
      </div>

      <div className="feature-grid">
        <div className="feature-card">
          <div className="feature-icon">🗣️</div>
          <h3>Natural Language Queries</h3>
          <p>Ask questions just like you would ask a colleague!</p>
          <button 
            className="expand-button"
            onClick={() => toggleExpand('nl-queries')}
          >
            {expandedItems['nl-queries'] ? 'Hide Examples' : 'Show Examples'}
          </button>
          {expandedItems['nl-queries'] && (
            <div className="expand-content">
              <div className="example-queries">
                <div className="example-query">
                  <strong>Example 1:</strong>
                  <p>"What was the total revenue last month?"</p>
                </div>
                <div className="example-query">
                  <strong>Example 2:</strong>
                  <p>"Show me the top 10 products by sales this year"</p>
                </div>
                <div className="example-query">
                  <strong>Example 3:</strong>
                  <p>"Which outlets have the highest sales in the last 30 days?"</p>
                </div>
                <div className="example-query">
                  <strong>Example 4:</strong>
                  <p>"Compare sales between this month and last month"</p>
                </div>
                <div className="example-query">
                  <strong>Example 5:</strong>
                  <p>"What products are low in stock?"</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="feature-card">
          <div className="feature-icon">🧠</div>
          <h3>How It Works</h3>
          <p>The AI understands your question and generates SQL automatically.</p>
          <button 
            className="expand-button"
            onClick={() => toggleExpand('how-it-works')}
          >
            {expandedItems['how-it-works'] ? 'Hide Details' : 'Show Details'}
          </button>
          {expandedItems['how-it-works'] && (
            <div className="expand-content">
              <ol>
                <li><strong>Question Analysis:</strong> AI identifies what you're asking</li>
                <li><strong>Table Identification:</strong> Finds relevant tables in your database</li>
                <li><strong>SQL Generation:</strong> Creates database-specific SQL query</li>
                <li><strong>Query Execution:</strong> Runs the query safely (SELECT only)</li>
                <li><strong>Result Formatting:</strong> Presents data in a readable format</li>
                <li><strong>Error Handling:</strong> If query fails, AI tries to fix it automatically</li>
              </ol>
            </div>
          )}
        </div>

        <div className="feature-card">
          <div className="feature-icon">🔒</div>
          <h3>Security Features</h3>
          <p>Your data is protected with multiple security layers.</p>
          <button 
            className="expand-button"
            onClick={() => toggleExpand('security')}
          >
            {expandedItems['security'] ? 'Hide Details' : 'Show Details'}
          </button>
          {expandedItems['security'] && (
            <div className="expand-content">
              <ul>
                <li>Only SELECT queries are allowed (no INSERT, UPDATE, DELETE)</li>
                <li>SQL injection protection</li>
                <li>Query validation before execution</li>
                <li>Automatic query refinement on errors</li>
                <li>Database credentials are encrypted</li>
              </ul>
            </div>
          )}
        </div>

        <div className="feature-card">
          <div className="feature-icon">🎯</div>
          <h3>Tips for Better Results</h3>
          <p>Get the most accurate answers with these tips.</p>
          <button 
            className="expand-button"
            onClick={() => toggleExpand('chat-tips')}
          >
            {expandedItems['chat-tips'] ? 'Hide Tips' : 'Show Tips'}
          </button>
          {expandedItems['chat-tips'] && (
            <div className="expand-content">
              <ul>
                <li>Be specific about time periods (e.g., "last month", "this year")</li>
                <li>Use business terms (e.g., "revenue", "sales", "customers")</li>
                <li>Ask follow-up questions to refine results</li>
                <li>If a query fails, rephrase your question</li>
                <li>Use the database instructions in Settings to teach the AI your terminology</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Reports Section
function ReportsSection({ toggleExpand, expandedItems }) {
  return (
    <div className="guide-section">
      <div className="section-header">
        <h2>📄 Reports Guide</h2>
        <p className="section-description">Generate comprehensive business intelligence reports powered by AI.</p>
      </div>

      <div className="feature-grid">
        <div className="feature-card">
          <div className="feature-icon">📊</div>
          <h3>Report Types</h3>
          <p>Choose from different report types based on your needs.</p>
          <button 
            className="expand-button"
            onClick={() => toggleExpand('report-types')}
          >
            {expandedItems['report-types'] ? 'Hide Details' : 'Show Details'}
          </button>
          {expandedItems['report-types'] && (
            <div className="expand-content">
              <div className="report-types-list">
                <div className="report-type-item">
                  <strong>Comprehensive Report:</strong> Complete business overview with all metrics
                </div>
                <div className="report-type-item">
                  <strong>Sales Analysis:</strong> Focused on sales performance and trends
                </div>
                <div className="report-type-item">
                  <strong>Inventory Analysis:</strong> Stock levels, alerts, and recommendations
                </div>
                <div className="report-type-item">
                  <strong>Outlet Performance:</strong> Analysis of outlet sales and rankings
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="feature-card">
          <div className="feature-icon">📅</div>
          <h3>Time Periods</h3>
          <p>Select the time range for your report.</p>
          <button 
            className="expand-button"
            onClick={() => toggleExpand('time-periods')}
          >
            {expandedItems['time-periods'] ? 'Hide Details' : 'Show Details'}
          </button>
          {expandedItems['time-periods'] && (
            <div className="expand-content">
              <ul>
                <li><strong>Today:</strong> Data from today only</li>
                <li><strong>This Week:</strong> Last 7 days</li>
                <li><strong>This Month:</strong> Current month</li>
                <li><strong>This Year:</strong> Current year</li>
              </ul>
            </div>
          )}
        </div>

        <div className="feature-card">
          <div className="feature-icon">📥</div>
          <h3>Export Reports</h3>
          <p>Download your reports in Markdown format.</p>
          <button 
            className="expand-button"
            onClick={() => toggleExpand('export')}
          >
            {expandedItems['export'] ? 'Hide Details' : 'Show Details'}
          </button>
          {expandedItems['export'] && (
            <div className="expand-content">
              <ol>
                <li>Generate a report</li>
                <li>Click <strong>"Download Report"</strong> button</li>
                <li>Report downloads as a .md (Markdown) file</li>
                <li>Open in any Markdown viewer or text editor</li>
                <li>Share with your team or include in presentations</li>
              </ol>
            </div>
          )}
        </div>

        <div className="feature-card">
          <div className="feature-icon">🤖</div>
          <h3>AI-Powered Insights</h3>
          <p>Reports include AI-generated insights and recommendations.</p>
          <button 
            className="expand-button"
            onClick={() => toggleExpand('ai-insights')}
          >
            {expandedItems['ai-insights'] ? 'Hide Details' : 'Show Details'}
          </button>
          {expandedItems['ai-insights'] && (
            <div className="expand-content">
              <p>Each report includes:</p>
              <ul>
                <li>Executive summary</li>
                <li>Data-driven analysis</li>
                <li>Trend identification</li>
                <li>Actionable recommendations</li>
                <li>Risk factors and alerts</li>
                <li>Performance comparisons</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Settings Section
function SettingsSection({ toggleExpand, expandedItems, user }) {
  return (
    <div className="guide-section">
      <div className="section-header">
        <h2>⚙️ Settings Guide</h2>
        <p className="section-description">Configure databases and manage platform settings (Admin only).</p>
      </div>

      {user?.role !== 'admin' && (
        <div className="info-box warning">
          <div className="info-icon">🔒</div>
          <div>
            <h4>Admin Only</h4>
            <p>Settings page is only accessible to administrators. Contact your admin to configure databases.</p>
          </div>
        </div>
      )}

      <div className="feature-grid">
        <div className="feature-card">
          <div className="feature-icon">🗄️</div>
          <h3>Add Database</h3>
          <p>Connect PostgreSQL or MySQL databases to the platform.</p>
          <button 
            className="expand-button"
            onClick={() => toggleExpand('add-db')}
          >
            {expandedItems['add-db'] ? 'Hide Steps' : 'Show Steps'}
          </button>
          {expandedItems['add-db'] && (
            <div className="expand-content">
              <ol>
                <li>Click <strong>"Add Database"</strong> button</li>
                <li>Enter database name (for identification)</li>
                <li>Select database type (PostgreSQL or MySQL)</li>
                <li>Enter connection details:
                  <ul>
                    <li>Host (e.g., localhost or IP address)</li>
                    <li>Port (default: 5432 for PostgreSQL, 3306 for MySQL)</li>
                    <li>Username</li>
                    <li>Password</li>
                    <li>Database name</li>
                  </ul>
                </li>
                <li>Click <strong>"Test Connection"</strong> to verify</li>
                <li>If successful, click <strong>"Save"</strong></li>
              </ol>
            </div>
          )}
        </div>

        <div className="feature-card">
          <div className="feature-icon">🔍</div>
          <h3>Extract Schema</h3>
          <p>Analyze database structure to enable AI features.</p>
          <button 
            className="expand-button"
            onClick={() => toggleExpand('extract-schema')}
          >
            {expandedItems['extract-schema'] ? 'Hide Details' : 'Show Details'}
          </button>
          {expandedItems['extract-schema'] && (
            <div className="expand-content">
              <ol>
                <li>Select a database from the list</li>
                <li>Click <strong>"Extract Schema"</strong></li>
                <li>Wait for analysis (1-2 minutes for large databases)</li>
                <li>System extracts:
                  <ul>
                    <li>All tables and columns</li>
                    <li>Data types and constraints</li>
                    <li>Foreign key relationships</li>
                    <li>Indexes and primary keys</li>
                    <li>Sample data (for context)</li>
                  </ul>
                </li>
                <li>Schema is cached for fast AI responses</li>
              </ol>
            </div>
          )}
        </div>

        <div className="feature-card">
          <div className="feature-icon">⭐</div>
          <h3>Set Active Database</h3>
          <p>Choose which database is used across all features.</p>
          <button 
            className="expand-button"
            onClick={() => toggleExpand('active-db')}
          >
            {expandedItems['active-db'] ? 'Hide Details' : 'Show Details'}
          </button>
          {expandedItems['active-db'] && (
            <div className="expand-content">
              <ol>
                <li>Find your database in the list</li>
                <li>Click <strong>"Set as Active"</strong></li>
                <li>This database becomes the default for:
                  <ul>
                    <li>Dashboard insights</li>
                    <li>Chatbot queries</li>
                    <li>Report generation</li>
                  </ul>
                </li>
                <li>Only one database can be active at a time</li>
                <li>All users will see data from the active database</li>
              </ol>
            </div>
          )}
        </div>

        <div className="feature-card">
          <div className="feature-icon">📝</div>
          <h3>Database Instructions</h3>
          <p>Add custom instructions to help AI understand your database better.</p>
          <button 
            className="expand-button"
            onClick={() => toggleExpand('instructions')}
          >
            {expandedItems['instructions'] ? 'Hide Details' : 'Show Details'}
          </button>
          {expandedItems['instructions'] && (
            <div className="expand-content">
              <p>Add instructions like:</p>
              <ul>
                <li>Business terminology mappings</li>
                <li>Special column meanings</li>
                <li>Data conventions</li>
                <li>Common query patterns</li>
              </ul>
              <p className="note">💡 Example: "Invoices table: 'grand_total' represents final amount after discounts. 'voided' flag indicates cancelled invoices."</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Tips Section
function TipsSection({ toggleExpand, expandedItems }) {
  return (
    <div className="guide-section">
      <div className="section-header">
        <h2>💡 Tips & Tricks</h2>
        <p className="section-description">Pro tips to maximize your productivity and get the most out of the platform.</p>
      </div>

      <div className="tips-grid">
        <div className="tip-card">
          <div className="tip-icon">🎯</div>
          <h3>Start with Auto-Generate</h3>
          <p>Use Auto-Generate Dashboard first to get a baseline, then customize individual insights.</p>
        </div>

        <div className="tip-card">
          <div className="tip-icon">🔄</div>
          <h3>Refresh Regularly</h3>
          <p>Dashboard widgets refresh automatically, but you can manually refresh by reloading the page.</p>
        </div>

        <div className="tip-card">
          <div className="tip-icon">📊</div>
          <h3>Mix Widget Types</h3>
          <p>Combine KPIs, charts, and tables for a comprehensive view of your business.</p>
        </div>

        <div className="tip-card">
          <div className="tip-icon">💬</div>
          <h3>Be Specific in Chat</h3>
          <p>Include time periods, filters, and specific metrics in your questions for better results.</p>
        </div>

        <div className="tip-card">
          <div className="tip-icon">🔍</div>
          <h3>Use Filters Wisely</h3>
          <p>Add filters in Query Builder to focus on specific data subsets (e.g., specific outlets, date ranges).</p>
        </div>

        <div className="tip-card">
          <div className="tip-icon">📈</div>
          <h3>Time-Based Insights</h3>
          <p>Use time range filters to compare periods and identify trends.</p>
        </div>

        <div className="tip-card">
          <div className="tip-icon">🎨</div>
          <h3>Visual Best Practices</h3>
          <p>Use line charts for trends, bar charts for comparisons, and pie charts for distributions.</p>
        </div>

        <div className="tip-card">
          <div className="tip-icon">⚡</div>
          <h3>Performance Tips</h3>
          <p>Limit query results to reasonable sizes (use LIMIT) to keep dashboards fast.</p>
        </div>
      </div>
    </div>
  );
}

// FAQ Section
function FAQSection({ toggleExpand, expandedItems }) {
  const faqs = [
    {
      id: 'faq-1',
      question: 'How do I add a new database?',
      answer: 'Only administrators can add databases. Go to Settings → Add Database, enter connection details, test the connection, and save. Then extract the schema to enable AI features.'
    },
    {
      id: 'faq-2',
      question: 'Can I use multiple databases at once?',
      answer: 'Only one database can be active at a time. Admins select which database is active, and all users see data from that database. You can switch between databases, but only one is active at any given time.'
    },
    {
      id: 'faq-3',
      question: 'How does the AI understand my database?',
      answer: 'The AI uses the extracted schema which includes table structures, column types, relationships, and sample data. You can also add custom instructions in Settings to help the AI understand your business terminology.'
    },
    {
      id: 'faq-4',
      question: 'Is my data secure?',
      answer: 'Yes! Database passwords are encrypted, only SELECT queries are allowed (no data modification), and all queries are validated before execution. SQL injection protection is built-in.'
    },
    {
      id: 'faq-5',
      question: 'Can I edit dashboard insights?',
      answer: 'Yes! Admins can click the edit (pencil) icon on any widget to modify its configuration using the Query Builder.'
    },
    {
      id: 'faq-6',
      question: 'What if a query fails?',
      answer: 'The AI automatically tries to fix failed queries. If it still fails, try rephrasing your question or check that the relevant tables exist in your database.'
    },
    {
      id: 'faq-7',
      question: 'How long does schema extraction take?',
      answer: 'It depends on database size. Small databases (few tables) take 30-60 seconds. Large databases (hundreds of tables) may take 2-5 minutes.'
    },
    {
      id: 'faq-8',
      question: 'Can I export dashboard data?',
      answer: 'Currently, you can export reports as Markdown files. Dashboard data export features may be added in future updates.'
    },
    {
      id: 'faq-9',
      question: 'Why can\'t I see the Settings page?',
      answer: 'Settings is only visible to administrators. Regular users cannot add or modify databases. Contact your admin for database configuration.'
    },
    {
      id: 'faq-10',
      question: 'What database types are supported?',
      answer: 'Currently, PostgreSQL and MySQL are fully supported. The system automatically detects the database type and generates appropriate SQL syntax.'
    }
  ];

  return (
    <div className="guide-section">
      <div className="section-header">
        <h2>❓ Frequently Asked Questions</h2>
        <p className="section-description">Find answers to common questions about the platform.</p>
      </div>

      <div className="faq-list">
        {faqs.map(faq => (
          <div key={faq.id} className="faq-item">
            <button
              className="faq-question"
              onClick={() => toggleExpand(faq.id)}
            >
              <span className="faq-icon">{expandedItems[faq.id] ? '▼' : '▶'}</span>
              <span>{faq.question}</span>
            </button>
            {expandedItems[faq.id] && (
              <div className="faq-answer">
                <p>{faq.answer}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default Guide;



