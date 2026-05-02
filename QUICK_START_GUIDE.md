# Quick Start Guide - Optional Customer Data

## 🚀 Quick Setup (5 minutes)

### Step 1: Run Migration
```bash
cd /path/to/foodzone
psql -U postgres -d foodzone_local -f server/migrations/make-customer-fields-optional.sql
```

**Expected Output:**
```
ALTER TABLE
ALTER TABLE
ALTER TABLE
CREATE FUNCTION
CREATE FUNCTION
```

### Step 2: Verify Migration
```bash
node server/test-optional-customer-data.js
```

**Expected Output:**
```
✅ Schema check: All fields nullable
✅ Helper functions exist
✅ Order created without customer data
✅ All tests completed!
```

### Step 3: Restart Server
```bash
# Stop current server (Ctrl+C)
npm run server
```

### Step 4: Clear Browser Cache
- Chrome/Edge: `Ctrl+Shift+Delete` → Clear cached images and files
- Firefox: `Ctrl+Shift+Delete` → Cached Web Content
- Safari: `Cmd+Option+E`

### Step 5: Test
1. Open admin dashboard
2. Create a table order without entering customer name/phone
3. Verify table shows "Unknown Customer"
4. Complete order and check reports

## ✅ Quick Verification

### Test 1: Create Order Without Customer Data
1. Go to Orders tab → "New Order" button
2. Select table
3. Leave customer name and phone **empty**
4. Add items and submit
5. ✅ Order should be created successfully

### Test 2: Check Floor Plan
1. Go to Tables tab
2. Find the table with the new order
3. ✅ Should show "Unknown Customer" in subtitle

### Test 3: Check Reports
1. Go to Reports tab
2. View Order Report
3. ✅ Order should appear with "Guest" as customer name

## 🐛 Troubleshooting

### Issue: Migration fails with "column does not exist"
**Solution:** Database might not have the tables yet. Run full schema first:
```bash
psql -U postgres -f create-local-database.sql
```

### Issue: "NOT NULL constraint violation"
**Solution:** Migration didn't run. Check:
```bash
psql -U postgres -d foodzone_local -c "\d orders" | grep customer
```
Should show `customer_name` and `customer_phone` as nullable.

### Issue: UI still shows "Guest" instead of "Unknown Customer"
**Solution:** Clear browser cache completely and hard refresh (`Ctrl+Shift+R`)

### Issue: Orders fail to create
**Solution:** Check server logs:
```bash
# Look for errors related to customer_name or customer_phone
tail -f server.log
```

## 📊 What Changed?

### Before:
- Customer name: **Required** (defaulted to "Guest")
- Customer phone: **Required** (defaulted to "9800000000")
- Table display: Always showed customer name

### After:
- Customer name: **Optional** (can be NULL)
- Customer phone: **Optional** (can be NULL)
- Table display: Shows "Unknown Customer" when no data

## 🎯 Common Use Cases

### Use Case 1: Walk-in Customer (No Info)
```
Customer walks in → Sits at Table 14 → Orders food
System: Creates order with NULL customer data
Display: "Table 14 - Unknown Customer"
```

### Use Case 2: Phone Only
```
Customer provides phone but not name
System: Stores phone, NULL for name
Display: Shows phone number as identifier
```

### Use Case 3: Name Only
```
Customer provides name but not phone
System: Stores name, NULL for phone
Display: Shows customer name
```

### Use Case 4: Full Info
```
Customer provides both name and phone
System: Stores both
Display: "Name · Phone"
```

## 📝 Quick Reference

### Display Logic Priority:
1. Customer Name (if available)
2. Customer Phone (if available)
3. "Table X" (for table orders)
4. "Unknown Customer" (fallback)

### Database Fields:
- `orders.customer_name` → NULL allowed
- `orders.customer_phone` → NULL allowed
- `table_sessions.customer_name` → NULL allowed
- `table_sessions.customer_phone` → NULL allowed
- `payment_receipts.customer_name` → NULL allowed
- `payment_receipts.customer_phone` → NULL allowed

### Helper Functions:
```sql
-- Get display name
SELECT get_customer_display_name(NULL, NULL, 14);
-- Returns: "Table 14"

-- Get identifier
SELECT get_customer_identifier(NULL, '9841234567', 14);
-- Returns: "9841234567"
```

## 🔍 Verification Commands

### Check Schema:
```bash
psql -U postgres -d foodzone_local -c "
SELECT table_name, column_name, is_nullable 
FROM information_schema.columns 
WHERE table_name IN ('orders', 'table_sessions') 
  AND column_name IN ('customer_name', 'customer_phone')
ORDER BY table_name, column_name;
"
```

### Check Existing Data:
```bash
psql -U postgres -d foodzone_local -c "
SELECT 
  COUNT(*) as total_orders,
  COUNT(customer_name) as with_name,
  COUNT(customer_phone) as with_phone
FROM orders;
"
```

### Test Helper Function:
```bash
psql -U postgres -d foodzone_local -c "
SELECT get_customer_display_name(NULL, NULL, 14) as test;
"
```

## 📞 Need Help?

1. **Check logs:** `tail -f server.log`
2. **Run test script:** `node server/test-optional-customer-data.js`
3. **Review checklist:** `VERIFICATION_CHECKLIST.md`
4. **Full documentation:** `OPTIONAL_CUSTOMER_DATA_IMPLEMENTATION.md`

## ✨ Success Indicators

- ✅ Orders can be created without customer info
- ✅ Floor plan shows "Unknown Customer" appropriately
- ✅ Reports work with mixed data
- ✅ No console errors
- ✅ No database errors in logs
- ✅ Payment flow works normally

---

**Ready to go!** 🎉

If all tests pass, the system is ready to handle orders with or without customer information.
