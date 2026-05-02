# Railway Deployment Guide for Food Zone

## Prerequisites
- GitHub repository: https://github.com/NextNepalWork/foodzone
- Railway account (railway.app)
- PostgreSQL database

## Deployment Steps

### 1. Connect GitHub Repository
1. Go to Railway dashboard
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose `NextNepalWork/foodzone`

### 2. Configure Environment Variables
Set these environment variables in Railway:

#### Backend Service
```
NODE_ENV=production
PORT=3002
DATABASE_URL=postgresql://username:password@host:port/database
JWT_SECRET=your-secure-jwt-secret-here
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-secure-admin-password
```

#### Frontend Service (if deploying separately)
```
NODE_ENV=production
REACT_APP_API_URL=https://api.foodzone.com.np
REACT_APP_BACKEND_URL=https://api.foodzone.com.np
REACT_APP_SOCKET_URL=https://api.foodzone.com.np
```

### 3. Database Setup
1. Add PostgreSQL service in Railway
2. Copy the DATABASE_URL from Railway PostgreSQL service
3. Run database migrations (if needed)

### 4. Build Configuration
Railway will automatically detect:
- `server/` directory as Node.js backend
- `client/` directory as React frontend (if deploying separately)

### 5. Health Check
The backend includes a health check endpoint at `/health` for Railway monitoring.

### 6. Custom Domain (Optional)
1. Go to Settings → Domains
2. Add your custom domain
3. Configure DNS records as shown

## Project Structure for Railway
```
foodzone/
├── server/           # Backend (Node.js/Express)
├── client/           # Frontend (React)
├── railway.toml      # Railway configuration
├── Procfile         # Process configuration
└── package.json     # Root package.json
```

## Important Notes
- Backend runs on port specified by Railway's PORT environment variable
- Frontend build files are served by backend in production
- Database migrations should be run after first deployment
- SSL certificates are automatically provided by Railway

## Troubleshooting
- Check Railway logs for deployment issues
- Verify environment variables are set correctly
- Ensure DATABASE_URL is properly configured
- Health check endpoint should return 200 status
