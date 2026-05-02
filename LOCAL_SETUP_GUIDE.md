# 🚀 Food Zone - Local Development Setup Guide

## Prerequisites

1. **Node.js 18+** ✅ (Already installed)
2. **Python 3.10+** ✅ (Already installed)
3. **Docker Desktop** ✅ (Installed but not running)
4. **Graphify** ✅ (Already installed)

## Step-by-Step Setup

### 1. Start Docker Desktop

**macOS:**
- Open Docker Desktop from Applications
- Wait for Docker to start (whale icon in menu bar should be steady)

Or start from terminal:
```bash
open -a Docker
```

### 2. Start PostgreSQL Database

Once Docker is running:

```bash
# Start PostgreSQL container
docker-compose up -d postgres

# Wait for database to be ready (takes ~10 seconds)
sleep 10

# Verify database is running
docker ps
```

You should see `foodzone_postgres` container running.

### 3. Update Environment Configuration

Your `.env.local` currently points to Railway. For local development, update it:

```bash
# Backup current config
cp .env.local .env.local.backup

# Update database URL for local PostgreSQL
```

**Option A: Use local PostgreSQL (recommended for development)**
```env
DATABASE_URL=postgresql://foodzone_user:foodzone_password_2024@localhost:5432/foodzone_db
```

**Option B: Keep using Railway (current setup)**
```env
DATABASE_URL=postgresql://postgres:MxSFWCzATUDqwVIvlnzrgXAWzPOLyVpM@hopper.proxy.rlwy.net:14242/railway
```

### 4. Install Dependencies

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies (if running frontend locally)
cd ../client
npm install

cd ..
```

### 5. Start the Server

```bash
# From project root
cd server
npm start

# Or use the convenience script
cd ..
./start-local.sh
```

The server will start on **http://localhost:3000**

### 6. Start the Client (Optional)

If you want to run the frontend locally:

```bash
cd client
npm start
```

The client will start on **http://localhost:3005**

## 🗄️ Database Management

### Access pgAdmin (Optional)

Start pgAdmin for visual database management:

```bash
docker-compose --profile tools up -d pgadmin
```

Access at: **http://localhost:8080**
- Email: `admin@foodzone.com`
- Password: `admin123`

### Connect to Database

**Connection Details:**
- Host: `localhost`
- Port: `5432`
- Database: `foodzone_db`
- Username: `foodzone_user`
- Password: `foodzone_password_2024`

### Direct Database Access

```bash
# Connect via psql
docker exec -it foodzone_postgres psql -U foodzone_user -d foodzone_db

# Run SQL commands
\dt  # List tables
\q   # Quit
```

## 🔧 Useful Commands

### Docker Management

```bash
# View running containers
docker ps

# View logs
docker logs foodzone_postgres

# Stop containers
docker-compose down

# Stop and remove data
docker-compose down -v

# Restart database
docker-compose restart postgres
```

### Server Management

```bash
# Start server
cd server && npm start

# Start with auto-reload
cd server && npm run dev

# Check server health
curl http://localhost:3000/health
```

## 🎯 Quick Start (All-in-One)

```bash
# 1. Start Docker Desktop (if not running)
open -a Docker && sleep 10

# 2. Start database
docker-compose up -d postgres && sleep 10

# 3. Start server
cd server && npm start
```

## 📊 Verify Setup

1. **Database Running:**
   ```bash
   docker ps | grep foodzone_postgres
   ```

2. **Server Running:**
   ```bash
   curl http://localhost:3000/health
   ```

3. **Check Logs:**
   ```bash
   # Database logs
   docker logs foodzone_postgres
   
   # Server logs (in server terminal)
   ```

## 🐛 Troubleshooting

### Docker not starting
```bash
# Check Docker status
docker info

# Restart Docker Desktop
killall Docker && open -a Docker
```

### Port already in use
```bash
# Find process using port 3000
lsof -ti:3000

# Kill process
kill -9 $(lsof -ti:3000)
```

### Database connection failed
```bash
# Check if database is ready
docker exec foodzone_postgres pg_isready -U foodzone_user -d foodzone_db

# Restart database
docker-compose restart postgres
```

### Reset everything
```bash
# Stop all containers and remove data
docker-compose down -v

# Remove node_modules
rm -rf server/node_modules client/node_modules

# Reinstall
cd server && npm install
cd ../client && npm install
```

## 🌐 Access Points

- **Backend API:** http://localhost:3000
- **Frontend (if running):** http://localhost:3005
- **pgAdmin:** http://localhost:8080
- **Health Check:** http://localhost:3000/health

## 📝 Default Credentials

### Admin
- Username: `admin`
- Password: `FoodZone2024!`

### Staff Accounts
- Manager: `manager` / `Manager2024!`
- Chef: `chef` / `Chef2024!`
- Waiter: `waiter` / `Waiter2024!`
- Cashier: `cashier` / `Cashier2024!`

## 🎉 You're Ready!

Your Food Zone restaurant system is now running locally with:
- ✅ PostgreSQL database
- ✅ Express.js backend
- ✅ Graphify knowledge graph (71.5x token reduction)
- ✅ Real-time order management
- ✅ Payment processing system

Happy coding! 🍕🍔🍟
