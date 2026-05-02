#!/bin/bash

# Food Zone Local Database Setup Script
echo "🗄️ Setting up Food Zone Local PostgreSQL Database..."

# Stop any existing PostgreSQL service
echo "📋 Stopping existing PostgreSQL service..."
brew services stop postgresql@15 2>/dev/null || true

# Initialize PostgreSQL data directory if it doesn't exist
PGDATA="/opt/homebrew/var/postgresql@15"
if [ ! -d "$PGDATA" ]; then
    echo "🔧 Initializing PostgreSQL data directory..."
    initdb -D "$PGDATA" --auth-local=trust --auth-host=md5
fi

# Start PostgreSQL service
echo "🚀 Starting PostgreSQL service..."
brew services start postgresql@15

# Wait for PostgreSQL to start
echo "⏳ Waiting for PostgreSQL to start..."
sleep 3

# Create the local database
echo "📊 Creating foodzone_local database..."
createdb foodzone_local 2>/dev/null || echo "Database may already exist"

# Create .env file for local development
echo "📝 Creating local .env file..."
cat > /Users/aasmidhungana/Desktop/dextop\ 22\ aug/food\ zone/Geo\ Tage-\ Food\ zone/server/.env << EOF
# Food Zone Local Database Configuration
DATABASE_URL=postgresql://$(whoami)@localhost:5432/foodzone_local

# Server Configuration
PORT=5001
NODE_ENV=development

# Restaurant Configuration
RESTAURANT_NAME="Food Zone Local"
RESTAURANT_PHONE="9851234567"
RESTAURANT_ADDRESS="Local Development"
RESTAURANT_LATITUDE=27.6710
RESTAURANT_LONGITUDE=85.4298

# Delivery Configuration
DELIVERY_RADIUS=5.0
MIN_DELIVERY_AMOUNT=200
BASE_DELIVERY_FEE=50
EOF

echo "✅ Local database setup script created!"
echo "📋 Next steps:"
echo "   1. Run: chmod +x setup-local-database.sh"
echo "   2. Run: ./setup-local-database.sh"
echo "   3. Run the schema and data import scripts"
