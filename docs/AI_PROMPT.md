# AI Development Prompt - Chatbot Application

## Task
Create a full-stack chatbot application using React.js (frontend) and Node.js/Express.js (backend) that intelligently queries a PostgreSQL database using the Alibaba Qwen LLM model.

## Requirements

### Technology Stack
- **Frontend**: React.js with **EXACT ChatGPT UI clone** - identical layout, colors, typography, and interactions
- **Backend**: Node.js with Express.js framework
- **Database**: PostgreSQL (existing server with 300+ tables, thousands of rows)
- **LLM**: Alibaba Qwen model API for query generation and result refinement
- **Authentication**: JWT-based authentication system

### Core Functionality

1. **Application Startup**:
   - Connect to existing PostgreSQL database
   - Create application tables if they don't exist:
     - `users` table (id, username, email, password_hash, role, timestamps)
     - `chat_sessions` table (id, user_id, title, timestamps)
     - `chat_messages` table (id, session_id, role, message, sql_query, query_result, timestamps)
   - Create default admin user (username: admin, password from env variable)
   - Extract complete database schema from PostgreSQL (all 300+ tables)
   - Process "AMAST Sales Manual - DMS.pdf" file to extract text content
   - Initialize Qwen model agent with:
     - Complete database schema information
     - PDF manual content
     - System prompts for SQL generation and result refinement

2. **Chatbot Workflow** (for each user question):
   - User sends question via chat interface
   - System prepares context: chat history, database schema, PDF manual
   - Send to Qwen model to generate SQL query
   - Validate SQL query (ensure SELECT only, no DROP/DELETE/UPDATE/ALTER)
   - Execute SQL query against PostgreSQL database
   - Send query results back to Qwen model for refinement
   - LLM formats results into natural language answer
   - Display answer to user and store conversation in database

3. **UI Design - ChatGPT Clone**:
   - **CRITICAL**: UI must be EXACTLY the same as OpenAI ChatGPT
   - **Left Sidebar**: Collapsible sidebar with "+ New chat" button, session list, user profile at bottom
   - **Main Chat Area**: Centered messages, user messages right-aligned (white), assistant messages left-aligned (gray), smooth scrolling
   - **Input Area**: Fixed bottom input with send button, rounded corners, disabled during processing
   - **Colors**: Match ChatGPT exactly (#202123 sidebar, #F7F7F8 background, #10A37F primary, etc.)
   - **Typography**: System fonts, 16px base, proper line heights
   - **Interactions**: Smooth animations, hover effects, typing indicator, copy buttons, markdown rendering, code syntax highlighting
   - **Session Management**: Integrated in sidebar, click to load, hover to edit/delete
   - **Responsive**: Mobile drawer, tablet collapsible, desktop full sidebar
   - **Admin Panel**: Separate route accessible via settings (user management, system settings)

### API Endpoints Needed
- Authentication: `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`
- Chat: `/api/chat/sessions`, `/api/chat/sessions/:id`, `/api/chat/sessions/:id/messages`
- Admin: `/api/admin/users` (CRUD operations)
- System: `/api/system/health`, `/api/system/schema`

### Security Requirements
- SQL injection prevention (validate queries, whitelist operations)
- Secure password hashing (bcrypt)
- JWT token authentication
- Role-based access control
- Rate limiting
- Query result size limits
- Read-only database user for queries

### Environment Variables
```
DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
QWEN_API_KEY, QWEN_API_URL, QWEN_MODEL
NODE_ENV, PORT, JWT_SECRET
ADMIN_USERNAME, ADMIN_PASSWORD
PDF_MANUAL_PATH=./AMAST Sales Manual - DMS.pdf
```

### LLM Integration Details

**Query Generation Prompt**:
- Provide complete database schema (tables, columns, types, relationships)
- Include PDF manual content
- Instruct to generate safe SELECT-only SQL queries
- Consider user question and chat history context

**Result Refinement Prompt**:
- Provide original user question
- Include generated SQL query
- Include raw query results
- Instruct to format into natural, understandable language

### Error Handling
- Database connection errors with retry logic
- LLM API errors with fallback responses
- SQL execution errors with user-friendly messages
- PDF processing errors with graceful degradation

### Performance
- Cache database schema (refresh periodically)
- Cache processed PDF content
- Use PostgreSQL connection pooling
- Implement pagination for large results
- Async/await for all I/O operations

### File Structure
```
amast-chat/
├── backend/ (Node.js/Express)
│   ├── src/
│   │   ├── config/ (database, qwen, env)
│   │   ├── models/ (User, ChatSession, ChatMessage)
│   │   ├── services/ (schema, pdf, qwen, query, chat)
│   │   ├── routes/ (auth, chat, admin, system)
│   │   ├── middleware/ (auth, errorHandler)
│   │   └── utils/ (sqlValidator, logger)
│   └── package.json
├── frontend/ (React.js)
│   ├── src/
│   │   ├── components/ (Chat, Dashboard, UserManagement)
│   │   ├── services/ (api, auth)
│   │   ├── context/ (AuthContext)
│   │   ├── pages/ (Login, Chat, Dashboard, Admin)
│   │   └── App.js
│   └── package.json
├── docs/
├── AMAST Sales Manual - DMS.pdf
└── .env.example
```

### Development Phases
1. Setup & Infrastructure (DB connection, Express server, React app)
2. Database & Schema (extraction, PDF processing, initialization)
3. Qwen Integration (API setup, agent initialization, query services)
4. Chat System (API endpoints, message storage, sessions)
5. Frontend (ChatGPT clone UI - exact replication of layout, styling, colors, interactions)
6. Admin Features (user management, admin dashboard)
7. Polish & Security (hardening, testing, optimization)

### Success Criteria
- App starts and initializes all components successfully
- Admin login works with default credentials
- Users can ask database questions and get accurate answers
- SQL queries are generated correctly and safely executed
- Results are refined and presented clearly
- Chat history persists and is retrievable
- Dashboard provides good UX
- Security prevents SQL injection and unauthorized access

---

**Implementation Notes**:
- Use `pg` library for PostgreSQL connection
- Use `pdf-parse` or similar for PDF processing
- Use `axios` or `fetch` for Qwen API calls
- Use `bcrypt` for password hashing
- Use `jsonwebtoken` for JWT authentication
- Implement comprehensive error handling and logging
- Follow RESTful API design principles
- Use modern React patterns (hooks, context API)
- **CRITICAL**: Replicate ChatGPT UI exactly - study ChatGPT interface and match every detail:
  - Sidebar layout and behavior
  - Message styling and alignment
  - Color scheme and typography
  - Animations and transitions
  - Input area design
  - Hover states and interactions
  - Markdown rendering
  - Code block styling
- Ensure responsive design matching ChatGPT's mobile/tablet/desktop behavior

