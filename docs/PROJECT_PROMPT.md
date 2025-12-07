# Chatbot Application Development Prompt

## Project Overview
Create a full-stack chatbot application that intelligently queries a PostgreSQL database containing 300+ tables with thousands of rows. The application should understand the database schema and the AMAST Sales Manual - DMS.pdf documentation to answer questions about the database and application functionality.

## Technology Stack

### Frontend
- **Framework**: React.js
- **UI Design**: **EXACTLY match OpenAI ChatGPT interface** - identical layout, styling, colors, typography, and interactions
- **State Management**: React Context API or Redux (as needed)
- **Styling**: CSS Modules, Styled Components, or Tailwind CSS (must replicate ChatGPT's exact appearance)
- **HTTP Client**: Axios or Fetch API

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL (existing server, 300+ tables)
- **LLM Integration**: Alibaba Qwen model API
- **Authentication**: JWT or session-based
- **PDF Processing**: pdf-parse or similar library

### Database
- **Primary DB**: Existing PostgreSQL server (read-only for application data)
- **Application Tables**: Chat history, user management (created on startup)

## Core Features

### 1. Database Schema Analysis
- On application startup, connect to PostgreSQL database
- Extract complete database schema information:
  - Table names
  - Column names and types
  - Foreign key relationships
  - Indexes
  - Constraints
  - Sample data structure (first few rows of each table)
- Format schema information in a structured way for LLM consumption

### 2. PDF Document Processing
- Load and parse "AMAST Sales Manual - DMS.pdf" on startup
- Extract text content from PDF
- Create a structured overview/summary of the application functionality
- Store processed content for LLM context

### 3. Qwen Model Agent Setup
- Initialize Qwen model connection/API on application startup
- Create a persistent agent instance that maintains context
- Configure agent with:
  - Complete database schema information
  - PDF manual content/overview
  - System prompts for query generation and result refinement
  - Instructions for SQL query generation and safety

### 4. User Management System
- Create `users` table on startup if it doesn't exist:
  - id (primary key)
  - username (unique)
  - email (unique)
  - password_hash
  - role (admin, user)
  - created_at
  - updated_at
- Create default admin user:
  - Username: admin
  - Password: (configurable, should be set via environment variable)
  - Role: admin

### 5. Chat History Management
- Create `chat_sessions` table on startup if it doesn't exist:
  - id (primary key)
  - user_id (foreign key to users)
  - title (optional, auto-generated from first message)
  - created_at
  - updated_at
- Create `chat_messages` table on startup if it doesn't exist:
  - id (primary key)
  - session_id (foreign key to chat_sessions)
  - role (user, assistant)
  - message (text content)
  - sql_query (nullable, stores generated SQL if applicable)
  - query_result (nullable, stores raw query result)
  - created_at

### 6. Chatbot Workflow
The chatbot should follow this workflow for each user query:

1. **User Input**: User sends a question via chat interface
2. **Context Preparation**: 
   - Retrieve relevant chat history (last N messages for context)
   - Prepare database schema information
   - Include PDF manual context
3. **Query Generation**: 
   - Send to Qwen model with:
     - User question
     - Database schema
     - PDF manual context
     - Chat history context
     - Instructions to generate SQL query
   - LLM returns SQL query
4. **Query Execution**:
   - Validate SQL query (safety checks: no DROP, DELETE, UPDATE, ALTER, etc.)
   - Execute query against PostgreSQL database
   - Capture query results
5. **Result Refinement**:
   - Send query results back to Qwen model
   - Include original question and generated SQL
   - LLM refines and formats the results into natural language
6. **Response Delivery**:
   - Send refined response to user
   - Store conversation in database (user message, SQL query, results, assistant response)

### 7. UI/UX Design - ChatGPT Interface Replication

**CRITICAL**: The UI must be **EXACTLY** the same as OpenAI ChatGPT. Every visual element, interaction, and behavior must match.

#### Layout Structure (ChatGPT Clone)
- **Left Sidebar** (Collapsible):
  - "+ New chat" button at top (green/primary color)
  - Scrollable list of previous chat sessions
  - Each session shows:
    - Title (truncated with ellipsis)
    - Last message preview or timestamp
    - Hover effect with edit/delete options
  - User profile/account section at bottom
  - Collapse/expand toggle button
  - Dark gray/black background (#202123 or similar)
  - Smooth animations for expand/collapse

- **Main Chat Area**:
  - Centered content with max-width constraint
  - White/light background (#FFFFFF or #F7F7F8)
  - Messages displayed in conversation format
  - User messages: Right-aligned, white/light background, rounded corners
  - Assistant messages: Left-aligned, slightly gray background, rounded corners
  - Smooth scrolling to latest message
  - Typing indicator when assistant is responding

- **Input Area** (Bottom):
  - Fixed at bottom of viewport
   - Text input field with rounded corners
   - Send button (arrow icon) on right side
   - Disabled state when processing
   - Character limit indicator (if applicable)
   - White background with subtle border

#### Visual Design Specifications

**Colors** (Match ChatGPT exactly):
- Background: #FFFFFF or #F7F7F8 (light mode)
- Sidebar: #202123 or #171717 (dark gray/black)
- Primary/Accent: #10A37F (green) or ChatGPT's primary color
- Text Primary: #353740 or #2D333A (dark gray)
- Text Secondary: #6E6E80 (medium gray)
- Border: #E5E5E5 or #D1D5DB (light gray)
- User Message BG: #FFFFFF or #F7F7F8
- Assistant Message BG: #F7F7F8 or #FFFFFF with subtle border
- Hover States: Slight background color change

**Typography**:
- Font Family: System fonts (Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif)
- Font Sizes:
  - Chat messages: 16px base
  - Sidebar items: 14px
  - Headers: 18-20px
- Line Height: 1.5-1.75
- Font Weight: 400 (regular), 500 (medium), 600 (semibold)

**Spacing & Sizing**:
- Message padding: 16px-24px
- Message margin: 16px-20px between messages
- Border radius: 8px-12px for messages
- Input padding: 12px-16px
- Sidebar width: ~260px when expanded, ~60px when collapsed

**Interactions & Animations**:
- Smooth scroll behavior
- Fade-in animations for new messages
- Typing indicator animation (three dots bouncing)
- Hover effects on interactive elements
- Smooth transitions (0.2s-0.3s)
- Loading states with spinner or skeleton
- Copy button on assistant messages (appears on hover)
- Regenerate response button
- Edit message functionality

#### Chat Interface Features
- **Message Display**:
  - Markdown rendering for assistant responses
  - Code blocks with syntax highlighting
  - Tables formatted nicely
  - Links clickable
  - Copy code button in code blocks
  
- **Message Actions** (on hover):
  - Copy message
  - Edit message (for user messages)
  - Regenerate response
  - Thumbs up/down feedback

- **Loading States**:
  - Typing indicator (animated dots) when assistant is thinking
  - Disabled input during processing
  - Smooth message appearance

- **Error Handling**:
  - Error messages displayed inline
  - Retry button for failed requests
  - User-friendly error messages

#### Session Management (Sidebar)
- **New Chat Button**: 
  - Prominent green/primary button at top
  - "+" icon with "New chat" text
  - Creates new session and clears current chat

- **Session List**:
  - Chronological order (newest first or most recent activity)
  - Click to load session
  - Hover shows edit/delete icons
  - Active session highlighted
  - Truncated titles with tooltip on hover
  - Timestamp or relative time display

- **Session Actions**:
  - Rename session (inline edit)
  - Delete session (with confirmation)
  - Archive session (optional)

#### Additional UI Elements
- **Settings/Profile Menu** (Bottom of sidebar):
  - User avatar/name
  - Settings link
  - Logout button
  - Theme toggle (if implementing dark mode)

- **Admin Panel** (Separate route, accessible via settings):
  - User management interface
  - System settings
  - Database insights (optional)

#### Responsive Design
- Mobile: Sidebar becomes overlay/drawer
- Tablet: Collapsible sidebar
- Desktop: Full sidebar visible
- Touch-friendly interactions on mobile
- Maintain ChatGPT's exact appearance across all screen sizes

#### Accessibility
- Keyboard navigation support
- ARIA labels for screen readers
- Focus indicators
- High contrast mode support
- Proper heading hierarchy

## Application Startup Sequence

1. **Environment Check**:
   - Verify PostgreSQL connection
   - Check Qwen API credentials
   - Validate required environment variables

2. **Database Initialization**:
   - Connect to PostgreSQL
   - Check if `users` table exists, create if not
   - Check if `chat_sessions` table exists, create if not
   - Check if `chat_messages` table exists, create if not
   - Check if admin user exists, create if not (use default credentials from env)

3. **Schema Extraction**:
   - Query PostgreSQL information_schema to get all table structures
   - Extract column details, data types, relationships
   - Format into JSON or structured text for LLM

4. **PDF Processing**:
   - Load "AMAST Sales Manual - DMS.pdf"
   - Extract text content
   - Create summary/overview document

5. **LLM Agent Initialization**:
   - Initialize Qwen model connection
   - Send initial context:
     - Database schema information
     - PDF manual content
     - System instructions for query generation
   - Verify agent is ready

6. **Server Startup**:
   - Start Express.js server
   - Initialize routes
   - Start WebSocket server (if using real-time chat)
   - Log successful startup

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/register` - User registration (optional)
- `GET /api/auth/me` - Get current user

### Chat
- `POST /api/chat/sessions` - Create new chat session
- `GET /api/chat/sessions` - List user's chat sessions
- `GET /api/chat/sessions/:id` - Get session details
- `DELETE /api/chat/sessions/:id` - Delete session
- `POST /api/chat/sessions/:id/messages` - Send message to chat
- `GET /api/chat/sessions/:id/messages` - Get session messages

### Admin
- `GET /api/admin/users` - List all users (admin only)
- `POST /api/admin/users` - Create user (admin only)
- `PUT /api/admin/users/:id` - Update user (admin only)
- `DELETE /api/admin/users/:id` - Delete user (admin only)

### System
- `GET /api/system/health` - Health check
- `GET /api/system/schema` - Get database schema info (admin only)

## Environment Variables

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=your_database_name
DB_USER=your_db_user
DB_PASSWORD=your_db_password

# Qwen Model
QWEN_API_KEY=your_qwen_api_key
QWEN_API_URL=https://api.qwen.com/v1/chat/completions
QWEN_MODEL=qwen-turbo  # or appropriate model name

# Application
NODE_ENV=production
PORT=3000
JWT_SECRET=your_jwt_secret
ADMIN_USERNAME=admin
ADMIN_PASSWORD=change_me_in_production

# PDF Path
PDF_MANUAL_PATH=./AMAST Sales Manual - DMS.pdf
```

## Security Considerations

1. **SQL Injection Prevention**:
   - Validate all SQL queries before execution
   - Whitelist allowed SQL operations (SELECT only)
   - Use parameterized queries where possible
   - Implement query timeout limits

2. **Authentication & Authorization**:
   - Secure password hashing (bcrypt)
   - JWT token expiration
   - Role-based access control
   - Session management

3. **API Security**:
   - Rate limiting
   - CORS configuration
   - Input validation
   - Error message sanitization

4. **Database Security**:
   - Read-only database user for application queries
   - Connection pooling
   - Query result size limits
   - Timeout configurations

## LLM Prompt Engineering

### System Prompt for Query Generation
```
You are a SQL query generator for a PostgreSQL database. Your task is to:
1. Understand user questions about the database
2. Generate safe, read-only SQL SELECT queries
3. Consider the database schema provided
4. Reference the application manual when needed
5. Never generate DROP, DELETE, UPDATE, INSERT, or ALTER statements

Database Schema:
[SCHEMA_INFORMATION]

Application Manual:
[PDF_CONTENT]

Generate SQL queries that are:
- Safe (SELECT only)
- Efficient (use indexes when possible)
- Accurate (match user intent)
- Well-formatted
```

### System Prompt for Result Refinement
```
You are a data analyst assistant. Your task is to:
1. Take SQL query results
2. Format them into natural, understandable language
3. Highlight key insights
4. Present data clearly
5. Answer the original user question

Original Question: [USER_QUESTION]
SQL Query: [GENERATED_SQL]
Query Results: [QUERY_RESULTS]

Provide a clear, concise answer based on the data.
```

## Error Handling

1. **Database Connection Errors**: Retry logic, graceful degradation
2. **LLM API Errors**: Fallback responses, retry with exponential backoff
3. **SQL Execution Errors**: User-friendly error messages, log technical details
4. **PDF Processing Errors**: Fallback to schema-only mode
5. **Authentication Errors**: Clear error messages, security logging

## Performance Optimization

1. **Schema Caching**: Cache database schema information (refresh periodically)
2. **PDF Caching**: Cache processed PDF content
3. **Query Result Caching**: Cache common query results (optional)
4. **Connection Pooling**: Use PostgreSQL connection pooling
5. **Async Processing**: Use async/await for all I/O operations
6. **Pagination**: Implement pagination for large result sets

## Testing Requirements

1. **Unit Tests**: Core business logic, query validation
2. **Integration Tests**: API endpoints, database operations
3. **E2E Tests**: Complete chat workflow
4. **Security Tests**: SQL injection attempts, authentication bypass

## Deployment Considerations

1. **Environment Configuration**: Separate configs for dev/staging/prod
2. **Logging**: Structured logging (Winston, Pino)
3. **Monitoring**: Health checks, metrics collection
4. **Backup**: Database backup strategy for chat history
5. **Process Management**: Use PM2 or similar for production process management
6. **Reverse Proxy**: Nginx or similar for serving static files and proxying API requests

## File Structure

```
amast-chat/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.js
│   │   │   ├── qwen.js
│   │   │   └── env.js
│   │   ├── models/
│   │   │   ├── User.js
│   │   │   ├── ChatSession.js
│   │   │   └── ChatMessage.js
│   │   ├── services/
│   │   │   ├── schemaService.js
│   │   │   ├── pdfService.js
│   │   │   ├── qwenService.js
│   │   │   ├── queryService.js
│   │   │   └── chatService.js
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── chat.js
│   │   │   ├── admin.js
│   │   │   └── system.js
│   │   ├── middleware/
│   │   │   ├── auth.js
│   │   │   └── errorHandler.js
│   │   ├── utils/
│   │   │   ├── sqlValidator.js
│   │   │   └── logger.js
│   │   └── server.js
│   ├── migrations/
│   │   └── 001_initial_schema.sql
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Chat/
│   │   │   ├── Dashboard/
│   │   │   ├── UserManagement/
│   │   │   └── Common/
│   │   ├── services/
│   │   │   ├── api.js
│   │   │   └── auth.js
│   │   ├── context/
│   │   │   └── AuthContext.js
│   │   ├── pages/
│   │   │   ├── Login.js
│   │   │   ├── Chat.js
│   │   │   ├── Dashboard.js
│   │   │   └── Admin.js
│   │   ├── App.js
│   │   └── index.js
│   └── package.json
├── docs/
│   ├── SETUP.md
│   └── PROJECT_PROMPT.md
├── AMAST Sales Manual - DMS.pdf
├── .env.example
└── README.md
```

## Development Phases

### Phase 1: Setup & Infrastructure
- Project initialization
- Database connection setup
- Basic Express.js server
- React app setup
- Environment configuration

### Phase 2: Database & Schema
- Schema extraction service
- PDF processing service
- Database initialization (tables, admin user)
- Schema caching

### Phase 3: Qwen Integration
- Qwen API integration
- Agent initialization
- Query generation service
- Result refinement service

### Phase 4: Chat System
- Chat API endpoints
- Message storage
- Session management
- Real-time chat (optional)

### Phase 5: Frontend
- Login/authentication UI (simple, clean design)
- **ChatGPT clone interface** (exact replication):
  - Left sidebar with session management
  - Main chat area with message display
  - Input area at bottom
  - All styling, colors, typography matching ChatGPT
  - Animations and interactions
  - Markdown rendering
  - Code syntax highlighting
- Session management UI (integrated in sidebar)

### Phase 6: Admin Features
- User management API
- Admin dashboard
- System monitoring

### Phase 7: Polish & Security
- Security hardening
- Error handling
- Performance optimization
- Testing
- Documentation

## Success Criteria

1. Application starts successfully and initializes all components
2. Admin user can log in with default credentials
3. Users can ask questions about the database
4. System generates accurate SQL queries
5. Query results are refined and presented clearly
6. Chat history is persisted and retrievable
7. Dashboard provides good user experience
8. System handles errors gracefully
9. Security measures prevent SQL injection and unauthorized access
10. Performance is acceptable for production use

---

**Note**: This prompt should be used as a comprehensive guide for building the chatbot application. Each section should be implemented with attention to detail, security, and user experience.

