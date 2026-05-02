# Food Zone Backend Deployment Guide

## Quick Deploy on Railway

### Step 1: Create Railway Account
1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub account
3. Connect your GitHub repository

### Step 2: Deploy Backend
1. Click "New Project" → "Deploy from GitHub repo"
2. Select your Food Zone repository
3. Railway will auto-detect Node.js project
4. Add PostgreSQL database service

### Step 3: Environment Variables
Set these in Railway dashboard:

```env
DATABASE_URL=postgresql://postgres:SIPhohEQaPfxFPLQhbrYmvMHlROQEVKF@trolley.proxy.rlwy.net:41468/railway
PORT=5001
NODE_ENV=production
ALLOWED_ORIGINS=https://foodzone.com.np,https://www.foodzone.com.np,https://foodzoneduwakot.netlify.app
ADMIN_PASSWORD=FoodZone2024!
RESTAURANT_NAME=Food Zone
RESTAURANT_ADDRESS=Duwakot, Bhaktapur
RESTAURANT_PHONE=+977-1-6634455
DELIVERY_RADIUS=5
DELIVERY_FEE=50
MIN_ORDER_AMOUNT=200
```

### Step 4: Database Setup
Railway will provide PostgreSQL connection string automatically.
The app will create tables on first run.

### Step 5: Get Backend URL
After deployment, Railway provides a URL like:
`https://your-app-name.railway.app`

## Alternative: Manual Deployment

### Railway CLI Method
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway link
railway up
```

### Environment Setup
The server is configured to:
- Auto-create database tables
- Handle CORS for frontend
- Serve static files
- Enable Socket.IO for real-time updates

## Next Steps
1. Deploy backend on Railway
2. Get the live backend URL
3. Update frontend environment variables
4. Redeploy frontend with live backend URL
