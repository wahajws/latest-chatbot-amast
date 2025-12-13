# Backend Environment File Setup

## Quick Steps

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Create `.env` file** in the `backend` folder

3. **Copy this content** into `backend/.env`:

```env
DB_HOST=47.250.116.135
DB_PORT=5432
DB_NAME=nv_ams
DB_USER=dev_chatbot
DB_PASSWORD=Dev3!0PerDev3!0PingDev3!0Ped
DB_SSL=false
PORT=4000
NODE_ENV=development
FRONTEND_URL=http://localhost:4001
JWT_SECRET=amast-chatbot-secret-key-change-in-production-min-32-chars-required
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
ALIBABA_LLM_API_KEY=sk-65507ea4e9884c378d635a38d0bb2a6f
ALIBABA_LLM_API_BASE_URL=https://dashscope-intl.aliyuncs.com/compatible-mode/v1
ALIBABA_LLM_API_MODEL=qwen-plus
UPLOAD_DIR=./uploads
LOG_LEVEL=info
```

4. **Done!** The backend will run on port 4000.

## Or use PowerShell:

```powershell
cd backend
Copy-Item .env.example .env
```

Then edit `.env` if needed.




