#!/bin/bash

echo "🚀 Starting Food Zone Server (Local Development)"
echo ""
echo "📋 Configuration:"
echo "   - Server Port: 3000"
echo "   - Database: Check .env.local for DATABASE_URL"
echo "   - Environment: development"
echo ""

# Check if Docker PostgreSQL is running
if docker ps | grep -q "foodzone_postgres"; then
    echo "✅ Docker PostgreSQL is running on port 5433"
    echo "   To use Docker DB, update .env.local:"
    echo "   DATABASE_URL=postgresql://foodzone_user:foodzone_password_2024@localhost:5433/foodzone_db"
else
    echo "⚠️  Docker PostgreSQL not running"
    echo "   Currently using: Railway PostgreSQL (from .env.local)"
fi

echo ""
echo "🔧 Starting server..."
echo ""

cd server
NODE_ENV=development node server.js
