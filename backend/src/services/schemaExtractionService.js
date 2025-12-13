const { Client } = require('pg');
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// Clean host string - remove protocol and port if present
function cleanHost(host) {
  if (!host) return host;
  // Remove http:// or https://
  let cleaned = host.replace(/^https?:\/\//, '');
  // Remove port if present (e.g., localhost:3000 -> localhost)
  cleaned = cleaned.split(':')[0];
  return cleaned.trim();
}

// Extract schema from a MySQL database (defined first for hoisting)
async function extractSchemaFromMySQL(dbConfig) {
  const password = typeof dbConfig.password === 'string' && dbConfig.password.includes(':') 
    ? require('./databaseManager').decryptPassword(dbConfig.password) 
    : dbConfig.password;
  
  const cleanHostValue = cleanHost(dbConfig.host);
  const connection = await mysql.createConnection({
    host: cleanHostValue,
    port: parseInt(dbConfig.port) || 3306,
    user: dbConfig.username,
    password: password,
    database: dbConfig.database_name,
    ssl: dbConfig.ssl_enabled ? { rejectUnauthorized: false } : false,
  });

  try {
    console.log(`✅ Connected to MySQL database: ${dbConfig.database_name}`);

    const schema = {
      database_name: dbConfig.database_name,
      extracted_at: new Date().toISOString(),
      total_tables: 0,
      tables: [],
      relationships: [],
      statistics: {
        total_columns: 0,
        total_foreign_keys: 0,
        total_indexes: 0,
        tables_with_data: 0,
        tables_without_data: 0,
      },
    };

    // Get all tables
    const [tablesResult] = await connection.query(`
      SELECT 
        TABLE_NAME as table_name,
        TABLE_SCHEMA as table_schema
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = ?
        AND TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_NAME;
    `, [dbConfig.database_name]);

    const tables = tablesResult;
    schema.total_tables = tables.length;

    console.log(`📊 Found ${tables.length} tables`);

    // Process each table
    for (const table of tables) {
      try {
        const { table_schema, table_name } = table;

        // Get columns
        const [columnsResult] = await connection.query(`
          SELECT 
            COLUMN_NAME as column_name,
            DATA_TYPE as data_type,
            CHARACTER_MAXIMUM_LENGTH as character_maximum_length,
            IS_NULLABLE as is_nullable,
            COLUMN_DEFAULT as column_default,
            ORDINAL_POSITION as ordinal_position
          FROM information_schema.COLUMNS
          WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
          ORDER BY ORDINAL_POSITION;
        `, [table_schema, table_name]);

        const columns = columnsResult;

        // Get primary keys
        const [primaryKeysResult] = await connection.query(`
          SELECT 
            COLUMN_NAME as column_name
          FROM information_schema.KEY_COLUMN_USAGE
          WHERE TABLE_SCHEMA = ?
            AND TABLE_NAME = ?
            AND CONSTRAINT_NAME = 'PRIMARY';
        `, [table_schema, table_name]);

        const primaryKeys = primaryKeysResult.map(row => row.column_name);

        // Get foreign keys
        const [foreignKeysResult] = await connection.query(`
          SELECT
            COLUMN_NAME as column_name,
            REFERENCED_TABLE_SCHEMA as foreign_table_schema,
            REFERENCED_TABLE_NAME as foreign_table_name,
            REFERENCED_COLUMN_NAME as foreign_column_name,
            CONSTRAINT_NAME as constraint_name
          FROM information_schema.KEY_COLUMN_USAGE
          WHERE TABLE_SCHEMA = ?
            AND TABLE_NAME = ?
            AND REFERENCED_TABLE_NAME IS NOT NULL;
        `, [table_schema, table_name]);

        const foreignKeys = foreignKeysResult;

        // Get indexes
        let indexes = [];
        try {
          const [indexesResult] = await connection.query(`
            SHOW INDEX FROM ?? WHERE Key_name != 'PRIMARY';
          `, [`${table_schema}.${table_name}`]);
          indexes = Array.isArray(indexesResult) ? indexesResult : [];
        } catch (error) {
          console.warn(`⚠️  Could not get indexes for ${table_schema}.${table_name}: ${error.message}`);
        }

        // Get row count
        let rowCount = 0;
        try {
          const [countResult] = await connection.query(`SELECT COUNT(*) as count FROM ??`, [`${table_schema}.${table_name}`]);
          rowCount = parseInt(countResult[0].count);
        } catch (error) {
          console.warn(`⚠️  Could not get row count for ${table_schema}.${table_name}: ${error.message}`);
        }

        // Get sample data (limit 2 rows)
        let sampleData = [];
        try {
          if (rowCount > 0) {
            const [sampleResult] = await connection.query(`SELECT * FROM ?? LIMIT 2`, [`${table_schema}.${table_name}`]);
            sampleData = Array.isArray(sampleResult) ? sampleResult : [];
          }
        } catch (error) {
          console.warn(`⚠️  Could not get sample data for ${table_schema}.${table_name}: ${error.message}`);
        }

        // Get table comment
        let tableComment = null;
        try {
          const [commentResult] = await connection.query(`
            SELECT TABLE_COMMENT as comment
            FROM information_schema.TABLES
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?;
          `, [table_schema, table_name]);
          if (commentResult[0] && commentResult[0].comment) {
            tableComment = commentResult[0].comment;
          }
        } catch (error) {
          // Ignore comment errors
        }

        // Get column comments
        const [columnCommentsResult] = await connection.query(`
          SELECT
            COLUMN_NAME as column_name,
            COLUMN_COMMENT as column_comment
          FROM information_schema.COLUMNS
          WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?;
        `, [table_schema, table_name]);

        const columnComments = columnCommentsResult;
        const columnCommentsMap = {};
        columnComments.forEach(col => {
          if (col.column_comment) {
            columnCommentsMap[col.column_name] = col.column_comment;
          }
        });

        // Format columns
        const formattedColumns = columns.map(col => ({
          name: col.column_name,
          type: col.data_type,
          max_length: col.character_maximum_length,
          nullable: col.is_nullable === 'YES',
          default: col.column_default,
          position: col.ordinal_position,
          is_primary_key: primaryKeys.includes(col.column_name),
          comment: columnCommentsMap[col.column_name] || null,
        }));

        // Format foreign keys
        const formattedForeignKeys = foreignKeys.map(fk => ({
          column: fk.column_name,
          references_table: `${fk.foreign_table_schema}.${fk.foreign_table_name}`,
          references_column: fk.foreign_column_name,
          constraint_name: fk.constraint_name,
        }));

        // Store relationships
        foreignKeys.forEach(fk => {
          schema.relationships.push({
            from_table: `${table_schema}.${table_name}`,
            from_column: fk.column_name,
            to_table: `${fk.foreign_table_schema}.${fk.foreign_table_name}`,
            to_column: fk.foreign_column_name,
            relationship_type: 'foreign_key',
          });
        });

        // Format indexes
        const formattedIndexes = indexes.map(idx => ({
          name: idx.Key_name,
          definition: `${idx.Key_name} on ${idx.Column_name}`,
        }));

        // Create table object
        const tableObj = {
          schema: table_schema,
          name: table_name,
          full_name: `${table_schema}.${table_name}`,
          columns: formattedColumns,
          primary_keys: primaryKeys,
          foreign_keys: formattedForeignKeys,
          indexes: formattedIndexes,
          row_count: rowCount,
          sample_data: sampleData,
          comment: tableComment,
          has_data: rowCount > 0,
        };

        schema.tables.push(tableObj);

        // Update statistics
        schema.statistics.total_columns += formattedColumns.length;
        schema.statistics.total_foreign_keys += formattedForeignKeys.length;
        schema.statistics.total_indexes += formattedIndexes.length;
        if (rowCount > 0) {
          schema.statistics.tables_with_data++;
        } else {
          schema.statistics.tables_without_data++;
        }

      } catch (error) {
        console.error(`❌ Error processing table ${table.table_schema}.${table.table_name}:`, error.message);
      }
    }

    console.log(`✅ Schema extraction complete: ${schema.total_tables} tables`);
    return schema;

  } catch (error) {
    console.error('❌ Error extracting schema:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

// Extract schema from a PostgreSQL database
async function extractSchemaFromPostgreSQL(dbConfig) {
  const cleanHostValue = cleanHost(dbConfig.host);
  const client = new Client({
    host: cleanHostValue,
    port: parseInt(dbConfig.port),
    database: dbConfig.database_name,
    user: dbConfig.username,
    password: typeof dbConfig.password === 'string' && dbConfig.password.includes(':') 
      ? require('./databaseManager').decryptPassword(dbConfig.password) 
      : dbConfig.password,
    ssl: dbConfig.ssl_enabled ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 30000,
  });

  try {
    await client.connect();
    console.log(`✅ Connected to database: ${dbConfig.database_name}`);

    const schema = {
      database_name: dbConfig.database_name,
      extracted_at: new Date().toISOString(),
      total_tables: 0,
      tables: [],
      relationships: [],
      statistics: {
        total_columns: 0,
        total_foreign_keys: 0,
        total_indexes: 0,
        tables_with_data: 0,
        tables_without_data: 0,
      },
    };

    // Get all tables
    const tablesResult = await client.query(`
      SELECT 
        table_name,
        table_schema
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    const tables = tablesResult.rows;
    schema.total_tables = tables.length;

    console.log(`📊 Found ${tables.length} tables`);

    // Process each table
    for (const table of tables) {
      try {
        const { table_schema, table_name } = table;

        // Get columns
        const columnsResult = await client.query(`
          SELECT 
            column_name,
            data_type,
            character_maximum_length,
            is_nullable,
            column_default,
            ordinal_position
          FROM information_schema.columns
          WHERE table_schema = $1 AND table_name = $2
          ORDER BY ordinal_position;
        `, [table_schema, table_name]);

        const columns = columnsResult.rows;

        // Get primary keys
        const primaryKeysResult = await client.query(`
          SELECT 
            kcu.column_name
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
          WHERE tc.constraint_type = 'PRIMARY KEY'
            AND tc.table_schema = $1
            AND tc.table_name = $2;
        `, [table_schema, table_name]);

        const primaryKeys = primaryKeysResult.rows.map(row => row.column_name);

        // Get foreign keys
        const foreignKeysResult = await client.query(`
          SELECT
            kcu.column_name,
            ccu.table_schema AS foreign_table_schema,
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name,
            tc.constraint_name
          FROM information_schema.table_constraints AS tc
          JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
          JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
            AND ccu.table_schema = tc.table_schema
          WHERE tc.constraint_type = 'FOREIGN KEY'
            AND tc.table_schema = $1
            AND tc.table_name = $2;
        `, [table_schema, table_name]);

        const foreignKeys = foreignKeysResult.rows;

        // Get indexes
        const indexesResult = await client.query(`
          SELECT
            indexname,
            indexdef
          FROM pg_indexes
          WHERE schemaname = $1 AND tablename = $2;
        `, [table_schema, table_name]);

        const indexes = indexesResult.rows;

        // Get row count (with timeout)
        let rowCount = 0;
        try {
          const countResult = await client.query(`
            SELECT COUNT(*) as count FROM ${table_schema}.${table_name};
          `);
          rowCount = parseInt(countResult.rows[0].count);
        } catch (error) {
          console.warn(`⚠️  Could not get row count for ${table_schema}.${table_name}: ${error.message}`);
        }

        // Get sample data (limit 2 rows)
        let sampleData = [];
        try {
          if (rowCount > 0) {
            const sampleResult = await client.query(`
              SELECT * FROM ${table_schema}.${table_name} LIMIT 2;
            `);
            sampleData = sampleResult.rows;
          }
        } catch (error) {
          console.warn(`⚠️  Could not get sample data for ${table_schema}.${table_name}: ${error.message}`);
        }

        // Get table comment
        let tableComment = null;
        try {
          const commentResult = await client.query(`
            SELECT obj_description('${table_schema}.${table_name}'::regclass, 'pg_class') as comment;
          `);
          if (commentResult.rows[0] && commentResult.rows[0].comment) {
            tableComment = commentResult.rows[0].comment;
          }
        } catch (error) {
          // Ignore comment errors
        }

        // Get column comments
        const columnCommentsResult = await client.query(`
          SELECT
            a.attname as column_name,
            col_description(a.attrelid, a.attnum) as column_comment
          FROM pg_attribute a
          WHERE a.attrelid = '${table_schema}.${table_name}'::regclass
            AND a.attnum > 0
            AND NOT a.attisdropped;
        `);

        const columnComments = columnCommentsResult.rows;
        const columnCommentsMap = {};
        columnComments.forEach(col => {
          if (col.column_comment) {
            columnCommentsMap[col.column_name] = col.column_comment;
          }
        });

        // Format columns
        const formattedColumns = columns.map(col => ({
          name: col.column_name,
          type: col.data_type,
          max_length: col.character_maximum_length,
          nullable: col.is_nullable === 'YES',
          default: col.column_default,
          position: col.ordinal_position,
          is_primary_key: primaryKeys.includes(col.column_name),
          comment: columnCommentsMap[col.column_name] || null,
        }));

        // Format foreign keys
        const formattedForeignKeys = foreignKeys.map(fk => ({
          column: fk.column_name,
          references_table: `${fk.foreign_table_schema}.${fk.foreign_table_name}`,
          references_column: fk.foreign_column_name,
          constraint_name: fk.constraint_name,
        }));

        // Store relationships
        foreignKeys.forEach(fk => {
          schema.relationships.push({
            from_table: `${table_schema}.${table_name}`,
            from_column: fk.column_name,
            to_table: `${fk.foreign_table_schema}.${fk.foreign_table_name}`,
            to_column: fk.foreign_column_name,
            relationship_type: 'foreign_key',
          });
        });

        // Format indexes
        const formattedIndexes = indexes.map(idx => ({
          name: idx.indexname,
          definition: idx.indexdef,
        }));

        // Create table object
        const tableObj = {
          schema: table_schema,
          name: table_name,
          full_name: `${table_schema}.${table_name}`,
          columns: formattedColumns,
          primary_keys: primaryKeys,
          foreign_keys: formattedForeignKeys,
          indexes: formattedIndexes,
          row_count: rowCount,
          sample_data: sampleData,
          comment: tableComment,
          has_data: rowCount > 0,
        };

        schema.tables.push(tableObj);

        // Update statistics
        schema.statistics.total_columns += formattedColumns.length;
        schema.statistics.total_foreign_keys += formattedForeignKeys.length;
        schema.statistics.total_indexes += formattedIndexes.length;
        if (rowCount > 0) {
          schema.statistics.tables_with_data++;
        } else {
          schema.statistics.tables_without_data++;
        }

      } catch (error) {
        console.error(`❌ Error processing table ${table.table_schema}.${table.table_name}:`, error.message);
      }
    }

    console.log(`✅ Schema extraction complete: ${schema.total_tables} tables`);
    return schema;

  } catch (error) {
    console.error('❌ Error extracting schema:', error);
    throw error;
  } finally {
    await client.end();
  }
}

// Extract schema from a database (PostgreSQL or MySQL)
async function extractSchemaFromDatabase(dbConfig) {
  const dbType = dbConfig.database_type || 'postgresql';
  
  if (dbType === 'mysql') {
    return await extractSchemaFromMySQL(dbConfig);
  } else {
    return await extractSchemaFromPostgreSQL(dbConfig);
  }
}

// Save schema to file
function saveSchemaToFile(schema, databaseId) {
  const schemasDir = path.join(__dirname, '../../schemas');
  if (!fs.existsSync(schemasDir)) {
    fs.mkdirSync(schemasDir, { recursive: true });
  }
  
  const schemaPath = path.join(schemasDir, `database-${databaseId}-schema.json`);
  fs.writeFileSync(schemaPath, JSON.stringify(schema, null, 2));
  
  console.log(`✅ Schema saved to: ${schemaPath}`);
  return schemaPath;
}

// Load schema from file
function loadSchemaFromFile(databaseId) {
  const schemaPath = path.join(__dirname, '../../schemas', `database-${databaseId}-schema.json`);
  
  if (!fs.existsSync(schemaPath)) {
    return null;
  }
  
  try {
    const schemaData = fs.readFileSync(schemaPath, 'utf8');
    return JSON.parse(schemaData);
  } catch (error) {
    console.error(`❌ Error loading schema from file: ${error.message}`);
    return null;
  }
}

module.exports = {
  extractSchemaFromDatabase,
  saveSchemaToFile,
  loadSchemaFromFile,
};

