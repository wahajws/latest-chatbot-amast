#!/bin/bash

echo "🚀 Setting up AMAST Chatbot Application..."
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js v16 or higher."
    exit 1
fi

echo "✅ Node.js version: $(node --version)"
echo ""

# Setup Backend
echo "📦 Setting up backend..."
cd backend
if [ ! -f .env ]; then
    echo "📝 Creating .env file from .env.example..."
    cp .env.example .env
    echo "⚠️  Please edit backend/.env with your configuration"
fi
npm install
cd ..

# Setup Frontend
echo "📦 Setting up frontend..."
cd frontend
npm install
cd ..

# Setup Scripts
echo "📦 Setting up scripts..."
cd scripts
npm install
cd ..

echo ""
echo "✅ Setup complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Edit backend/.env with your database and API credentials"
echo "   2. Run schema analyzer: cd scripts && node analyze-schema.js"
echo "   3. Start backend: cd backend && npm start"
echo "   4. Start frontend: cd frontend && npm run dev"
echo ""

