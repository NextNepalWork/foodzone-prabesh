# Railway Environment Variables Configuration

## 🔧 Copy These to Railway Dashboard

When you deploy to Railway, go to your service settings and add these environment variables:

### Required Variables

```env
# Application
NODE_ENV=production
PORT=3000

# JWT Secret - Generate a secure one!
# Run this command to generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET=your-secure-random-jwt-secret-here-change-this

# CORS - Allow your frontend domain
CORS_ORIGIN=https://foodzone.com.np,https://www.foodzone.com.np

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
```

### Database Variable (Automatic)

Railway will automatically set this when you add PostgreSQL:
```env
DATABASE_URL=postgresql://user:password@host:port/database
```

## 🔐 Generate Secure JWT Secret

Before deploying, generate a secure JWT secret:

### Option 1: Using Node.js
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Option 2: Using OpenSSL
```bash
openssl rand -hex 32
```

### Option 3: Online Generator
Visit: https://generate-secret.vercel.app/32

Copy the generated string and use it as your `JWT_SECRET` value.

## 📋 Step-by-Step Railway Setup

### 1. Create Project
1. Go to https://railway.app
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose `NextNepalWork/foodzone-prabesh`

### 2. Add PostgreSQL
1. In your project, click "+ New"
2. Select "Database" → "PostgreSQL"
3. Railway automatically sets `DATABASE_URL`

### 3. Add Environment Variables
1. Click on your service (foodzone-prabesh)
2. Go to "Variables" tab
3. Click "Raw Editor"
4. Paste all the variables above
5. **Important**: Replace `JWT_SECRET` with a secure random string!

### 4. Configure Domain
1. Go to "Settings" tab
2. Scroll to "Domains"
3. Click "Generate Domain" (Railway gives you a free domain)
4. Click "Custom Domain"
5. Add: `api.foodzone.com.np`
6. Update your DNS:
   - Type: `CNAME`
   - Name: `api`
   - Value: (Railway will show you the value)

### 5. Deploy
Railway will automatically deploy when you push to GitHub!

## 🌐 DNS Configuration

### For Backend (api.foodzone.com.np)
Add this CNAME record in your DNS provider:
```
Type: CNAME
Name: api
Value: <your-railway-domain>.railway.app
TTL: 3600
```

### For Frontend (foodzone.com.np)
Point to your frontend hosting (Vercel/Netlify/etc):
```
Type: A or CNAME
Name: @
Value: <your-frontend-hosting-ip-or-domain>
TTL: 3600
```

## ✅ Verification Checklist

After deployment, verify:

- [ ] Backend API responds: `https://api.foodzone.com.np/api/health`
- [ ] CORS allows your frontend domain
- [ ] Database connection works
- [ ] Admin login works
- [ ] JWT tokens are generated correctly
- [ ] Frontend can connect to backend API

## 🔄 Continuous Deployment

Railway automatically redeploys when you push to `main` branch:

```bash
git add .
git commit -m "Your changes"
git push origin main
```

## 📊 Monitoring

View logs in Railway:
1. Go to your project
2. Click on your service
3. Click "Deployments"
4. Click on latest deployment
5. View logs in real-time

## 🚨 Important Security Notes

1. **Never commit** `.env.production` to GitHub (it's in `.gitignore`)
2. **Change default passwords** before going live
3. **Use strong JWT secret** (at least 32 characters)
4. **Enable HTTPS only** (Railway does this automatically)
5. **Regularly rotate** passwords and secrets

## 📞 Support

If you encounter issues:
- Check Railway logs for errors
- Verify all environment variables are set
- Check DNS propagation (can take up to 48 hours)
- Verify CORS settings match your frontend domain

---

**Frontend**: https://foodzone.com.np  
**Backend API**: https://api.foodzone.com.np  
**Repository**: https://github.com/NextNepalWork/foodzone-prabesh
