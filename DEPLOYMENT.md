# Food Zone - Railway Deployment Guide

## 🚀 Quick Deploy to Railway

### Prerequisites
- Railway account (https://railway.app)
- GitHub repository connected
- PostgreSQL database on Railway

### Step 1: Create New Project on Railway

1. Go to https://railway.app
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose `NextNepalWork/foodzone-prabesh`

### Step 2: Add PostgreSQL Database

1. In your Railway project, click "New"
2. Select "Database" → "PostgreSQL"
3. Railway will automatically create a database

### Step 3: Configure Environment Variables

Add these environment variables to your Railway service:

```env
# Database (automatically set by Railway when you add PostgreSQL)
DATABASE_URL=${DATABASE_URL}

# Application
NODE_ENV=production
PORT=3000

# JWT Secret (generate a secure random string)
JWT_SECRET=your-super-secure-jwt-secret-here

# Admin Credentials
ADMIN_USERNAME=admin
ADMIN_PASSWORD=FoodZone2024!

# Staff Credentials
MANAGER_USERNAME=manager
MANAGER_PASSWORD=Manager2024!
CHEF_USERNAME=chef
CHEF_PASSWORD=Chef2024!
WAITER_USERNAME=waiter
WAITER_PASSWORD=Waiter2024!
CASHIER_USERNAME=cashier
CASHIER_PASSWORD=Cashier2024!

# CORS (add your frontend domain)
CORS_ORIGIN=https://foodzone.com.np,https://www.foodzone.com.np
```

### Step 4: Deploy Backend to Railway

Railway will automatically:
1. Install server dependencies (`npm install` in server folder)
2. Start the server with `node server.js`

**Note**: Frontend is deployed separately (see Step 7)

### Step 5: Set Up Custom Domain for Backend

1. In Railway project settings, go to "Settings" → "Domains"
2. Add your custom domain: `api.foodzone.com.np`
3. Update your DNS records as instructed by Railway

### Step 6: Deploy Frontend Separately

Your frontend (`foodzone.com.np`) should be deployed to a separate hosting service:

**Recommended Options:**
- **Vercel** (recommended for React apps)
- **Netlify**
- **Cloudflare Pages**

**Build Settings:**
```bash
# Root directory
client

# Build command
npm install && npm run build

# Output directory
build
```

**Environment Variables for Frontend:**
```env
REACT_APP_API_URL=https://api.foodzone.com.np
REACT_APP_SOCKET_URL=https://api.foodzone.com.np
GENERATE_SOURCEMAP=false
```

### Step 7: Configure Frontend Domain

Point `foodzone.com.np` to your frontend hosting provider (Vercel/Netlify/etc.)

## 🌐 Domain Configuration

### Your Setup:
- **Frontend**: `foodzone.com.np` (hosted separately - Vercel/Netlify/etc.)
- **Backend**: `api.foodzone.com.np` (Railway)

### DNS Records:
Add these records in your DNS provider:

**Backend (Railway):**
```
Type: CNAME
Name: api
Value: <your-railway-domain>.railway.app
```

**Frontend (Your hosting provider):**
```
Type: A or CNAME
Name: @
Value: <your-frontend-hosting-ip-or-domain>
```

## 📋 Post-Deployment Checklist

- [ ] Database connected and migrations run
- [ ] Environment variables set (see RAILWAY_ENV_VARIABLES.md)
- [ ] Custom domain configured (api.foodzone.com.np)
- [ ] DNS records updated
- [ ] Frontend deployed separately to foodzone.com.np
- [ ] Frontend pointing to correct API URL (https://api.foodzone.com.np)
- [ ] CORS configured for foodzone.com.np
- [ ] Test admin login
- [ ] Test order creation
- [ ] Test reports & analytics
- [ ] Test daybook functionality

## 🔧 Troubleshooting

### Database Connection Issues
- Check if `DATABASE_URL` is set correctly
- Verify PostgreSQL service is running
- Check Railway logs for connection errors

### Build Failures
- Check Railway build logs
- Verify all dependencies are in `package.json`
- Ensure Node version compatibility (18.x)

### API Not Responding
- Check if server is running in Railway logs
- Verify PORT environment variable
- Check CORS settings

## 📊 Monitoring

View logs in Railway:
```bash
# In Railway dashboard
Project → Service → Deployments → View Logs
```

## 🔄 Continuous Deployment

Railway automatically deploys when you push to `main` branch:

```bash
git add .
git commit -m "Your changes"
git push origin main
```

Railway will detect the push and redeploy automatically!

## 🎯 Current Status

✅ Code pushed to GitHub: https://github.com/NextNepalWork/foodzone-prabesh
✅ Railway configuration added
✅ Production API URL configured
✅ All report endpoints fixed
✅ Daybook transactions working
✅ Date range support added

## 📞 Support

For issues, check:
- Railway logs
- GitHub repository issues
- Server logs in Railway dashboard
