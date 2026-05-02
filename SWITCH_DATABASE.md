# 🔄 Switch Between Local and Live Database

## Quick Switch Commands

### Switch to LIVE Railway Database (see real orders)

```bash
# Update server/.env
DATABASE_URL=postgresql://postgres:MxSFWCzATUDqwVIvlnzrgXAWzPOLyVpM@hopper.proxy.rlwy.net:14242/railway

# Restart server
cd server && npm start
```

### Switch to LOCAL Docker Database (safe testing)

```bash
# Update server/.env
DATABASE_URL=postgresql://foodzone_user:foodzone_password_2024@localhost:5433/foodzone_db

# Restart server
cd server && npm start
```

## Current Status

**You are currently using:** 🐳 **Local Docker Database**

## Why Use Each?

### Local Docker Database ✅
- Safe for testing
- No risk to production data
- Fast and isolated
- Empty/fresh start

### Live Railway Database ⚠️
- See real customer orders
- Test with actual data
- **WARNING:** Changes affect production!
- Use read-only when possible

## Quick Script

I can create a toggle script for you:

```bash
#!/bin/bash
# toggle-db.sh

if grep -q "railway" server/.env; then
  echo "Switching to LOCAL database..."
  sed -i '' 's|postgresql://postgres.*railway|postgresql://foodzone_user:foodzone_password_2024@localhost:5433/foodzone_db|' server/.env
  echo "✅ Now using LOCAL Docker database"
else
  echo "Switching to LIVE database..."
  sed -i '' 's|postgresql://foodzone_user.*foodzone_db|postgresql://postgres:MxSFWCzATUDqwVIvlnzrgXAWzPOLyVpM@hopper.proxy.rlwy.net:14242/railway|' server/.env
  echo "⚠️  Now using LIVE Railway database"
fi

echo "Restart your server for changes to take effect"
```

Would you like me to create this toggle script?
