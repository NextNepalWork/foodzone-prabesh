# 🚀 Vercel Deployment Guide - Food Zone Frontend

## 📋 Quick Deploy to Vercel

### Step 1: Import Project

1. Go to https://vercel.com
2. Click **"Add New"** → **"Project"**
3. Click **"Import Git Repository"**
4. Select: **`NextNepalWork/foodzone-prabesh`**
5. Click **"Import"**

### Step 2: Configure Build Settings

On the configuration page, set these values:

#### Framework Preset
```
Create React App
```

#### Root Directory
```
client
```

#### Build Command
```
npm install && npm run build
```

#### Output Directory
```
build
```

#### Install Command
```
npm install
```

#### Node.js Version
```
18.x
```

### Step 3: Add Environment Variables

Click **"Environment Variables"** and add these:

#### Option A: Copy-Paste (Recommended)
Open **`VERCEL_ENV_COPY_PASTE.txt`** and copy each line as:
- **Name**: `REACT_APP_API_URL`
- **Value**: `https://api.foodzone.com.np`

#### Option B: Manual Entry

| Name | Value |
|------|-------|
| `REACT_APP_API_URL` | `https://api.foodzone.com.np` |
| `REACT_APP_SOCKET_URL` | `https://api.foodzone.com.np` |
| `REACT_APP_ADMIN_PASSWORD` | `FoodZone2024!` |
| `GENERATE_SOURCEMAP` | `false` |

**Important**: Add these to **Production**, **Preview**, and **Development** environments.

### Step 4: Deploy

1. Click **"Deploy"**
2. Wait for build to complete (2-3 minutes)
3. Vercel will show you a preview URL

### Step 5: Configure Custom Domain

1. Go to **Project Settings** → **"Domains"**
2. Click **"Add"**
3. Enter: `foodzone.com.np`
4. Click **"Add"**
5. Vercel will show you DNS records to add

#### DNS Configuration

Add these records in your DNS provider (e.g., Namecheap, GoDaddy, Cloudflare):

**For Root Domain (foodzone.com.np):**
```
Type: A
Name: @
Value: 76.76.21.21
TTL: 3600
```

**For WWW Subdomain:**
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
TTL: 3600
```

**Note**: Vercel will show you the exact values. Use those instead if different.

### Step 6: Verify Deployment

1. Wait for DNS propagation (5-10 minutes)
2. Visit: `https://foodzone.com.np`
3. You should see the Food Zone login page

## ✅ Verification Checklist

- [ ] Build completed successfully
- [ ] No build errors in Vercel logs
- [ ] Preview URL works
- [ ] Custom domain configured
- [ ] DNS records added
- [ ] Site loads at foodzone.com.np
- [ ] Login page appears
- [ ] Can connect to backend API

## 🧪 Test Your Deployment

### 1. Check Frontend Loads
Visit: `https://foodzone.com.np`

Expected: Login page should appear

### 2. Check API Connection
Open browser console (F12) and check for:
- No CORS errors
- API calls to `https://api.foodzone.com.np`

### 3. Test Login
Try logging in with:
- Username: `admin`
- Password: `FoodZone2024!`

Expected: Should redirect to dashboard

### 4. Test Features
- [ ] Dashboard loads
- [ ] Orders can be created
- [ ] Reports show data
- [ ] Real-time updates work

## 🔧 Troubleshooting

### Build Fails

**Error**: `Module not found`
- **Solution**: Check if all dependencies are in `client/package.json`
- Run locally: `cd client && npm install && npm run build`

**Error**: `Build exceeded maximum duration`
- **Solution**: Optimize build by removing unused dependencies
- Check Vercel build logs for specific issues

### Site Loads but API Fails

**Error**: `CORS error` or `Network error`
- **Solution**: Verify `REACT_APP_API_URL` is set correctly
- Check backend CORS settings allow `foodzone.com.np`
- Verify backend is running on Railway

**Error**: `Failed to fetch`
- **Solution**: Check if backend is deployed and running
- Test backend directly: `https://api.foodzone.com.np/api/health`

### Custom Domain Not Working

**Error**: `Domain not found` or `DNS_PROBE_FINISHED_NXDOMAIN`
- **Solution**: Wait for DNS propagation (up to 48 hours, usually 5-10 minutes)
- Check DNS records are correct
- Use https://dnschecker.org to verify propagation

**Error**: `SSL certificate error`
- **Solution**: Wait for Vercel to provision SSL (automatic, takes 1-2 minutes)
- Vercel provides free SSL certificates automatically

### Environment Variables Not Working

**Error**: `undefined` values in app
- **Solution**: Verify all `REACT_APP_*` variables are set in Vercel
- Redeploy after adding environment variables
- Check variable names are exactly correct (case-sensitive)

## 📊 Monitoring

### View Deployment Logs
1. Go to Vercel dashboard
2. Click on your project
3. Click **"Deployments"**
4. Click on latest deployment
5. View build and runtime logs

### View Analytics
1. Go to **"Analytics"** tab
2. See page views, performance metrics
3. Monitor errors and issues

### View Performance
1. Go to **"Speed Insights"** tab
2. See Core Web Vitals
3. Optimize based on recommendations

## 🔄 Redeploy

### Automatic Redeployment
Vercel automatically redeploys when you push to GitHub:

```bash
git add .
git commit -m "Update frontend"
git push origin main
```

Vercel detects the push and redeploys automatically!

### Manual Redeployment
1. Go to Vercel dashboard
2. Click on your project
3. Click **"Deployments"**
4. Click **"..."** on latest deployment
5. Click **"Redeploy"**

## 🎯 Vercel Project Settings

### Recommended Settings

**General:**
- Node.js Version: `18.x`
- Framework: `Create React App`
- Root Directory: `client`

**Build & Development:**
- Build Command: `npm install && npm run build`
- Output Directory: `build`
- Install Command: `npm install`

**Environment Variables:**
- All `REACT_APP_*` variables set
- Applied to Production, Preview, Development

**Domains:**
- Primary: `foodzone.com.np`
- Redirect www to non-www (or vice versa)

## 📞 Support

### Vercel Documentation
- **Getting Started**: https://vercel.com/docs
- **Custom Domains**: https://vercel.com/docs/concepts/projects/domains
- **Environment Variables**: https://vercel.com/docs/concepts/projects/environment-variables
- **Build Configuration**: https://vercel.com/docs/build-step

### Check Status
- **Vercel Status**: https://www.vercel-status.com
- **DNS Checker**: https://dnschecker.org

### Common Issues
- **Build Errors**: Check Vercel build logs
- **Runtime Errors**: Check browser console
- **API Errors**: Check backend Railway logs
- **DNS Issues**: Check DNS propagation

## 🎯 Quick Links

- **Vercel Dashboard**: https://vercel.com/dashboard
- **Project URL**: https://foodzone.com.np
- **Backend API**: https://api.foodzone.com.np
- **Repository**: https://github.com/NextNepalWork/foodzone-prabesh

---

## 📋 Environment Variables Summary

Copy from **`VERCEL_ENV_COPY_PASTE.txt`**:

```
REACT_APP_API_URL=https://api.foodzone.com.np
REACT_APP_SOCKET_URL=https://api.foodzone.com.np
REACT_APP_ADMIN_PASSWORD=FoodZone2024!
GENERATE_SOURCEMAP=false
```

---

**Status**: ✅ Ready to Deploy!  
**Deployment Time**: ~3 minutes  
**DNS Propagation**: 5-10 minutes
