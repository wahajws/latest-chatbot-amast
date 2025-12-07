# AMAST Database Chatbot

A full-stack chatbot application that intelligently queries a PostgreSQL database using Alibaba Qwen LLM. The application understands the database schema (335+ tables) and AMAST Sales Manual to answer questions about the database with natural language.

## 🚀 Quick Start

See [QUICK_START.md](QUICK_START.md) for detailed setup instructions.

## Features

- 🤖 **Intelligent Query Generation**: Uses Qwen LLM to generate SQL queries from natural language
- 📊 **Database Understanding**: Understands 335+ tables with business context from PDF manual
- 💬 **ChatGPT-like Interface**: Exact replica of OpenAI ChatGPT UI with premium dark theme
- 🔐 **User Authentication**: JWT-based authentication with role-based access
- 📝 **Chat History**: Persistent chat sessions and message history
- 👥 **User Management**: Admin panel for user management
- 📈 **Dashboard**: Real-time analytics with KPIs, charts, and data tables
- 📄 **AI Reports**: Generate comprehensive business intelligence reports using AI
- 🔍 **Two-Stage Processing**: Efficient table identification and SQL generation
- ✏️ **SQL Editor**: Edit and refine generated SQL queries

## Project Structure

```
amast-chat/
├── backend/              # Node.js/Express backend
│   ├── src/
│   │   ├── config/      # Database, Qwen API config
│   │   ├── services/     # Business logic (schema, PDF, Qwen, chat)
│   │   ├── routes/       # API routes (auth, chat, admin, system)
│   │   ├── middleware/   # Authentication middleware
│   │   └── server.js     # Express server
│   └── package.json
├── frontend/             # React.js frontend
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── pages/        # Page components
│   │   ├── context/      # React context (Auth)
│   │   ├── services/     # API service
│   │   └── App.jsx
│   └── package.json
├── scripts/              # Utility scripts
│   └── analyze-schema.js # Schema extraction
├── output/               # Generated files
│   └── database-schema.json
├── docs/                 # Documentation
└── AMAST Sales Manual - DMS.pdf
```

## Prerequisites

- Node.js (v16 or higher)
- PostgreSQL database access
- Alibaba Qwen API access
- Schema file: `output/database-schema.json` (run schema analyzer first)

## Setup

### 1. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your configuration
npm start
```

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

### 3. Generate Schema (First Time)

```bash
cd scripts
npm install
node analyze-schema.js
```

This will generate `output/database-schema.json` which the backend needs.

## Environment Variables

### Backend (.env)

```env
# Database
DB_HOST=47.250.116.135
DB_PORT=5432
DB_NAME=nv_ams
DB_USER=dev_chatbot
DB_PASSWORD=your_password
DB_SSL=false

# Qwen API
ALIBABA_LLM_API_KEY=your_api_key
ALIBABA_LLM_API_BASE_URL=https://dashscope-intl.aliyuncs.com/compatible-mode/v1
ALIBABA_LLM_API_MODEL=qwen-plus

# Application
NODE_ENV=development
PORT=3001
JWT_SECRET=your-secret-key
ADMIN_USERNAME=admin
ADMIN_PASSWORD=change_me

# File Paths
PDF_MANUAL_PATH=../AMAST Sales Manual - DMS.pdf
SCHEMA_CACHE_PATH=../output/database-schema.json

# CORS
FRONTEND_URL=http://localhost:3000
```

## Usage

1. **Start Backend**: `cd backend && npm start`
2. **Start Frontend**: `cd frontend && npm run dev`
3. **Access Application**: http://localhost:3000
4. **Login**: Use default admin credentials (from .env)

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout

### Chat
- `POST /api/chat/sessions` - Create session
- `GET /api/chat/sessions` - List sessions
- `GET /api/chat/sessions/:id` - Get session messages
- `PUT /api/chat/sessions/:id` - Update session title
- `DELETE /api/chat/sessions/:id` - Delete session
- `POST /api/chat/sessions/:id/messages` - Send message

### Admin
- `GET /api/admin/users` - List users
- `POST /api/admin/users` - Create user
- `PUT /api/admin/users/:id` - Update user
- `DELETE /api/admin/users/:id` - Delete user

### System
- `GET /api/system/health` - Health check
- `GET /api/system/schema` - Schema info (admin)

## Development

### Backend Development
```bash
cd backend
npm run dev  # Uses nodemon for auto-reload
```

### Frontend Development
```bash
cd frontend
npm run dev  # Vite dev server with hot reload
```

## Production Build

### Frontend
```bash
cd frontend
npm run build
# Output in frontend/dist/
```

### Backend
```bash
cd backend
npm start
# Or use PM2: pm2 start src/server.js
```

## Troubleshooting

See `docs/TROUBLESHOOTING_CONNECTION.md` for database connection issues.

## Documentation

- `docs/PROJECT_PROMPT.md` - Complete project specifications
- `docs/UI_SPECIFICATION.md` - ChatGPT UI clone details
- `docs/QWEN_ARCHITECTURE.md` - How Qwen understands the database
- `docs/PROMPT_STRATEGY.md` - Prompt engineering strategy
- `docs/AMAST_SPECIFIC_QUESTIONS.md` - Test questions

## License

ISC

