# PowerShell setup script for Windows

Write-Host "🚀 Setting up AMAST Chatbot Application..." -ForegroundColor Cyan
Write-Host ""

# Check Node.js
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js is not installed. Please install Node.js v16 or higher." -ForegroundColor Red
    exit 1
}

Write-Host ""

# Setup Backend
Write-Host "📦 Setting up backend..." -ForegroundColor Yellow
Set-Location backend
if (-not (Test-Path .env)) {
    Write-Host "📝 Creating .env file from .env.example..." -ForegroundColor Yellow
    Copy-Item .env.example .env
    Write-Host "⚠️  Please edit backend/.env with your configuration" -ForegroundColor Yellow
}
npm install
Set-Location ..

# Setup Frontend
Write-Host "📦 Setting up frontend..." -ForegroundColor Yellow
Set-Location frontend
npm install
Set-Location ..

# Setup Scripts
Write-Host "📦 Setting up scripts..." -ForegroundColor Yellow
Set-Location scripts
npm install
Set-Location ..

Write-Host ""
Write-Host "✅ Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next steps:" -ForegroundColor Cyan
Write-Host "   1. Edit backend/.env with your database and API credentials"
Write-Host "   2. Run schema analyzer: cd scripts; node analyze-schema.js"
Write-Host "   3. Start backend: cd backend; npm start"
Write-Host "   4. Start frontend: cd frontend; npm run dev"
Write-Host ""






