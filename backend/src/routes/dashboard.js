const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { query } = require('../config/database');
const logger = require('../services/loggerService');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get key metrics (KPIs)
router.get('/metrics', async (req, res) => {
  try {
    const { period = 'month' } = req.query; // day, week, month, year
    
    // Calculate date range
    const now = new Date();
    let startDate;
    switch (period) {
      case 'day':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    // Total Revenue (from invoices)
    const revenueQuery = `
      SELECT COALESCE(SUM(grand_total), 0) as total_revenue
      FROM invoices
      WHERE (voided = false OR voided IS NULL)
        AND date >= $1
        AND date <= $2
    `;
    const revenueResult = await query(revenueQuery, [startDate, now]);

    // Total Invoices Count
    const invoicesQuery = `
      SELECT COUNT(*) as total_invoices
      FROM invoices
      WHERE (voided = false OR voided IS NULL)
        AND date >= $1
        AND date <= $2
    `;
    const invoicesResult = await query(invoicesQuery, [startDate, now]);

    // Active Outlets (outlets with invoices in period)
    const outletsQuery = `
      SELECT COUNT(DISTINCT outlet_id) as active_outlets
      FROM invoices
      WHERE (voided = false OR voided IS NULL)
        AND date >= $1
        AND date <= $2
    `;
    const outletsResult = await query(outletsQuery, [startDate, now]);

    // Total Outlets
    const totalOutletsQuery = `
      SELECT COUNT(*) as total_outlets
      FROM outlets
      WHERE status = 'active' OR status IS NULL
    `;
    const totalOutletsResult = await query(totalOutletsQuery);

    // Inventory Value (current stock) - use inventory table
    const inventoryQuery = `
      SELECT COALESCE(SUM(quantity), 0) as inventory_value
      FROM inventory
      WHERE quantity > 0
    `;
    let inventoryResult = { rows: [{ inventory_value: 0 }] };
    try {
      inventoryResult = await query(inventoryQuery);
    } catch (e) {
      logger.debug('Inventory query failed, using default', { error: e.message });
    }

    // Low Stock Items (quantity < 100)
    const lowStockQuery = `
      SELECT COUNT(DISTINCT sku_id) as low_stock_items
      FROM inventory
      WHERE quantity < 100 AND quantity >= 0
    `;
    let lowStockResult = { rows: [{ low_stock_items: 0 }] };
    try {
      lowStockResult = await query(lowStockQuery);
    } catch (e) {
      logger.debug('Low stock query failed, using default', { error: e.message });
    }

    // Out of Stock Items
    const outOfStockQuery = `
      SELECT COUNT(DISTINCT sku_id) as out_of_stock_items
      FROM inventory
      WHERE quantity = 0
    `;
    let outOfStockResult = { rows: [{ out_of_stock_items: 0 }] };
    try {
      outOfStockResult = await query(outOfStockQuery);
    } catch (e) {
      logger.debug('Out of stock query failed, using default', { error: e.message });
    }

    // Average Invoice Value
    const avgInvoiceQuery = `
      SELECT COALESCE(AVG(grand_total), 0) as avg_invoice_value
      FROM invoices
      WHERE (voided = false OR voided IS NULL)
        AND date >= $1
        AND date <= $2
    `;
    const avgInvoiceResult = await query(avgInvoiceQuery, [startDate, now]);

    // Credit Notes Total
    const creditNotesQuery = `
      SELECT COALESCE(SUM(grand_total), 0) as total_credit_notes
      FROM credit_notes
      WHERE (voided = false OR voided IS NULL)
        AND date >= $1
        AND date <= $2
    `;
    let creditNotesResult = { rows: [{ total_credit_notes: 0 }] };
    try {
      creditNotesResult = await query(creditNotesQuery, [startDate, now]);
    } catch (e) {
      // Table might not exist or have different structure
      logger.debug('Credit notes query failed, using default', { error: e.message });
    }

    res.json({
      period,
      startDate: startDate.toISOString(),
      endDate: now.toISOString(),
      metrics: {
        totalRevenue: parseFloat(revenueResult.rows[0].total_revenue || 0),
        totalInvoices: parseInt(invoicesResult.rows[0].total_invoices || 0),
        activeOutlets: parseInt(outletsResult.rows[0].active_outlets || 0),
        totalOutlets: parseInt(totalOutletsResult.rows[0].total_outlets || 0),
        inventoryValue: parseFloat(inventoryResult.rows[0].inventory_value || 0),
        lowStockItems: parseInt(lowStockResult.rows[0].low_stock_items || 0),
        outOfStockItems: parseInt(outOfStockResult.rows[0].out_of_stock_items || 0),
        avgInvoiceValue: parseFloat(avgInvoiceResult.rows[0].avg_invoice_value || 0),
        totalCreditNotes: parseFloat(creditNotesResult.rows[0].total_credit_notes || 0),
      },
    });
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

// Get sales trend (daily/monthly)
router.get('/sales-trend', async (req, res) => {
  try {
    const { period = 'month', granularity = 'day' } = req.query; // period: week, month, year; granularity: day, week, month
    
    const now = new Date();
    let startDate;
    switch (period) {
      case 'week':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    let dateFormat, groupBy;
    if (granularity === 'day') {
      dateFormat = "TO_CHAR(date, 'YYYY-MM-DD')";
      groupBy = "DATE(date)";
    } else if (granularity === 'week') {
      dateFormat = "TO_CHAR(date, 'IYYY-IW')";
      groupBy = "DATE_TRUNC('week', date)";
    } else {
      dateFormat = "TO_CHAR(date, 'YYYY-MM')";
      groupBy = "DATE_TRUNC('month', date)";
    }

    const trendQuery = `
      SELECT 
        ${dateFormat} as date,
        ${groupBy} as date_group,
        COALESCE(SUM(grand_total), 0) as revenue,
        COUNT(*) as invoice_count,
        COALESCE(AVG(grand_total), 0) as avg_invoice_value
      FROM invoices
      WHERE (voided = false OR voided IS NULL)
        AND date >= $1
        AND date <= $2
      GROUP BY ${groupBy}, ${dateFormat}
      ORDER BY date_group ASC
    `;
    const result = await query(trendQuery, [startDate, now]);

    res.json({
      period,
      granularity,
      data: result.rows.map(row => ({
        date: row.date,
        revenue: parseFloat(row.revenue || 0),
        invoiceCount: parseInt(row.invoice_count || 0),
        avgInvoiceValue: parseFloat(row.avg_invoice_value || 0),
      })),
    });
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({ error: 'Failed to fetch sales trend' });
  }
});

// Get top outlets by revenue
router.get('/top-outlets', async (req, res) => {
  try {
    const { limit = 10, period = 'month' } = req.query;
    
    const now = new Date();
    let startDate;
    switch (period) {
      case 'week':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const outletsQuery = `
      SELECT 
        o.id,
        o.name as outlet_name,
        COALESCE(SUM(i.grand_total), 0) as total_revenue,
        COUNT(i.id) as invoice_count,
        COALESCE(AVG(i.grand_total), 0) as avg_invoice_value
      FROM outlets o
      LEFT JOIN invoices i ON o.id = i.outlet_id 
        AND (i.voided = false OR i.voided IS NULL)
        AND i.date >= $1
        AND i.date <= $2
      WHERE o.status = 'active' OR o.status IS NULL
      GROUP BY o.id, o.name
      HAVING SUM(i.grand_total) > 0
      ORDER BY total_revenue DESC
      LIMIT $3
    `;
    const result = await query(outletsQuery, [startDate, now, parseInt(limit)]);

    res.json({
      period,
      outlets: result.rows.map(row => ({
        id: row.id,
        name: row.outlet_name,
        revenue: parseFloat(row.total_revenue || 0),
        invoiceCount: parseInt(row.invoice_count || 0),
        avgInvoiceValue: parseFloat(row.avg_invoice_value || 0),
      })),
    });
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({ error: 'Failed to fetch top outlets' });
  }
});

// Get top products by sales
router.get('/top-products', async (req, res) => {
  try {
    const { limit = 10, period = 'month' } = req.query;
    
    const now = new Date();
    let startDate;
    switch (period) {
      case 'week':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const productsQuery = `
      SELECT 
        s.id as sku_id,
        s.name as product_name,
        COALESCE(SUM(id.quantity), 0) as total_quantity,
        COALESCE(SUM(id.line_total), 0) as total_revenue,
        COUNT(DISTINCT id.invoice_id) as invoice_count
      FROM skus s
      LEFT JOIN invoice_details id ON s.id = id.sku_id
      LEFT JOIN invoices i ON id.invoice_id = i.id
        AND (i.voided = false OR i.voided IS NULL)
        AND i.date >= $1
        AND i.date <= $2
      GROUP BY s.id, s.name
      HAVING SUM(id.line_total) > 0
      ORDER BY total_revenue DESC
      LIMIT $3
    `;

    const result = await query(productsQuery, [startDate, now, parseInt(limit)]);

    res.json({
      period,
      products: result.rows.map(row => ({
        skuId: row.sku_id,
        name: row.product_name,
        quantity: parseFloat(row.total_quantity || 0),
        revenue: parseFloat(row.total_revenue || 0),
        invoiceCount: parseInt(row.invoice_count || 0),
      })),
    });
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({ error: 'Failed to fetch top products' });
  }
});

// Get inventory alerts
router.get('/inventory-alerts', async (req, res) => {
  try {
    const { limit = 20 } = req.query;

    // Low stock items
    const lowStockQuery = `
      SELECT 
        s.id as sku_id,
        s.name as product_name,
        i.site_id,
        i.quantity,
        i.condition
      FROM inventory i
      JOIN skus s ON i.sku_id = s.id
      WHERE i.quantity < 100 AND i.quantity > 0
      ORDER BY i.quantity ASC
      LIMIT $1
    `;

    // Out of stock items
    const outOfStockQuery = `
      SELECT 
        s.id as sku_id,
        s.name as product_name,
        i.site_id,
        i.condition
      FROM inventory i
      JOIN skus s ON i.sku_id = s.id
      WHERE i.quantity = 0
      ORDER BY s.name
      LIMIT $1
    `;

    // Negative stock (data issues)
    const negativeStockQuery = `
      SELECT 
        s.id as sku_id,
        s.name as product_name,
        i.site_id,
        i.quantity,
        i.condition
      FROM inventory i
      JOIN skus s ON i.sku_id = s.id
      WHERE i.quantity < 0
      ORDER BY i.quantity ASC
      LIMIT $1
    `;

    const [lowStock, outOfStock, negativeStock] = await Promise.all([
      query(lowStockQuery, [parseInt(limit)]),
      query(outOfStockQuery, [parseInt(limit)]),
      query(negativeStockQuery, [parseInt(limit)]),
    ]);

    res.json({
      lowStock: lowStock.rows.map(row => ({
        skuId: row.sku_id,
        name: row.product_name,
        siteId: row.site_id,
        quantity: parseInt(row.quantity || 0),
        condition: row.condition,
        status: 'low',
      })),
      outOfStock: outOfStock.rows.map(row => ({
        skuId: row.sku_id,
        name: row.product_name,
        siteId: row.site_id,
        condition: row.condition,
        status: 'out',
      })),
      negativeStock: negativeStock.rows.map(row => ({
        skuId: row.sku_id,
        name: row.product_name,
        siteId: row.site_id,
        quantity: parseInt(row.quantity || 0),
        condition: row.condition,
        status: 'negative',
      })),
    });
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({ error: 'Failed to fetch inventory alerts' });
  }
});

// Get sales by price group
router.get('/sales-by-price-group', async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    
    const now = new Date();
    let startDate;
    switch (period) {
      case 'week':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    // Get price_group from outlets (invoices table doesn't have price_group)
    const priceGroupQuery = `
      SELECT 
        COALESCE(o.price_group, 'Unknown') as price_group,
        COALESCE(SUM(i.grand_total), 0) as total_revenue,
        COUNT(*) as invoice_count,
        COALESCE(AVG(i.grand_total), 0) as avg_invoice_value
      FROM invoices i
      JOIN outlets o ON i.outlet_id = o.id
      WHERE (i.voided = false OR i.voided IS NULL)
        AND i.date >= $1
        AND i.date <= $2
      GROUP BY o.price_group
      ORDER BY total_revenue DESC
    `;
    let result = { rows: [] };
    try {
      result = await query(priceGroupQuery, [startDate, now]);
    } catch (e) {
      logger.debug('Price group query failed', { error: e.message });
    }

    res.json({
      period,
      data: result.rows.map(row => ({
        priceGroup: row.price_group || 'Unknown',
        revenue: parseFloat(row.total_revenue || 0),
        invoiceCount: parseInt(row.invoice_count || 0),
        avgInvoiceValue: parseFloat(row.avg_invoice_value || 0),
      })),
    });
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({ error: 'Failed to fetch sales by price group' });
  }
});

module.exports = router;

