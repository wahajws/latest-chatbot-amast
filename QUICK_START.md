# Quick Start Guide

## Prerequisites
- Node.js v16+
- PostgreSQL database access
- Alibaba Qwen API key

## Step 1: Generate Database Schema

```bash
cd scripts
npm install
node analyze-schema.js
```

This creates `output/database-schema.json` which the backend needs.

## Step 2: Setup Backend

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your credentials
npm start
```

Backend runs on http://localhost:3001

## Step 3: Setup Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on http://localhost:3000

## Step 4: Login

1. Open http://localhost:3000
2. Login with default admin:
   - Username: `admin`
   - Password: (from ADMIN_PASSWORD in backend/.env)

## Default Credentials

The backend automatically creates an admin user on first startup:
- Username: `admin` (or from ADMIN_USERNAME env var)
- Password: From `ADMIN_PASSWORD` env var (default: `change_me_in_production`)

## Troubleshooting

### Schema Not Found
- Run schema analyzer: `cd scripts && node analyze-schema.js`
- Check `output/database-schema.json` exists

### Database Connection Failed
- Check database credentials in backend/.env
- Verify network access to database
- See `docs/TROUBLESHOOTING_CONNECTION.md`

### PDF Not Loading
- Ensure `AMAST Sales Manual - DMS.pdf` is in project root
- Check PDF_MANUAL_PATH in backend/.env

### API Errors
- Verify Qwen API key in backend/.env
- Check API endpoint URL
- Ensure you have API credits

## Next Steps

- Try asking questions from `docs/AMAST_SPECIFIC_QUESTIONS.md`
- Explore the admin panel (if admin user)
- Review documentation in `docs/` folder




