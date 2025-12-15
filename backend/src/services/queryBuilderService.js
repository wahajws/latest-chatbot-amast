const { getSchema } = require('./schemaService');
const { getActiveDatabase, getDatabaseById } = require('./databaseManager');

// Get schema information formatted for query builder
function getQueryBuilderSchema(databaseId = null) {
  const schema = getSchema(databaseId);
  if (!schema) {
    return null;
  }

  // Format tables with their columns for the query builder
  const tables = schema.tables
    .filter(table => table.has_data) // Only show tables with data
    .map(table => ({
      name: table.name,
      displayName: table.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      columns: table.columns.map(col => ({
        name: col.name,
        displayName: col.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        type: col.type,
        nullable: col.nullable,
        isPrimaryKey: col.is_primary_key || false,
        // Categorize columns
        category: categorizeColumn(col.name, col.type),
      })),
      rowCount: table.row_count || 0,
    }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName));

  // Extract common date columns
  const dateColumns = [];
  tables.forEach(table => {
    table.columns.forEach(col => {
      if (col.category === 'date') {
        dateColumns.push({
          table: table.name,
          column: col.name,
          displayName: `${table.displayName}.${col.displayName}`,
        });
      }
    });
  });

  return {
    tables,
    dateColumns,
    totalTables: tables.length,
  };
}

// Categorize column by name and type
function categorizeColumn(name, type) {
  const lowerName = name.toLowerCase();
  const lowerType = (type || '').toLowerCase();

  // Date/time columns
  if (lowerType.includes('date') || lowerType.includes('time') || lowerType.includes('timestamp')) {
    return 'date';
  }
  if (lowerName.includes('date') || lowerName.includes('time') || lowerName.includes('created') || lowerName.includes('updated')) {
    return 'date';
  }

  // Numeric columns
  if (lowerType.includes('int') || lowerType.includes('decimal') || lowerType.includes('numeric') || lowerType.includes('float') || lowerType.includes('double') || lowerType.includes('money')) {
    return 'numeric';
  }
  if (lowerName.includes('amount') || lowerName.includes('price') || lowerName.includes('total') || lowerName.includes('quantity') || lowerName.includes('count') || lowerName.includes('qty')) {
    return 'numeric';
  }

  // ID columns
  if (lowerName.endsWith('_id') || lowerName === 'id') {
    return 'id';
  }

  // Text columns
  if (lowerType.includes('char') || lowerType.includes('text') || lowerType.includes('varchar')) {
    return 'text';
  }

  // Boolean columns
  if (lowerType.includes('bool') || lowerName.includes('is_') || lowerName.includes('has_')) {
    return 'boolean';
  }

  return 'other';
}

