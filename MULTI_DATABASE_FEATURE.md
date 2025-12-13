# Multi-Database Management Feature

## Overview

This feature allows administrators to manage multiple PostgreSQL databases dynamically through the Settings page. Each database can be configured, tested, and have its schema extracted automatically. Users can select which database to use for chat queries.

## Features

### 1. Database Management (Admin Only)
- **Add Databases**: Admins can add new PostgreSQL database connections through the Settings page
- **Edit Databases**: Update connection credentials, names, and descriptions
- **Delete Databases**: Remove database connections
- **Test Connection**: Verify database connectivity before saving
- **Extract Schema**: Automatically extract and cache database schema for AI analysis

### 2. Database Selection (All Users)
- **Select Database**: Users can choose which database to use for chat queries
- **Visual Indicator**: Chat interface shows the currently selected database
- **Schema Status**: Displays whether schema has been extracted for the selected database

### 3. Schema Intelligence
- **Automatic Extraction**: System analyzes table structures, relationships, and metadata
- **Per-Database Caching**: Each database's schema is stored separately
- **AI Agent Integration**: Each database gets its own AI agent with schema awareness

## Architecture

### Backend Components

#### 1. Database Table (`chat_app_databases`)
Stores database connection information:
- Connection credentials (host, port, database name, username, encrypted password)
- Metadata (name, description, SSL settings)
- Status flags (is_active, schema_extracted)
- Timestamps (created_at, updated_at, schema_extracted_at)

#### 2. User Selection Table (`chat_app_user_selected_database`)
Tracks each user's selected database:
- One-to-one relationship with users
- Stores selected database_id per user

#### 3. Services

**`databaseManager.js`**
- Manages multiple PostgreSQL connection pools
- Handles password encryption/decryption
- Provides CRUD operations for databases
- Manages user database selection

**`schemaExtractionService.js`**
- Extracts full database schema from PostgreSQL
- Analyzes tables, columns, relationships, indexes
- Saves schemas to files per database
- Loads schemas on demand

**`schemaService.js` (Updated)**
- Now supports multiple databases via databaseId parameter
- Caches schemas per database
- Maintains backward compatibility with legacy single-database mode

**`qwenService.js` (Updated)**
- Accepts databaseId parameter
- Uses correct schema for table identification and SQL generation

**`chatService.js` (Updated)**
- Gets user's selected database
- Uses appropriate connection pool for queries
- Validates database selection before processing queries

#### 4. API Routes (`/api/databases`)

**Admin Routes:**
- `GET /api/databases` - List all databases
- `GET /api/databases/:id` - Get database details
- `POST /api/databases` - Create new database
- `PUT /api/databases/:id` - Update database
- `DELETE /api/databases/:id` - Delete database
- `POST /api/databases/:id/test` - Test connection
- `POST /api/databases/:id/extract-schema` - Extract schema

**User Routes:**
- `GET /api/databases/selected` - Get user's selected database
- `POST /api/databases/selected` - Set user's selected database

### Frontend Components

#### 1. Settings Page (`/settings`)
- **Database List**: Shows all configured databases
- **Selected Database**: Displays currently selected database
- **Add/Edit Form**: Modal for adding or editing databases
- **Actions**: Test connection, extract schema, edit, delete
- **Status Indicators**: Shows schema extraction status

#### 2. Chat Interface Updates
- **Database Selector Bar**: Shows selected database at top of chat
- **Status Indicator**: Displays schema extraction status
- **Settings Link**: Quick access to change database
- **Input Disabled**: Prevents queries when no database selected

#### 3. Navigation
- Added Settings link to main navigation

## Workflow

### Admin Workflow: Adding a Database

1. Navigate to Settings page
2. Click "Add Database"
3. Enter connection details:
   - Name (e.g., "Production Database")
   - Description (optional)
   - Host (e.g., "localhost" or IP address)
   - Port (default: 5432)
   - Database Name
   - Username
   - Password
   - SSL Enabled (checkbox)
4. Click "Add Database"
   - System tests connection automatically
   - If successful, database is saved
5. Click "Extract Schema"
   - System connects to database
   - Extracts all table structures, relationships, indexes
   - Saves schema to file
   - Marks database as schema_extracted

### User Workflow: Using a Database

1. Navigate to Settings page
2. View available databases
3. Click "Select" on desired database
4. Navigate to Chat page
5. Database selector bar shows selected database
6. Start asking questions - AI uses selected database's schema

## Security

### Password Encryption
- Database passwords are encrypted using AES-256-CBC
- Encryption key derived from `JWT_SECRET` or `DB_ENCRYPTION_KEY` environment variable
- Passwords never stored in plain text
- Decryption happens only when creating connection pools

### Access Control
- Database management (CRUD) restricted to admin users
- All users can select databases for their own use
- Each user's selection is independent

## File Structure

### Schema Storage
Schemas are stored in: `backend/schemas/database-{id}-schema.json`

Each schema file contains:
- Database metadata
- All tables with columns, types, constraints
- Foreign key relationships
- Indexes
- Sample data (2 rows per table)
- Statistics (row counts, etc.)

### Connection Pools
- Each database gets its own connection pool
- Pools are cached in memory
- Automatically recreated when credentials change
- Maximum 20 connections per pool

## Environment Variables

Add to `backend/.env`:
```env
# Optional: Custom encryption key for database passwords
# If not set, will use JWT_SECRET to derive key
DB_ENCRYPTION_KEY=your-32-byte-hex-key
```

## Migration Notes

### Existing Single-Database Setup
- The system maintains backward compatibility
- If no database is selected, it falls back to legacy behavior
- Existing schema files in `output/` directory still work
- Chat will prompt users to select a database if none is selected

### Database Initialization
The `chat_app_databases` and `chat_app_user_selected_database` tables are automatically created on backend startup.

## Testing

### Test Connection
1. Add a database with test credentials
2. Click "Test Connection"
3. Should show success message if credentials are correct

### Extract Schema
1. Select a database with schema_extracted = false
2. Click "Extract Schema"
3. Wait for extraction to complete (may take a few minutes for large databases)
4. Status should update to "✓ Schema Ready"

### Use in Chat
1. Select a database in Settings
2. Go to Chat page
3. Ask a question about the database
4. AI should use the selected database's schema to generate SQL

## Troubleshooting

### "Connection test failed"
- Verify database is accessible from server
- Check firewall rules
- Verify credentials are correct
- Try enabling SSL if required

### "Schema not extracted"
- Click "Extract Schema" button
- Wait for extraction to complete
- Check backend logs for errors
- Verify database user has SELECT permissions on information_schema

### "No database selected"
- Go to Settings page
- Select a database
- Return to Chat page

### Chat queries not working
- Ensure database is selected
- Verify schema has been extracted
- Check backend logs for connection errors
- Verify database credentials are still valid

## Future Enhancements

Potential improvements:
- Schema refresh/update functionality
- Database connection health monitoring
- Query performance metrics per database
- Database usage analytics
- Multi-database query support (cross-database joins)
- Database backup/restore integration
- Connection pooling optimization
- Schema versioning


