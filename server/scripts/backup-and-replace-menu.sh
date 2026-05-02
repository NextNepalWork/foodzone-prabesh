#!/bin/bash

echo "🔄 Food Zone Menu Replacement Script"
echo "===================================="
echo ""
echo "This script will:"
echo "1. Backup current menu to backup-menu.sql"
echo "2. Delete all existing menu items"
echo "3. Insert new menu from Food Zone Menu Black.pdf"
echo ""
echo "📊 New Menu Summary:"
echo "   MOMO: 15 items"
echo "   CHOWMEIN: 5 items"
echo "   THUKPA: 5 items"
echo "   SOUP: 4 items"
echo "   FRIED RICE: 5 items"
echo "   BIRYANI: 5 items"
echo "   PIZZA: 5 items"
echo "   BURGER: 5 items"
echo "   SANDWICH: 5 items"
echo "   DRINKS: 11 items"
echo "   TOTAL: 65 items"
echo ""
read -p "Do you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "❌ Operation cancelled"
    exit 1
fi

echo ""
echo "📦 Creating backup..."
# Backup current menu (if using PostgreSQL)
# pg_dump -h localhost -U postgres -d restaurant_db -t menu_items > backup-menu.sql

echo "🗑️ Running menu replacement..."
node scripts/replace-menu.js

echo ""
echo "✅ Done! Please refresh your admin panel to see the new menu."
