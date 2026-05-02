# Food Zone Development Workflow

## 🚀 Local Development Setup

### Prerequisites
- Node.js (v16+)
- Railway CLI installed and logged in
- Git configured

### Environment Configuration

#### Backend (.env.local)
```bash
# Database - Uses Railway PostgreSQL for development
DATABASE_URL=postgresql://postgres:MxSFWCzATUDqwVIvlnzrgXAWzPOLyVpM@hopper.proxy.rlwy.net:14242/railway

# Server
PORT=3000
NODE_ENV=development

# Authentication
JWT_SECRET=5718d2dc049255be537c789f284c99386c89316547cd0507bed49c63a2c4d453d966381efc1b35ac6a75af4d6b55228fc5b6fd161ca55549f917526747659953
ADMIN_USERNAME=admin
ADMIN_PASSWORD=FoodZone2024!

# CORS
CORS_ORIGIN=http://localhost:3005,http://localhost:3000
```

#### Frontend (client/.env.local)
```bash
# API Configuration for local development
REACT_APP_API_URL=http://localhost:3000
REACT_APP_BACKEND_URL=http://localhost:3000
REACT_APP_SOCKET_URL=http://localhost:3000
PORT=3005
```

## 🔄 Development Workflow

### 1. Start Local Development
```bash
# Terminal 1 - Backend
cd server
npm start

# Terminal 2 - Frontend  
cd client
npm start
```

### 2. Make Changes Locally
- Backend runs on `http://localhost:3000`
- Frontend runs on `http://localhost:3005`
- Uses same Railway PostgreSQL database as production

### 3. Deploy to Railway
```bash
# Commit changes
git add .
git commit -m "Your commit message"
git push origin main

# Railway auto-deploys from GitHub
# Check deployment status
railway status
```

## 🛠 Useful Commands

### Railway CLI Commands
```bash
# Link to Railway project
railway link

# View logs
railway logs

# Open Railway dashboard
railway open

# Check deployment status
railway status

# Pull environment variables from Railway
railway variables

# Deploy manually (if needed)
railway up
```

### Database Management
```bash
# Connect to Railway PostgreSQL
railway connect postgres

# Run SQL commands
PGPASSWORD=MxSFWCzATUDqwVIvlnzrgXAWzPOLyVpM psql -h hopper.proxy.rlwy.net -U postgres -p 14242 -d railway
```

## 📁 Project Structure
```
/
├── server/                 # Backend (Node.js/Express)
│   ├── server.js          # Main server file
│   ├── database/          # Database models and config
│   ├── middleware/        # Authentication, validation
│   └── .env.local         # Local environment variables
├── client/                # Frontend (React)
│   ├── src/               # React source code
│   ├── public/            # Static assets
│   └── .env.local         # Local frontend config
├── .env                   # Production environment (Railway)
└── railway.toml           # Railway deployment config
```

## 🌐 URLs

### Local Development
- **Backend API:** http://localhost:3000
- **Frontend:** http://localhost:3005
- **Admin Panel:** http://localhost:3005/admin

### Production
- **Backend API:** https://api.foodzone.com.np
- **Frontend:** https://foodzone.com.np
- **Admin Panel:** https://foodzone.com.np/admin

## 🔐 Login Credentials
- **Username:** admin
- **Password:** FoodZone2024!

## 📝 Notes
- Local development uses the same Railway PostgreSQL database as production
- Changes pushed to `main` branch auto-deploy to Railway
- Environment variables are managed separately for local vs production
- Frontend and backend run on different ports locally but same domain in production
