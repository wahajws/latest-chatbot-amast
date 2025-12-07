import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import './Reports.css';

function Reports() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);
  const [period, setPeriod] = useState('year');
  const [reportType, setReportType] = useState('comprehensive');

  const generateReport = async () => {
    setLoading(true);
    setError(null);
    setReport(null);

    try {
      const response = await api.post('/reports/generate', {
        reportType,
        period,
      });

      if (response.data.success) {
        setReport(response.data.report);
      } else {
        setError(response.data.message || 'Failed to generate report');
      }
    } catch (err) {
      console.error('Error generating report:', err);
      setError(err.response?.data?.message || err.message || 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = () => {
    if (!report) return;

    const content = `# AMAST Business Intelligence Report\n\n**Period:** ${report.period}\n**Generated:** ${new Date(report.generatedAt).toLocaleString()}\n\n---\n\n${report.content}`;
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `amast-report-${report.period}-${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const customCodeStyle = {
    ...vscDarkPlus,
    'pre[class*="language-"]': {
      ...vscDarkPlus['pre[class*="language-"]'],
      background: '#1a1a2e',
      color: '#e2e8f0',
      border: '1px solid #4a4e69',
      borderRadius: '8px',
      padding: '1em',
    },
  };

  return (
    <div className="reports-container">
      <div className="reports-header">
        <div>
          <h1>AI Report Generator</h1>
          <p className="reports-subtitle">Generate comprehensive business intelligence reports powered by AI</p>
        </div>
        <div className="reports-controls">
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            className="report-type-selector"
          >
            <option value="comprehensive">Comprehensive Report</option>
            <option value="sales">Sales Analysis</option>
            <option value="inventory">Inventory Analysis</option>
            <option value="outlets">Outlet Performance</option>
          </select>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="period-selector"
          >
            <option value="day">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
          </select>
          <button
            onClick={generateReport}
            disabled={loading}
            className="generate-button"
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                Generating...
              </>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
                Generate Report
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <span>{error}</span>
        </div>
      )}

      {loading && (
        <div className="loading-state">
          <div className="loading-spinner-large"></div>
          <p>Generating comprehensive AI report...</p>
          <p className="loading-subtitle">This may take 30-60 seconds</p>
        </div>
      )}

      {report && !loading && (
        <div className="report-content">
          <div className="report-header-info">
            <div className="report-meta">
              <div className="meta-item">
                <span className="meta-label">Period:</span>
                <span className="meta-value">{period.charAt(0).toUpperCase() + period.slice(1)}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Type:</span>
                <span className="meta-value">{reportType.charAt(0).toUpperCase() + reportType.slice(1)}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Generated:</span>
                <span className="meta-value">{new Date(report.generatedAt).toLocaleString()}</span>
              </div>
            </div>
            <button onClick={downloadReport} className="download-button">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              Download Report
            </button>
          </div>

          <div className="report-summary-cards">
            <div className="summary-card">
              <div className="summary-icon">💰</div>
              <div className="summary-content">
                <div className="summary-label">Total Revenue</div>
                <div className="summary-value">
                  RM {parseFloat(report.dataSummary.totalRevenue || 0).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>
            <div className="summary-card">
              <div className="summary-icon">📄</div>
              <div className="summary-content">
                <div className="summary-label">Total Invoices</div>
                <div className="summary-value">{report.dataSummary.totalInvoices.toLocaleString()}</div>
              </div>
            </div>
            <div className="summary-card">
              <div className="summary-icon">🏪</div>
              <div className="summary-content">
                <div className="summary-label">Active Outlets</div>
                <div className="summary-value">{report.dataSummary.activeOutlets}</div>
              </div>
            </div>
            <div className="summary-card">
              <div className="summary-icon">📊</div>
              <div className="summary-content">
                <div className="summary-label">Data Points</div>
                <div className="summary-value">
                  {report.dataSummary.topOutletsCount} outlets, {report.dataSummary.topProductsCount} products
                </div>
              </div>
            </div>
          </div>

          <div className="report-body">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ node, ...props }) => <h1 className="report-h1" {...props} />,
                h2: ({ node, ...props }) => <h2 className="report-h2" {...props} />,
                h3: ({ node, ...props }) => <h3 className="report-h3" {...props} />,
                p: ({ node, ...props }) => <p className="report-p" {...props} />,
                ul: ({ node, ...props }) => <ul className="report-ul" {...props} />,
                ol: ({ node, ...props }) => <ol className="report-ol" {...props} />,
                li: ({ node, ...props }) => <li className="report-li" {...props} />,
                strong: ({ node, ...props }) => <strong className="report-strong" {...props} />,
                code({ node, inline, className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || '');
                  return !inline && match ? (
                    <SyntaxHighlighter
                      style={customCodeStyle}
                      language={match[1]}
                      PreTag="div"
                      {...props}
                    >
                      {String(children).replace(/\n$/, '')}
                    </SyntaxHighlighter>
                  ) : (
                    <code className="report-inline-code" {...props}>
                      {children}
                    </code>
                  );
                },
                table: ({ node, children, ...props }) => {
                  // Check if table has proper structure
                  const hasHeader = children?.some?.((child) => 
                    child?.props?.children?.some?.((row) => 
                      row?.props?.children?.some?.((cell) => cell?.type === 'th')
                    )
                  );
                  
                  return (
                    <div className="report-table-wrapper">
                      <table className="report-table" {...props}>
                        {children}
                      </table>
                    </div>
                  );
                },
                thead: ({ node, ...props }) => <thead className="report-thead" {...props} />,
                tbody: ({ node, ...props }) => <tbody className="report-tbody" {...props} />,
                tr: ({ node, ...props }) => <tr className="report-tr" {...props} />,
                th: ({ node, ...props }) => <th className="report-th" {...props} />,
                td: ({ node, ...props }) => <td className="report-td" {...props} />,
                blockquote: ({ node, ...props }) => (
                  <blockquote className="report-blockquote" {...props} />
                ),
              }}
            >
              {report.content}
            </ReactMarkdown>
          </div>
        </div>
      )}

      {!report && !loading && (
        <div className="empty-state">
          <div className="empty-icon">📊</div>
          <h2>Generate Your First Report</h2>
          <p>Select a report type and period, then click "Generate Report" to create a comprehensive AI-powered business intelligence report.</p>
          <div className="empty-features">
            <div className="feature-item">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              <span>Comprehensive data analysis</span>
            </div>
            <div className="feature-item">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              <span>AI-powered insights</span>
            </div>
            <div className="feature-item">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              <span>Actionable recommendations</span>
            </div>
            <div className="feature-item">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              <span>Export to markdown</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Reports;
