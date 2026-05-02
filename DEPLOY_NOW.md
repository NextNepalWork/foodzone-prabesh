# 🚀 Deploy Food Zone to Production - Quick Guide

## ✅ Pre-Deployment Status

- ✅ Code pushed to GitHub: https://github.com/NextNepalWork/foodzone-prabesh
- ✅ PostgreSQL database ready on Railway
- ✅ Environment variables configured
- ✅ JWT secret generated
- ✅ CORS configured for foodzone.com.np

## 📋 Step 1: Deploy Backend to Railway

### 1.1 Create Railway Project
1. Go to https://railway.app
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose: `NextNepalWork/foodzone-prabesh`

### 1.2 Add Environment Variables
1. Click on your service
2. Go to "Variables" tab
3. Click "Raw Editor"
4. **Copy and paste from**: `RAILWAY_ENV_COPY_PASTE.txt`

**Or manually add these:**
```
DATABASE_URL=postgresql://postgres:gRdbYxmQmzmETORmMavsPpvmteqkNEEv@switchyard.proxy.rlwy.net:45455/railway
NODE_ENV=production
PORT=3000
JWT_SECRET=05ca4e8bfdc64a3d093a5e50cdec2fc05ac586b3c25bbfce6a4502289fbe7556
CORS_ORIGIN=https://foodzone.com.np,https://www.foodzone.com.np
ADMIN_USERNAME=admin
ADMIN_PASSWORD=FoodZone2024!
MANAGER_USERNAME=manager
MANAGER_PASSWORD=Manager2024!
CHEF_USERNAME=chef
CHEF_PASSWORD=Chef2024!
WAITER_USERNAME=waiter
WAITER_PASSWORD=Waiter2024!
CASHIER_USERNAME=cashier
CASHIER_PASSWORD=Cashier2024!
```

### 1.3 Configure Custom Domain
1. Go to "Settings" tab
2. Scroll to "Domains"
3. Click "Custom Domain"
4. Add: `api.foodzone.com.np`
5. Copy the CNAME value Railway provides

### 1.4 Deploy
Railway will automatically build and deploy!

**Check deployment:**
- View logs in "Deployments" tab
- Wait for "Success" status
- Test: `https://<railway-domain>.railway.app/api/health`

---

## 📋 Step 2: Deploy Frontend to Vercel

### 2.1 Create Vercel Project
1. Go to https://vercel.com
2. Click "Add New" → "Project"
3. Import: `NextNepalWork/foodzone-prabesh`

### 2.2 Configure Build Settings
```
Framework Preset: Create React App
Root Directory: client
Build Command: npm install && npm run build
Output Directory: build
Install Command: npm install
```

### 2.3 Add Environment Variables
```
REACT_APP_API_URL=https://api.foodzone.com.np
REACT_APP_SOCKET_URL=https://api.foodzone.com.np
GENERATE_SOURCEMAP=false
```

### 2.4 Configure Custom Domain
1. Go to project "Settings" → "Domains"
2. Add: `foodzone.com.np`
3. Copy the DNS records Vercel provides

### 2.5 Deploy
Click "Deploy" - Vercel will build and deploy!

---

## 📋 Step 3: Configure DNS

### 3.1 Backend DNS (api.foodzone.com.np)
Add this record in your DNS provider:
```
Type: CNAME
Name: api
Value: <your-railway-domain>.railway.app
TTL: 3600
```

### 3.2 Frontend DNS (foodzone.com.np)
Add these records (Vercel will provide exact values):
```
Type: A
Name: @
Value: <vercel-ip-address>
TTL: 3600

Type: CNAME
Name: www
Value: cname.vercel-dns.com
TTL: 3600
```

**Note**: DNS propagation can take up to 48 hours (usually 5-10 minutes)

---

## ✅ Step 4: Verify Deployment

### Backend Checks
- [ ] Railway deployment successful
- [ ] Health check works: `https://api.foodzone.com.np/api/health`
- [ ] Database connected (check Railway logs)
- [ ] CORS allows foodzone.com.np

### Frontend Checks
- [ ] Vercel deployment successful
- [ ] Site loads: `https://foodzone.com.np`
- [ ] Login page appears
- [ ] Can connect to backend API

### Test Full Flow
- [ ] Login with admin credentials
- [ ] Create a test order
- [ ] Check reports load data
- [ ] Test daybook quick actions
- [ ] Verify real-time updates work

---

## 🔐 Login Credentials

### Admin
- Username: `admin`
- Password: `FoodZone2024!`

### Manager
- Username: `manager`
- Password: `Manager2024!`

### Chef
- Username: `chef`
- Password: `Chef2024!`

### Waiter
- Username: `waiter`
- Password: `Waiter2024!`

### Cashier
- Username: `cashier`
- Password: `Cashier2024!`

---

## 🐛 Troubleshooting

### Backend Issues
1. Check Railway logs: Project → Service → Deployments → Logs
2. Verify DATABASE_URL is set correctly
3. Check if all environment variables are present
4. Verify PORT is set to 3000

### Frontend Issues
1. Check Vercel logs: Project → Deployments → Latest → Logs
2. Verify REACT_APP_API_URL points to api.foodzone.com.np
3. Check browser console for errors
4. Verify CORS is configured correctly on backend

### DNS Issues
1. Check DNS propagation: https://dnschecker.org
2. Verify CNAME records are correct
3. Wait 5-10 minutes for propagation
4. Clear browser cache

### Database Issues
1. Test connection from Railway logs
2. Verify DATABASE_URL format is correct
3. Check if database is running on Railway
4. Run migrations if needed

---

## 📊 Monitoring

### Railway (Backend)
- View logs: Project → Service → Deployments
- Check metrics: CPU, Memory, Network
- Monitor database: PostgreSQL service

### Vercel (Frontend)
- View logs: Project → Deployments
- Check analytics: Project → Analytics
- Monitor performance: Project → Speed Insights

---

## 🔄 Future Deployments

### Auto-Deploy on Git Push
Both Railway and Vercel auto-deploy when you push to `main`:

```bash
git add .
git commit -m "Your changes"
git push origin main
```

Railway and Vercel will automatically detect and deploy!

---

## 📞 Support Resources

- **Railway Docs**: https://docs.railway.app
- **Vercel Docs**: https://vercel.com/docs
- **Repository**: https://github.com/NextNepalWork/foodzone-prabesh
- **Railway Logs**: Check for backend errors
- **Vercel Logs**: Check for frontend errors

---

## 🎯 Quick Links

- **Repository**: https://github.com/NextNepalWork/foodzone-prabesh
- **Railway Dashboard**: https://railway.app
- **Vercel Dashboard**: https://vercel.com
- **Frontend**: https://foodzone.com.np
- **Backend API**: https://api.foodzone.com.np
- **Health Check**: https://api.foodzone.com.np/api/health

---

**Status**: ✅ Ready to Deploy!  
**Last Updated**: January 2025
