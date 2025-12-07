import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import api from '../services/api';
import './Dashboard.css';

function Dashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('year');
  const [metrics, setMetrics] = useState(null);
  const [salesTrend, setSalesTrend] = useState([]);
  const [topOutlets, setTopOutlets] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [inventoryAlerts, setInventoryAlerts] = useState(null);
  const [priceGroupSales, setPriceGroupSales] = useState([]);

  useEffect(() => {
    loadDashboardData();
  }, [period]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [metricsRes, trendRes, outletsRes, productsRes, alertsRes, priceGroupRes] = await Promise.allSettled([
        api.get(`/dashboard/metrics?period=${period}`),
        api.get(`/dashboard/sales-trend?period=${period}&granularity=${period === 'year' ? 'month' : 'day'}`),
        api.get(`/dashboard/top-outlets?limit=10&period=${period}`),
        api.get(`/dashboard/top-products?limit=10&period=${period}`),
        api.get('/dashboard/inventory-alerts?limit=10'),
        api.get(`/dashboard/sales-by-price-group?period=${period}`),
      ]);

      if (metricsRes.status === 'fulfilled') {
        setMetrics(metricsRes.value.data.metrics);
      }
      if (trendRes.status === 'fulfilled') {
        setSalesTrend(trendRes.value.data.data || []);
      }
      if (outletsRes.status === 'fulfilled') {
        setTopOutlets(outletsRes.value.data.outlets || []);
      }
      if (productsRes.status === 'fulfilled') {
        setTopProducts(productsRes.value.data.products || []);
      }
      if (alertsRes.status === 'fulfilled') {
        setInventoryAlerts(alertsRes.value.data);
      }
      if (priceGroupRes.status === 'fulfilled') {
        setPriceGroupSales(priceGroupRes.value.data.data || []);
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
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

  const COLORS = ['#6366f1', '#8b5cf6', '#a855f7', '#c084fc', '#d8b4fe', '#e9d5ff'];

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="dashboard-loading">
          <div className="loading-spinner-large"></div>
          <p>Loading dashboard data...</p>
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
        <div className="dashboard-controls">
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
          <button onClick={loadDashboardData} className="refresh-button">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="23 4 23 10 17 10"></polyline>
              <polyline points="1 20 1 14 7 14"></polyline>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
            </svg>
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card kpi-revenue">
          <div className="kpi-icon">💰</div>
          <div className="kpi-content">
            <div className="kpi-label">Total Revenue</div>
            <div className="kpi-value">{formatCurrency(metrics?.totalRevenue || 0)}</div>
            <div className="kpi-meta">{formatNumber(metrics?.totalInvoices || 0)} invoices</div>
          </div>
        </div>

        <div className="kpi-card kpi-outlets">
          <div className="kpi-icon">🏪</div>
          <div className="kpi-content">
            <div className="kpi-label">Active Outlets</div>
            <div className="kpi-value">{formatNumber(metrics?.activeOutlets || 0)}</div>
            <div className="kpi-meta">of {formatNumber(metrics?.totalOutlets || 0)} total</div>
          </div>
        </div>

        <div className="kpi-card kpi-inventory">
          <div className="kpi-icon">📦</div>
          <div className="kpi-content">
            <div className="kpi-label">Inventory Value</div>
            <div className="kpi-value">{formatCurrency(metrics?.inventoryValue || 0)}</div>
            <div className="kpi-meta">{formatNumber(metrics?.lowStockItems || 0)} low stock items</div>
          </div>
        </div>

        <div className="kpi-card kpi-avg-invoice">
          <div className="kpi-icon">📊</div>
          <div className="kpi-content">
            <div className="kpi-label">Avg Invoice Value</div>
            <div className="kpi-value">{formatCurrency(metrics?.avgInvoiceValue || 0)}</div>
            <div className="kpi-meta">Per transaction</div>
          </div>
        </div>

        <div className="kpi-card kpi-alerts">
          <div className="kpi-icon">⚠️</div>
          <div className="kpi-content">
            <div className="kpi-label">Stock Alerts</div>
            <div className="kpi-value">{formatNumber(metrics?.outOfStockItems || 0)}</div>
            <div className="kpi-meta">Out of stock items</div>
          </div>
        </div>

        <div className="kpi-card kpi-credit-notes">
          <div className="kpi-icon">📝</div>
          <div className="kpi-content">
            <div className="kpi-label">Credit Notes</div>
            <div className="kpi-value">{formatCurrency(metrics?.totalCreditNotes || 0)}</div>
            <div className="kpi-meta">Total issued</div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="charts-row">
        <div className="chart-card">
          <h3>Sales Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={salesTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(99, 102, 241, 0.2)" />
              <XAxis 
                dataKey="date" 
                stroke="#cbd5e1"
                style={{ fontSize: '12px' }}
              />
              <YAxis 
                stroke="#cbd5e1"
                style={{ fontSize: '12px' }}
                tickFormatter={(value) => `$${value / 1000}k`}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'rgba(30, 41, 59, 0.95)',
                  border: '1px solid rgba(99, 102, 241, 0.3)',
                  borderRadius: '12px',
                  color: '#e2e8f0',
                }}
                formatter={(value) => formatCurrency(value)}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="revenue" 
                stroke="#6366f1" 
                strokeWidth={3}
                dot={{ fill: '#6366f1', r: 4 }}
                name="Revenue"
              />
              <Line 
                type="monotone" 
                dataKey="invoiceCount" 
                stroke="#8b5cf6" 
                strokeWidth={2}
                dot={{ fill: '#8b5cf6', r: 3 }}
                name="Invoices"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3>Sales by Price Group</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={priceGroupSales}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ priceGroup, percent }) => `${priceGroup}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="revenue"
              >
                {priceGroupSales.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'rgba(30, 41, 59, 0.95)',
                  border: '1px solid rgba(99, 102, 241, 0.3)',
                  borderRadius: '12px',
                  color: '#e2e8f0',
                }}
                formatter={(value) => formatCurrency(value)}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tables Row */}
      <div className="tables-row">
        <div className="table-card">
          <h3>Top Outlets by Revenue</h3>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Outlet Name</th>
                  <th>Revenue</th>
                  <th>Invoices</th>
                  <th>Avg Value</th>
                </tr>
              </thead>
              <tbody>
                {topOutlets.map((outlet, index) => (
                  <tr key={outlet.id}>
                    <td className="rank-cell">#{index + 1}</td>
                    <td className="name-cell">{outlet.name}</td>
                    <td className="revenue-cell">{formatCurrency(outlet.revenue)}</td>
                    <td>{formatNumber(outlet.invoiceCount)}</td>
                    <td>{formatCurrency(outlet.avgInvoiceValue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="table-card">
          <h3>Top Products by Sales</h3>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Product Name</th>
                  <th>Revenue</th>
                  <th>Quantity</th>
                  <th>Orders</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.map((product, index) => (
                  <tr key={product.skuId}>
                    <td className="rank-cell">#{index + 1}</td>
                    <td className="name-cell">{product.name}</td>
                    <td className="revenue-cell">{formatCurrency(product.revenue)}</td>
                    <td>{formatNumber(product.quantity)}</td>
                    <td>{formatNumber(product.invoiceCount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Inventory Alerts */}
      <div className="alerts-section">
        <div className="alert-card alert-low-stock">
          <h3>⚠️ Low Stock Items</h3>
          <div className="alert-list">
            {inventoryAlerts?.lowStock?.slice(0, 5).map((item, index) => (
              <div key={`${item.skuId}-${index}`} className="alert-item">
                <span className="alert-product">{item.name}</span>
                <span className="alert-quantity">{formatNumber(item.quantity)} units</span>
                <span className="alert-sites">Site: {item.siteId}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="alert-card alert-out-stock">
          <h3>🚨 Out of Stock</h3>
          <div className="alert-list">
            {inventoryAlerts?.outOfStock?.slice(0, 5).map((item, index) => (
              <div key={`${item.skuId}-${index}`} className="alert-item">
                <span className="alert-product">{item.name}</span>
                <span className="alert-sites">Site: {item.siteId}</span>
              </div>
            ))}
          </div>
        </div>

        {inventoryAlerts?.negativeStock?.length > 0 && (
          <div className="alert-card alert-negative">
            <h3>⚠️ Data Issues (Negative Stock)</h3>
            <div className="alert-list">
              {inventoryAlerts.negativeStock.slice(0, 5).map((item, index) => (
                <div key={index} className="alert-item">
                  <span className="alert-product">{item.name}</span>
                  <span className="alert-quantity">{formatNumber(item.quantity)} units</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;

