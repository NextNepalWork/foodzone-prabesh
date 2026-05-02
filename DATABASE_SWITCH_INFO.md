# ✅ Database Switched to Local Docker PostgreSQL

## Current Configuration

**You are now using:**
- 🐳 **Local Docker PostgreSQL** on port 5433
- 🔒 **Isolated from production** - safe for testing
- 📊 **Fresh database** - no live orders

**Connection Details:**
```
Host: localhost
Port: 5433
Database: foodzone_db
Username: foodzone_user
Password: foodzone_password_2024
```

## What This Means

✅ **Safe Testing:**
- Any orders you create are LOCAL only
- Deleting data won't affect live site
- You can experiment freely

✅ **Fresh Start:**
- Empty database (no existing orders)
- All tables will be created automatically
- You can add test data

✅ **Production Unaffected:**
- Live website still uses Railway database
- Real customer orders are safe
- No risk of data loss

## Switch Back to Production Database

If you need to see live orders again:

1. **Update server/.env:**
```bash
DATABASE_URL=postgresql://postgres:MxSFWCzATUDqwVIvlnzrgXAWzPOLyVpM@hopper.proxy.rlwy.net:14242/railway
```

2. **Restart server:**
```bash
cd server && npm start
```

## Create Test Data

You can now safely create test orders:

1. Visit: http://localhost:3005/1 (Table 1)
2. Add items to cart
3. Place test orders
4. View them in admin: http://localhost:3005/admin

## Database Management

**View data directly:**
```bash
docker exec -it foodzone_postgres psql -U foodzone_user -d foodzone_db
```

**Common SQL commands:**
```sql
-- List all tables
\dt

-- View orders
SELECT * FROM orders;

-- View menu items
SELECT * FROM menu_items;

-- Clear all orders (safe - local only!)
DELETE FROM orders;

-- Exit
\q
```

**Reset database completely:**
```bash
docker-compose down -v
docker-compose up -d postgres
```

## Current Status

- ✅ Backend: http://localhost:3000 (connected to local DB)
- ✅ Frontend: http://localhost:3005
- ✅ Admin: http://localhost:3005/admin
- ✅ Database: Local Docker PostgreSQL
- 🔒 Production: Unaffected and safe

---

**You can now test freely without worrying about affecting live orders!** 🎉