// Generate SQL from query builder selections
async function buildSQLFromSelections(selections, databaseId = null) {
  const {
    tables = [],
    metrics = [],
    groupBy = [],
    filters = [],
    timeRange = null,
    timeColumn = null,
    limit = 100,
    widgetType = 'table',
  } = selections;

  if (tables.length === 0) {
    throw new Error('At least one table must be selected');
  }

  // Get database type
  let dbType = 'postgresql';
  try {
    if (databaseId) {
      const { getDatabaseById } = require('./databaseManager');
      const db = await getDatabaseById(databaseId);
      if (db && db.database_type) {
        dbType = db.database_type.toLowerCase();
      }
    } else {
      const { getActiveDatabase } = require('./databaseManager');
      const activeDb = await getActiveDatabase();
      if (activeDb && activeDb.database_type) {
        dbType = activeDb.database_type.toLowerCase();
      }
    }
  } catch (error) {
    console.warn('Could not determine database type, defaulting to PostgreSQL');
  }

  const mainTable = tables[0]; // Table name
  const tableAlias = 't1';

  // Build SELECT clause
  let selectClause = '';
  if (widgetType === 'kpi') {
    // For KPI, we need a single metric
    if (metrics.length === 0) {
      throw new Error('At least one metric is required for KPI');
    }
    const metric = metrics[0];
    selectClause = buildMetricExpression(metric, mainTable, tableAlias, dbType);
  } else if (groupBy.length > 0) {
    // For charts with grouping
    const groupColumns = groupBy.map(gb => {
      const [table, column] = gb.split('.');
      const alias = table === mainTable ? tableAlias : `t${tables.indexOf(table) + 1}`;
      return `${alias}.${column}`;
    });
    const metricExpressions = metrics.map(m => {
      const [table, column] = m.column.split('.');
      const alias = table === mainTable ? tableAlias : `t${tables.indexOf(table) + 1}`;
      return `${buildMetricExpression(m, table, alias, dbType)} AS ${m.alias || column}`;
    });
    selectClause = [...groupColumns, ...metricExpressions].join(', ');
  } else {
    // For tables or simple queries
    if (metrics.length === 0) {
      selectClause = '*';
    } else {
      selectClause = metrics.map(m => {
        const [table, column] = m.column.split('.');
        const alias = table === mainTable ? tableAlias : `t${tables.indexOf(table) + 1}`;
        return buildMetricExpression(m, table, alias, dbType);
      }).join(', ');
    }
  }

  // Build FROM clause
  let fromClause = `${mainTable} AS ${tableAlias}`;

  // Build JOINs for additional tables
  if (tables.length > 1) {
    // Simple join logic - assumes first table's ID column matches other tables' foreign keys
    // This is a simplified version - in production, you'd want smarter join detection
    for (let i = 1; i < tables.length; i++) {
      const joinTable = tables[i];
      const joinAlias = `t${i + 1}`;
      // Try to find a matching column (simplified)
      const joinCondition = `${tableAlias}.id = ${joinAlias}.${mainTable}_id`;
      fromClause += ` LEFT JOIN ${joinTable} AS ${joinAlias} ON ${joinCondition}`;
    }
  }

  // Build WHERE clause
  const whereConditions = [];
  
  // Add time range filter
  if (timeRange && timeColumn) {
    const [table, column] = timeColumn.split('.');
    const alias = table === mainTable ? tableAlias : `t${tables.indexOf(table) + 1}`;
    const timeFilter = buildTimeRangeFilter(timeRange, `${alias}.${column}`, dbType);
    if (timeFilter) {
      whereConditions.push(timeFilter);
    }
  }

  // Add other filters
  filters.forEach(filter => {
    const [table, column] = filter.column.split('.');
    const alias = table === mainTable ? tableAlias : `t${tables.indexOf(table) + 1}`;
    const condition = buildFilterCondition(filter, `${alias}.${column}`, dbType);
    if (condition) {
      whereConditions.push(condition);
    }
  });

  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

  // Build GROUP BY clause
  const groupByClause = groupBy.length > 0 
    ? `GROUP BY ${groupBy.map(gb => {
        const [table, column] = gb.split('.');
        const alias = table === mainTable ? tableAlias : `t${tables.indexOf(table) + 1}`;
        return `${alias}.${column}`;
      }).join(', ')}`
    : '';

  // Build ORDER BY clause
  let orderByClause = '';
  if (widgetType === 'kpi') {
    // No ordering needed for KPI
  } else if (metrics.length > 0) {
    // Order by first metric descending
    const firstMetric = metrics[0];
    const [table, column] = firstMetric.column.split('.');
    const alias = table === mainTable ? tableAlias : `t${tables.indexOf(table) + 1}`;
    orderByClause = `ORDER BY ${buildMetricExpression(firstMetric, table, alias, dbType)} DESC`;
  }

  // Build LIMIT clause
  const limitClause = `LIMIT ${limit}`;

  // Combine all clauses
  const sql = `SELECT ${selectClause}
FROM ${fromClause}
${whereClause}
${groupByClause}
${orderByClause}
${limitClause}`.trim();

  return sql;
}

