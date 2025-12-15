# Table Naming Convention

All chat application tables use the `chat_app_` prefix to avoid conflicts with existing database tables.

## Chat Application Tables

### 1. `chat_app_user`
User management for the chat application.
- **Columns**: id, username, email, password_hash, role, created_at, updated_at
- **Purpose**: Stores chat app users (separate from existing `users` table)

### 2. `chat_app_sessions`
Chat session management.
- **Columns**: id, user_id (FK → chat_app_user), title, created_at, updated_at
- **Purpose**: Stores chat sessions for each user

### 3. `chat_app_messages`
Chat message history.
- **Columns**: id, session_id (FK → chat_app_sessions), role, message, sql_query, query_result, created_at
- **Purpose**: Stores all chat messages with SQL queries and results

### 4. `chat_app_logs`
System logging.
- **Columns**: id, level, message, user_id (FK → chat_app_user), session_id (FK → chat_app_sessions), endpoint, method, ip_address, user_agent, error_details, metadata, created_at
- **Purpose**: Stores system logs, request logs, error logs, etc.

## Frontend

The frontend **does not need any updates** because:
- It only communicates via API endpoints
- API endpoints remain unchanged (`/api/chat/sessions`, `/api/auth/login`, etc.)
- All database operations are handled by the backend

## Backend

All database queries have been updated to use the new table names:
- ✅ `backend/src/config/database.js` - Table creation
- ✅ `backend/src/services/chatService.js` - All queries
- ✅ `backend/src/services/loggerService.js` - Log insertion
- ✅ `backend/src/routes/auth.js` - User queries
- ✅ `backend/src/routes/admin.js` - User management
- ✅ `backend/src/routes/system.js` - Log retrieval
- ✅ `backend/src/middleware/auth.js` - User verification

## Migration Notes

If you have existing data in old tables (`chat_sessions`, `chat_messages`, `system_logs`), you may need to migrate the data to the new tables. The application will create the new tables automatically on startup.






