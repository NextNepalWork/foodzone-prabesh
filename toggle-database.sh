#!/bin/bash

echo "🔄 Database Toggle Script"
echo ""

if grep -q "railway" server/.env; then
  echo "Current: 🌐 LIVE Railway Database"
  echo "Switching to: 🐳 LOCAL Docker Database..."
  sed -i '' 's|postgresql://postgres.*railway|postgresql://foodzone_user:foodzone_password_2024@localhost:5433/foodzone_db|' server/.env
  echo ""
  echo "✅ Switched to LOCAL Docker database"
  echo "   - Safe for testing"
  echo "   - No risk to production"
  echo "   - Fresh/empty data"
else
  echo "Current: 🐳 LOCAL Docker Database"
  echo "Switching to: 🌐 LIVE Railway Database..."
  sed -i '' 's|postgresql://foodzone_user.*foodzone_db|postgresql://postgres:MxSFWCzATUDqwVIvlnzrgXAWzPOLyVpM@hopper.proxy.rlwy.net:14242/railway|' server/.env
  echo ""
  echo "⚠️  Switched to LIVE Railway database"
  echo "   - Real customer orders visible"
  echo "   - Changes affect production!"
  echo "   - Be careful with deletions"
fi

echo ""
echo "🔄 Restart your server:"
echo "   cd server && npm start"
