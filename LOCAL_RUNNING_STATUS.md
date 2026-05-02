# ✅ Food Zone - Local Development Running

## 🎉 Status: RUNNING SUCCESSFULLY

### Current Setup

**Backend Server:**
- ✅ Running on: http://localhost:3000
- ✅ Health Check: http://localhost:3000/health
- ✅ API Endpoints: http://localhost:3000/api/
- ✅ Database: Connected to Railway PostgreSQL
- ✅ Environment: Development mode

**Database:**
- ✅ Docker PostgreSQL: Running on port 5433 (backup option)
- ✅ Railway PostgreSQL: Currently in use (from .env.local)
- ✅ Tables initialized: menu_items, restaurant_settings, orders, payments, etc.

**Graphify Knowledge Graph:**
- ✅ Installed and configured
- ✅ Graph location: `graphify-out/`
- ✅ 8,510 nodes, 26,982 edges analyzed
- ✅ Token reduction: Up to 71.5x

## 🌐 Access Points

### Backend API
- **Base URL:** http://localhost:3000
- **Health:** http://localhost:3000/health
- **Menu:** http://localhost:3000/api/menu
- **Orders:** http://localhost:3000/api/orders
- **Payments:** http://localhost:3000/api/payments

### Admin Panel
- **URL:** http://localhost:3000/admin
- **Username:** admin
- **Password:** FoodZone2024!

### Staff Accounts
- **Manager:** manager / Manager2024!
- **Chef:** chef / Chef2024!
- **Waiter:** waiter / Waiter2024!
- **Cashier:** cashier / Cashier2024!

## 📊 Database Options

### Option 1: Railway PostgreSQL (Current)
```env
DATABASE_URL=postgresql://postgres:MxSFWCzATUDqwVIvlnzrgXAWzPOLyVpM@hopper.proxy.rlwy.net:14242/railway
```
✅ Currently active
✅ Shared with production
✅ No local setup needed

### Option 2: Local Docker PostgreSQL
```env
DATABASE_URL=postgresql://foodzone_user:foodzone_password_2024@localhost:5433/foodzone_db
```
✅ Running on port 5433
✅ Isolated local data
✅ Faster for development

To switch to local database:
1. Update `DATABASE_URL` in `.env.local`
2. Restart server: `npm start` (in server directory)

## 🛠️ Management Commands

### Server Control
```bash
# View server logs
# (Server is running in background process)

# Restart server
cd server && npm start

# Stop server
# Use Kiro's process management or Ctrl+C in terminal
```

### Database Management
```bash
# Check Docker database status
docker ps | grep foodzone_postgres

# Access database directly
docker exec -it foodzone_postgres psql -U foodzone_user -d foodzone_db

# View database logs
docker logs foodzone_postgres

# Restart database
docker-compose restart postgres

# Stop database
docker-compose down
```

### Graphify Commands
```bash
# Query the knowledge graph
python3.10 -m graphify query "how does authentication work"

# Find path between components
python3.10 -m graphify path "authenticateAdmin" "query"

# Explain a component
python3.10 -m graphify explain "useCart"

# Update graph after code changes
python3.10 -m graphify update raw/
```

## 🧪 Test the System

### 1. Check Server Health
```bash
curl http://localhost:3000/health
```

### 2. Get Menu Items
```bash
curl http://localhost:3000/api/menu
```

### 3. Test Authentication
```bash
curl -X POST http://localhost:3000/api/auth/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"FoodZone2024!"}'
```

## 📱 Frontend Setup (Optional)

If you want to run the React frontend locally:

```bash
cd client
npm install
npm start
```

Frontend will run on: http://localhost:3005

## 🔧 Troubleshooting

### Server not responding
```bash
# Check if server is running
curl http://localhost:3000/health

# Check server logs in Kiro's terminal panel
```

### Database connection issues
```bash
# Test Railway database connection
psql "postgresql://postgres:MxSFWCzATUDqwVIvlnzrgXAWzPOLyVpM@hopper.proxy.rlwy.net:14242/railway"

# Or switch to local Docker database (see Database Options above)
```

### Port conflicts
```bash
# Check what's using port 3000
lsof -ti:3000

# Kill process if needed
kill -9 $(lsof -ti:3000)
```

## 📚 Documentation

- **Setup Guide:** `LOCAL_SETUP_GUIDE.md`
- **Payment Flow:** See Graphify query results
- **API Documentation:** Check `server/server.js` for all endpoints
- **Knowledge Graph:** `graphify-out/GRAPH_REPORT.md`

## 🎯 Next Steps

1. **Test the API:** Use the curl commands above
2. **Access Admin Panel:** http://localhost:3000/admin
3. **Query Codebase:** Use Graphify commands to explore
4. **Start Frontend:** If needed, run `cd client && npm start`
5. **Make Changes:** Server will auto-reload on file changes (if using nodemon)

## 🚀 Quick Commands

```bash
# Start everything
docker-compose up -d postgres && cd server && npm start

# Stop everything
docker-compose down && # Stop server with Ctrl+C

# View all running services
docker ps && curl http://localhost:3000/health
```

---

**Status:** ✅ All systems operational
**Last Updated:** April 20, 2026
**Server Uptime:** Running since startup
