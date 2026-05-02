#!/bin/bash

# Food Zone Local Development Startup Script
echo "🚀 Starting Food Zone in local development mode..."

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo "❌ .env.local file not found. Please create it first."
    exit 1
fi

# Check if Docker containers are running
echo "🐳 Checking Docker containers..."
if ! docker ps | grep -q "foodzone_postgres"; then
    echo "⚠️  PostgreSQL container not running. Starting database..."
    ./setup-docker-db.sh
    echo "⏳ Waiting for database to be ready..."
    sleep 5
fi

# Navigate to server directory
cd server

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing server dependencies..."
    npm install
fi

# Start the server with local environment
echo "🚀 Starting Food Zone server..."
NODE_ENV=development node server.js
