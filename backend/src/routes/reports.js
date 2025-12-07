const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { query } = require('../config/database');
const { callQwenAPI } = require('../config/qwen');
const { getPDFContent } = require('../services/pdfService');
const logger = require('../services/loggerService');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Generate comprehensive AI report
router.post('/generate', async (req, res) => {
  try {
    const { reportType = 'comprehensive', period = 'year' } = req.body;
    const userId = req.user.userId;

    logger.info('Generating AI report', { userId, reportType, period });

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
        startDate = new Date(now.getFullYear(), 0, 1);
    }

    // Gather comprehensive data
    const dataPromises = {
      // Sales Overview
      salesOverview: query(`
        SELECT 
          COUNT(*) as total_invoices,
          COALESCE(SUM(grand_total), 0) as total_revenue,
          COALESCE(AVG(grand_total), 0) as avg_invoice_value,
          COUNT(DISTINCT outlet_id) as active_outlets,
          COUNT(DISTINCT DATE(date)) as active_days
        FROM invoices
        WHERE (voided = false OR voided IS NULL)
          AND date >= $1 AND date <= $2
      `, [startDate, now]),

      // Top Outlets
      topOutlets: query(`
        SELECT 
          o.name as outlet_name,
          o.price_group,
          COALESCE(SUM(i.grand_total), 0) as total_revenue,
          COUNT(i.id) as invoice_count,
          COALESCE(AVG(i.grand_total), 0) as avg_invoice_value
        FROM outlets o
        LEFT JOIN invoices i ON o.id = i.outlet_id 
          AND (i.voided = false OR i.voided IS NULL)
          AND i.date >= $1 AND i.date <= $2
        GROUP BY o.id, o.name, o.price_group
        HAVING SUM(i.grand_total) > 0
        ORDER BY total_revenue DESC
        LIMIT 20
      `, [startDate, now]),

      // Top Products
      topProducts: query(`
        SELECT 
          s.name as product_name,
          s.category,
          COALESCE(SUM(id.quantity), 0) as total_quantity,
          COALESCE(SUM(id.line_total), 0) as total_revenue,
          COUNT(DISTINCT id.invoice_id) as order_count,
          COALESCE(AVG(id.line_total / NULLIF(id.quantity, 0)), 0) as avg_price
        FROM skus s
        LEFT JOIN invoice_details id ON s.id = id.sku_id
        LEFT JOIN invoices i ON id.invoice_id = i.id
          AND (i.voided = false OR i.voided IS NULL)
          AND i.date >= $1 AND i.date <= $2
        GROUP BY s.id, s.name, s.category
        HAVING SUM(id.line_total) > 0
        ORDER BY total_revenue DESC
        LIMIT 30
      `, [startDate, now]),

      // Sales Trend
      salesTrend: query(`
        SELECT 
          TO_CHAR(date, 'YYYY-MM') as month,
          COUNT(*) as invoice_count,
          COALESCE(SUM(grand_total), 0) as revenue
        FROM invoices
        WHERE (voided = false OR voided IS NULL)
          AND date >= $1 AND date <= $2
        GROUP BY TO_CHAR(date, 'YYYY-MM')
        ORDER BY month ASC
      `, [startDate, now]),

      // Inventory Status
      inventoryStatus: query(`
        SELECT 
          COUNT(DISTINCT sku_id) as total_products,
          COUNT(*) as total_locations,
          SUM(CASE WHEN quantity = 0 THEN 1 ELSE 0 END) as out_of_stock,
          SUM(CASE WHEN quantity > 0 AND quantity < 100 THEN 1 ELSE 0 END) as low_stock,
          SUM(CASE WHEN quantity < 0 THEN 1 ELSE 0 END) as negative_stock,
          COALESCE(SUM(quantity), 0) as total_quantity
        FROM inventory
      `),

      // Price Group Analysis
      priceGroupAnalysis: query(`
        SELECT 
          o.price_group,
          COUNT(DISTINCT o.id) as outlet_count,
          COALESCE(SUM(i.grand_total), 0) as total_revenue,
          COUNT(i.id) as invoice_count,
          COALESCE(AVG(i.grand_total), 0) as avg_invoice_value
        FROM outlets o
        LEFT JOIN invoices i ON o.id = i.outlet_id
          AND (i.voided = false OR i.voided IS NULL)
          AND i.date >= $1 AND i.date <= $2
        GROUP BY o.price_group
        ORDER BY total_revenue DESC
      `, [startDate, now]),

      // Credit Notes
      creditNotes: query(`
        SELECT 
          COUNT(*) as total_credit_notes,
          COALESCE(SUM(grand_total), 0) as total_amount
        FROM credit_notes
        WHERE (voided = false OR voided IS NULL)
          AND date >= $1 AND date <= $2
      `, [startDate, now]),

      // Category Performance
      categoryPerformance: query(`
        SELECT 
          s.category,
          COUNT(DISTINCT s.id) as product_count,
          COALESCE(SUM(id.quantity), 0) as total_quantity,
          COALESCE(SUM(id.line_total), 0) as total_revenue
        FROM skus s
        LEFT JOIN invoice_details id ON s.id = id.sku_id
        LEFT JOIN invoices i ON id.invoice_id = i.id
          AND (i.voided = false OR i.voided IS NULL)
          AND i.date >= $1 AND i.date <= $2
        WHERE s.category IS NOT NULL
        GROUP BY s.category
        HAVING SUM(id.line_total) > 0
        ORDER BY total_revenue DESC
        LIMIT 20
      `, [startDate, now]),
    };

    // Execute all queries
    const results = await Promise.all(Object.values(dataPromises));
    const data = {
      salesOverview: results[0].rows[0],
      topOutlets: results[1].rows,
      topProducts: results[2].rows,
      salesTrend: results[3].rows,
      inventoryStatus: results[4].rows[0],
      priceGroupAnalysis: results[5].rows,
      creditNotes: results[6].rows[0],
      categoryPerformance: results[7].rows,
    };

    // Get PDF manual content for context
    const pdfContent = getPDFContent();

    // Generate comprehensive report using Qwen
    const reportPrompt = `You are a senior business analyst for AMAST DMS (Distribution Management System). Generate a comprehensive, professional business intelligence report based on the following data analysis.

**Report Period:** ${period} (${startDate.toISOString().split('T')[0]} to ${now.toISOString().split('T')[0]})

**Business Context (from AMAST Sales Manual):**
${pdfContent ? pdfContent.substring(0, 2000) : 'AMAST is a distribution management system for managing sales, inventory, and outlets.'}

**Data Analysis Results:**

1. **Sales Overview:**
   - Total Invoices: ${data.salesOverview.total_invoices}
   - Total Revenue: RM ${parseFloat(data.salesOverview.total_revenue || 0).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
   - Average Invoice Value: RM ${parseFloat(data.salesOverview.avg_invoice_value || 0).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
   - Active Outlets: ${data.salesOverview.active_outlets}
   - Active Days: ${data.salesOverview.active_days}

2. **Top 20 Outlets by Revenue:**
${data.topOutlets.slice(0, 20).map((outlet, idx) => `   ${idx + 1}. ${outlet.outlet_name} (${outlet.price_group}): RM ${parseFloat(outlet.total_revenue || 0).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} - ${outlet.invoice_count} invoices`).join('\n')}

3. **Top 30 Products by Revenue:**
${data.topProducts.slice(0, 30).map((product, idx) => `   ${idx + 1}. ${product.product_name} (${product.category || 'N/A'}): RM ${parseFloat(product.total_revenue || 0).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} - ${product.total_quantity} units sold`).join('\n')}

4. **Monthly Sales Trend:**
${data.salesTrend.map(trend => `   ${trend.month}: RM ${parseFloat(trend.revenue || 0).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${trend.invoice_count} invoices)`).join('\n')}

5. **Inventory Status:**
   - Total Products: ${data.inventoryStatus.total_products}
   - Total Locations: ${data.inventoryStatus.total_locations}
   - Out of Stock Items: ${data.inventoryStatus.out_of_stock}
   - Low Stock Items (< 100 units): ${data.inventoryStatus.low_stock}
   - Negative Stock (Data Issues): ${data.inventoryStatus.negative_stock}
   - Total Inventory Quantity: ${data.inventoryStatus.total_quantity}

6. **Price Group Performance:**
${data.priceGroupAnalysis.map(pg => `   ${pg.price_group}: RM ${parseFloat(pg.total_revenue || 0).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} - ${pg.outlet_count} outlets, ${pg.invoice_count} invoices`).join('\n')}

7. **Credit Notes:**
   - Total Credit Notes: ${data.creditNotes.total_credit_notes}
   - Total Amount: RM ${parseFloat(data.creditNotes.total_amount || 0).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}

8. **Category Performance:**
${data.categoryPerformance.map(cat => `   ${cat.category}: RM ${parseFloat(cat.total_revenue || 0).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} - ${cat.product_count} products, ${cat.total_quantity} units`).join('\n')}

**Instructions:**
Generate a comprehensive, professional business intelligence report in markdown format. The report should include:

1. **Executive Summary** - High-level overview of key findings
2. **Sales Performance Analysis** - Detailed analysis of sales trends, patterns, and insights
3. **Outlet Performance** - Analysis of top-performing outlets and recommendations
4. **Product Analysis** - Insights on best-selling products, categories, and opportunities
5. **Inventory Analysis** - Stock status, alerts, and recommendations
6. **Price Group Analysis** - Performance by price groups and insights
7. **Key Insights & Recommendations** - Actionable insights and strategic recommendations
8. **Risk Factors** - Potential issues (negative stock, low stock, credit notes, etc.)
9. **Conclusion** - Summary and next steps

Make the report:
- Professional and business-focused
- Data-driven with specific numbers and percentages
- Include actionable recommendations
- Identify trends and patterns
- Highlight both strengths and areas for improvement
- Use Malaysian Ringgit (RM) for all currency values
- Be comprehensive but well-structured
- Include specific examples from the data

Format the report in clean markdown with proper headings, bullet points, and sections.`;

    logger.info('Calling Qwen API for report generation', { userId, promptLength: reportPrompt.length });

    const messages = [
      {
        role: 'system',
        content: 'You are a senior business analyst specializing in distribution management systems. Generate comprehensive, professional business intelligence reports with actionable insights.',
      },
      {
        role: 'user',
        content: reportPrompt,
      },
    ];

    const reportContent = await callQwenAPI(messages, 0.7);

    logger.info('Report generated successfully', { userId, reportLength: reportContent.length });

    res.json({
      success: true,
      report: {
        content: reportContent,
        reportType,
        period,
        generatedAt: new Date().toISOString(),
        dataSummary: {
          totalRevenue: parseFloat(data.salesOverview.total_revenue || 0),
          totalInvoices: parseInt(data.salesOverview.total_invoices || 0),
          activeOutlets: parseInt(data.salesOverview.active_outlets || 0),
          topOutletsCount: data.topOutlets.length,
          topProductsCount: data.topProducts.length,
        },
      },
    });
  } catch (error) {
    logger.logError(error, req, { reportType: req.body.reportType, period: req.body.period });
    res.status(500).json({ 
      success: false,
      error: 'Failed to generate report',
      message: error.message 
    });
  }
});

// Get report history (optional - can store reports in database)
router.get('/history', async (req, res) => {
  try {
    // For now, return empty array - can implement report storage later
    res.json({ reports: [] });
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({ error: 'Failed to fetch report history' });
  }
});

module.exports = router;
