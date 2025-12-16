# Environment Setup Guide

## Overview

This document describes the environment configuration for both frontend and backend applications.

## Backend Environment Variables

### File: `backend/.env`

The backend uses the following environment variables:

```env
# Database Configuration
DB_HOST=47.250.116.135
DB_PORT=5432
DB_NAME=nv_ams
DB_USER=dev_chatbot
DB_PASSWORD=Dev3!0PerDev3!0PingDev3!0Ped
DB_SSL=false

# Server Configuration
PORT=4000
NODE_ENV=development
FRONTEND_URL=http://localhost:4001

# JWT Configuration
JWT_SECRET=amast-chatbot-secret-key-change-in-production-min-32-chars-required

# Admin User Configuration
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123

# Qwen API Configuration
ALIBABA_LLM_API_KEY=sk-65507ea4e9884c378d635a38d0bb2a6f
ALIBABA_LLM_API_BASE_URL=https://dashscope-intl.aliyuncs.com/compatible-mode/v1
ALIBABA_LLM_API_MODEL=qwen-plus

# Upload Directory
UPLOAD_DIR=./uploads

# Logging Configuration
LOG_LEVEL=info
```

### Variable Descriptions

- **DB_HOST**: PostgreSQL database host address
- **DB_PORT**: PostgreSQL database port (default: 5432)
- **DB_NAME**: Database name
- **DB_USER**: Database username
- **DB_PASSWORD**: Database password
- **DB_SSL**: Enable SSL for database connection (true/false)
- **PORT**: Backend server port (default: 4000)
- **NODE_ENV**: Environment mode (development/production)
- **FRONTEND_URL**: Frontend application URL for CORS
- **JWT_SECRET**: Secret key for JWT token signing (change in production!)
- **ADMIN_USERNAME**: Default admin username
- **ADMIN_PASSWORD**: Default admin password
- **ALIBABA_LLM_API_KEY**: Qwen API key
- **ALIBABA_LLM_API_BASE_URL**: Qwen API base URL
- **ALIBABA_LLM_API_MODEL**: Qwen model name
- **UPLOAD_DIR**: Directory for file uploads
- **LOG_LEVEL**: Logging level (error/warn/info/debug)

## Frontend Environment Variables

### File: `frontend/.env`

The frontend uses Vite environment variables (must be prefixed with `VITE_`):

```env
# Frontend Server Configuration
VITE_PORT=4001

# Backend API URL (used if proxy is not configured)
VITE_API_URL=http://localhost:4000/api

# Application Configuration
VITE_APP_NAME=AMAST Chatbot
VITE_APP_VERSION=1.0.0
```

### Variable Descriptions

- **VITE_PORT**: Frontend development server port (default: 4001)
- **VITE_API_URL**: Backend API URL (fallback if proxy fails)
- **VITE_APP_NAME**: Application name
- **VITE_APP_VERSION**: Application version

## Setup Instructions

### 1. Backend Setup

1. Navigate to backend directory:
   ```bash
   cd backend
   ```

2. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

3. Edit `.env` and update any values if needed (already configured with your credentials)

4. Create uploads directory:
   ```bash
   mkdir -p uploads
   ```

5. Install dependencies:
   ```bash
   npm install
   ```

6. Start the server:
   ```bash
   npm start
   # or for development with auto-reload:
   npm run dev
   ```

The backend will run on **http://localhost:4000**

### 2. Frontend Setup

1. Navigate to frontend directory:
   ```bash
   cd frontend
   ```

2. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

3. Edit `.env` if needed (already configured)

4. Install dependencies:
   ```bash
   npm install
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

The frontend will run on **http://localhost:4001**

## Port Configuration

- **Backend**: Port 4000
- **Frontend**: Port 4001
- **API Proxy**: Frontend proxies `/api/*` requests to `http://localhost:4000`

## Production Configuration

For production deployment:

1. **Backend**:
   - Set `NODE_ENV=production`
   - Change `JWT_SECRET` to a strong, random secret (minimum 32 characters)
   - Update `FRONTEND_URL` to your production frontend URL
   - Use secure database credentials
   - Enable SSL if using HTTPS

2. **Frontend**:
   - Update `VITE_API_URL` to your production backend URL
   - Build for production: `npm run build`
   - Serve the `dist` folder with a web server (nginx, Apache, etc.)

## Security Notes

⚠️ **Important Security Considerations:**

1. **Never commit `.env` files** to version control
2. **Change JWT_SECRET** in production to a strong, random value
3. **Use strong passwords** for admin account in production
4. **Enable SSL** for database connections in production
5. **Restrict CORS** origins in production
6. **Use environment-specific** configuration files

## Troubleshooting

### Backend won't start
- Check if port 4000 is already in use
- Verify database connection credentials
- Ensure `.env` file exists in `backend/` directory

### Frontend won't connect to backend
- Verify backend is running on port 4000
- Check CORS configuration in backend
- Verify proxy configuration in `vite.config.js`

### Database connection errors
- Verify database credentials in `.env`
- Check if database server is accessible
- Ensure database exists and user has proper permissions
- Check firewall rules if connecting remotely

## File Structure

```
amast-chat/
├── backend/
│   ├── .env              # Backend environment variables (not in git)
│   ├── .env.example      # Backend environment template (in git)
│   └── uploads/          # Upload directory
├── frontend/
│   ├── .env              # Frontend environment variables (not in git)
│   └── .env.example      # Frontend environment template (in git)
└── .gitignore            # Ensures .env files are not committed
```

## Quick Start

1. **Backend**:
   ```bash
   cd backend
   cp .env.example .env  # Already done, but verify
   npm install
   npm start
   ```

2. **Frontend** (new terminal):
   ```bash
   cd frontend
   cp .env.example .env  # Already done, but verify
   npm install
   npm run dev
   ```

3. **Access**:
   - Frontend: http://localhost:4001
   - Backend API: http://localhost:4000/api
   - Health Check: http://localhost:4000/api/system/health

## Default Login Credentials

- **Username**: `admin`
- **Password**: `admin123`

⚠️ **Change these in production!**