// Build metric expression (SUM, COUNT, AVG, etc.)
function buildMetricExpression(metric, tableName, tableAlias, dbType) {
  const { function: func, column } = metric;
  // Column is in format "table.column", extract just the column name
  const columnName = column.includes('.') ? column.split('.')[1] : column;
  const columnRef = `${tableAlias}.${columnName}`;

  switch (func) {
    case 'sum':
      return `SUM(${columnRef})`;
    case 'count':
      return `COUNT(${columnRef})`;
    case 'avg':
      return `AVG(${columnRef})`;
    case 'min':
      return `MIN(${columnRef})`;
    case 'max':
      return `MAX(${columnRef})`;
    case 'distinct_count':
      return `COUNT(DISTINCT ${columnRef})`;
    case 'none':
    default:
      return columnRef;
  }
}

// Build time range filter
function buildTimeRangeFilter(timeRange, columnRef, dbType) {
  const now = new Date();
  let startDate, endDate;

  switch (timeRange) {
    case 'today':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      endDate = now;
      break;
    case 'this_week':
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
      endDate = now;
      break;
    case 'this_month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = now;
      break;
    case 'this_year':
      startDate = new Date(now.getFullYear(), 0, 1);
      endDate = now;
      break;
    case 'last_7_days':
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
      endDate = now;
      break;
    case 'last_30_days':
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 30);
      endDate = now;
      break;
    case 'last_90_days':
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 90);
      endDate = now;
      break;
    default:
      return null;
  }

  if (dbType === 'mysql') {
    return `${columnRef} >= '${startDate.toISOString().split('T')[0]}' AND ${columnRef} <= '${endDate.toISOString().split('T')[0]}'`;
  } else {
    return `${columnRef} >= '${startDate.toISOString()}' AND ${columnRef} <= '${endDate.toISOString()}'`;
  }
}

// Build filter condition
function buildFilterCondition(filter, columnRef, dbType) {
  const { operator, value } = filter;

  // Handle null values
  if (value === null || value === '') {
    if (operator === 'is_null') {
      return `${columnRef} IS NULL`;
    } else if (operator === 'is_not_null') {
      return `${columnRef} IS NOT NULL`;
    }
    return null;
  }

  // Escape value for SQL injection prevention (basic)
  const escapedValue = typeof value === 'string' ? value.replace(/'/g, "''") : value;

  switch (operator) {
    case 'equals':
      return `${columnRef} = '${escapedValue}'`;
    case 'not_equals':
      return `${columnRef} != '${escapedValue}'`;
    case 'greater_than':
      return `${columnRef} > ${escapedValue}`;
    case 'less_than':
      return `${columnRef} < ${escapedValue}`;
    case 'greater_or_equal':
      return `${columnRef} >= ${escapedValue}`;
    case 'less_or_equal':
      return `${columnRef} <= ${escapedValue}`;
    case 'contains':
      if (dbType === 'mysql') {
        return `LOWER(${columnRef}) LIKE LOWER('%${escapedValue}%')`;
      } else {
        return `${columnRef} ILIKE '%${escapedValue}%'`;
      }
    case 'starts_with':
      if (dbType === 'mysql') {
        return `LOWER(${columnRef}) LIKE LOWER('${escapedValue}%')`;
      } else {
        return `${columnRef} ILIKE '${escapedValue}%'`;
      }
    case 'ends_with':
      if (dbType === 'mysql') {
        return `LOWER(${columnRef}) LIKE LOWER('%${escapedValue}')`;
      } else {
        return `${columnRef} ILIKE '%${escapedValue}'`;
      }
    case 'in':
      const values = Array.isArray(value) ? value : [value];
      return `${columnRef} IN (${values.map(v => `'${v}'`).join(', ')})`;
    default:
      return null;
  }
}

module.exports = {
  getQueryBuilderSchema,
  buildSQLFromSelections,
  categorizeColumn,
};

