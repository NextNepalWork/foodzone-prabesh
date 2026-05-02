#!/bin/bash

# Food Zone Docker Database Setup Script
echo "🐳 Setting up Food Zone PostgreSQL database in Docker..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop and try again."
    exit 1
fi

# Stop and remove existing containers if they exist
echo "🧹 Cleaning up existing containers..."
docker-compose down -v 2>/dev/null || true

# Build and start the PostgreSQL container
echo "🚀 Starting PostgreSQL container..."
docker-compose up -d postgres

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
sleep 10

# Check if PostgreSQL is ready
until docker exec foodzone_postgres pg_isready -U foodzone_user -d foodzone_db; do
    echo "⏳ Waiting for PostgreSQL..."
    sleep 2
done

echo "✅ PostgreSQL is ready!"

# Optionally start pgAdmin
read -p "🔧 Do you want to start pgAdmin for database management? (y/n): " start_pgadmin
if [[ $start_pgadmin =~ ^[Yy]$ ]]; then
    echo "🚀 Starting pgAdmin..."
    docker-compose up -d pgadmin
    echo "📊 pgAdmin will be available at: http://localhost:8080"
    echo "   Email: admin@foodzone.com"
    echo "   Password: admin123"
fi

echo ""
echo "🎉 Database setup complete!"
echo "📋 Database Details:"
echo "   Host: localhost"
echo "   Port: 5432"
echo "   Database: foodzone_db"
echo "   Username: foodzone_user"
echo "   Password: foodzone_password_2024"
echo ""
echo "🚀 You can now start your Food Zone server with: npm start"
echo ""
echo "🐳 Docker containers status:"
docker-compose ps
