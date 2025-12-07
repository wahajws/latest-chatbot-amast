# Environment Files Setup

## Quick Setup

The environment files have been configured. Here's what you need to do:

### Backend Environment

1. **Create `backend/.env` file** with the following content:

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

### Frontend Environment

2. **Create `frontend/.env` file** with the following content:

```env
# Frontend Server Configuration
VITE_PORT=4001

# Backend API URL (used if proxy is not configured)
VITE_API_URL=http://localhost:4000/api

# Application Configuration
VITE_APP_NAME=AMAST Chatbot
VITE_APP_VERSION=1.0.0
```

## Port Configuration

- **Backend**: Port **4000**
- **Frontend**: Port **4001**

## Files Created

✅ `backend/.env.example` - Template for backend environment
✅ `frontend/.env.example` - Template for frontend environment
✅ `frontend/vite.config.js` - Updated to use port 4001 and proxy to 4000
✅ `backend/src/server.js` - Updated CORS to allow frontend on port 4001

## Next Steps

1. **Copy the environment files**:
   - Copy content above to `backend/.env`
   - Copy content above to `frontend/.env`

2. **Create uploads directory**:
   ```bash
   mkdir -p backend/uploads
   ```

3. **Start the applications**:
   ```bash
   # Terminal 1 - Backend
   cd backend
   npm install
   npm start

   # Terminal 2 - Frontend
   cd frontend
   npm install
   npm run dev
   ```

4. **Access the application**:
   - Frontend: http://localhost:4001
   - Backend API: http://localhost:4000/api

## Verification

- ✅ Backend will run on port 4000
- ✅ Frontend will run on port 4001
- ✅ Frontend proxy configured to backend on port 4000
- ✅ CORS configured to allow frontend origin
- ✅ All database credentials configured
- ✅ Qwen API credentials configured

