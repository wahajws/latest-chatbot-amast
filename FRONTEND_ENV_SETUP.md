# Frontend Environment File Setup

## Quick Steps

1. **Navigate to frontend directory:**
   ```bash
   cd frontend
   ```

2. **Create `.env` file** in the `frontend` folder

3. **Copy this content** into `frontend/.env`:

```env
VITE_PORT=4001
VITE_API_URL=http://localhost:4000/api
VITE_APP_NAME=AMAST Chatbot
VITE_APP_VERSION=1.0.0
```

4. **Done!** The frontend will run on port 4001.

## Or use PowerShell:

```powershell
cd frontend
Copy-Item .env.example .env
```

Then edit `.env` if needed.







