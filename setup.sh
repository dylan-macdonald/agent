#!/bin/bash

# Setup Script for AI Personal Assistant

echo "🤖 AI Personal Assistant - Setup Script"
echo "========================================"

# 1. Check Prereqs
echo "[1/5] Checking prerequisites..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js (v18+)."
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm."
    exit 1
fi

# 2. Install Dependencies
echo "[2/5] Installing dependencies..."
npm install
if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies."
    exit 1
fi

# 3. Environment Configuration
echo "[3/5] Checking environment configuration..."
if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        echo "⚠️ .env file not found. Creating from .env.example..."
        cp .env.example .env
        echo "✅ Created .env. PLEASE EDIT IT with your API keys and DB credentials!"
    else
        echo "❌ .env.example not found. Please create .env manually."
    fi
else
    echo "✅ .env file found."
fi

# 4. Database Setup
echo "[4/5] Setting up database..."
echo "Ensure your PostgreSQL database is running."
read -p "Run database migrations now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    npm run migrate
    if [ $? -ne 0 ]; then
        echo "❌ Migration failed. Please check your DATABASE_URL in .env."
    else
        echo "✅ Migrations applied successfully."
    fi
else
    echo "Unknown or skipped."
fi

# 5. Build
echo "[5/5] Building project..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Build failed."
    exit 1
fi

echo "========================================"
echo "✅ Setup Complete!"
echo "To start the assistant:"
echo "  npm start        (Production)"
echo "  npm run dev      (Development)"
echo "========================================"
