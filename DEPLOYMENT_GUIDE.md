# Food Zone Restaurant - Hostinger Deployment Guide

## 📋 Pre-Deployment Checklist

### 1. **Build the React Client**
```bash
cd client
npm run build
```

### 2. **Prepare Server Files**
- Copy the entire `server/` folder
- Copy the `client/build/` folder to `server/public/`
- Update environment variables

## 🚀 Hostinger Deployment Steps

### Step 1: Database Setup
1. **Create PostgreSQL Database** in Hostinger control panel
2. **Note down database credentials**:
   - Host
   - Database name
   - Username
   - Password
   - Port (usually 5432)

### Step 2: Upload Files
1. **Upload server files** to your Hostinger public_html or domain folder
2. **File structure should be**:
   ```
   your-domain/
   ├── server.js
   ├── package.json
   ├── database/
   ├── public/ (contains React build files)
   └── .env
   ```

### Step 3: Environment Configuration
1. **Create .env file** with your Hostinger database details:
   ```env
   PORT=5001
   NODE_ENV=production
   DATABASE_URL=postgresql://your_username:your_password@your_host:5432/your_database
   RESTAURANT_NAME="Food Zone Duwakot"
   RESTAURANT_PHONE="9851234567"
   RESTAURANT_ADDRESS="KMC Chowk, Duwakot, Bhaktapur"
   RESTAURANT_LATITUDE=27.6710
   RESTAURANT_LONGITUDE=85.4298
   DELIVERY_RADIUS=5.0
   MIN_DELIVERY_AMOUNT=200
   BASE_DELIVERY_FEE=50
   ADMIN_PASSWORD=FoodZone2024!
   ```

### Step 4: Install Dependencies
```bash
npm install --production
```

### Step 5: Database Setup
1. **Run database initialization** (if needed)
2. **Create required tables** using the schema in `database/schema.sql`

### Step 6: Start Application
```bash
npm start
```

## 🔧 Server Configuration

### Update server.js for Production
Make sure your server serves static files:
```javascript
// Serve React build files
app.use(express.static(path.join(__dirname, 'public')));

// Handle React routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
```

## 🌐 Domain Configuration

### For Custom Domain (Foodzone.com.np):
1. **Point domain** to your Hostinger server
2. **Update CORS settings** in server.js:
   ```javascript
   const corsOptions = {
     origin: ['https://foodzone.com.np', 'https://www.foodzone.com.np'],
     credentials: true
   };
   ```

## 📱 Features Included

### ✅ Restaurant Management System
- **Table Orders** (Tables 1-25)
- **Delivery Orders** with GPS coordinates
- **Real-time Admin Panel**
- **Order History & Tracking**
- **Cache Management** (10-minute auto-cleanup)

### ✅ Admin Features
- **Password Protection** (persistent login)
- **Order Management** (dine-in & delivery)
- **Google Maps Integration** for delivery locations
- **Database Statistics**

### ✅ Customer Features
- **QR Code Table Access**
- **Menu Browsing**
- **Cart Management**
- **Delivery Ordering**

## 🔍 Testing After Deployment

1. **Visit your domain**: `foodzone.com.np`
2. **Test table ordering**: `foodzone.com.np/1` (for table 1)
3. **Test delivery ordering**: `foodzone.com.np/delivery-cart`
4. **Test admin panel**: `foodzone.com.np/admin`
5. **Verify database connections**

## 🆘 Troubleshooting

### Common Issues:
- **Database connection errors**: Check DATABASE_URL
- **Static files not loading**: Verify public folder structure
- **CORS errors**: Update allowed origins
- **Port conflicts**: Ensure PORT environment variable is set

## 📞 Support
- Admin Password: `FoodZone2024!`
- Tables: 1-25 accessible via `/1`, `/2`, etc.
- Delivery: Available on homepage and `/delivery-cart`

---
**Food Zone Restaurant Ordering System**
*Ready for production deployment on Hostinger*
