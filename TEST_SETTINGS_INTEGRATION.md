# Settings Integration Test Plan

## Quick Test (5 minutes)

### 1. Test Admin Settings Panel
1. Open browser to `http://localhost:3001/admin`
2. Login with admin credentials
3. Click on "Settings" tab
4. You should see 14 sections in the left sidebar:
   - 🏢 Business
   - 🌏 Localization
   - 🕒 Hours & Availability
   - 🛒 Ordering
   - 🛵 Delivery
   - 🧾 Tax & Service
   - 🎉 Happy Hour
   - 🖨️ Receipts & Printing
   - 🔔 Notifications
   - 🔒 Security & Staff
   - 📱 Customer App
   - 🪑 Tables
   - 🔌 Integrations
   - 💠 Subscription

### 2. Test Business Name Change
1. Click on "Business" section
2. Find "Business name" field (should show "Food Zone" by default)
3. Change it to "My Test Restaurant"
4. Notice the "1 unsaved" indicator appears
5. Click "Save (1)" button
6. Should see success toast

### 3. Test Customer-Facing Integration
1. Open new tab to `http://localhost:3001/`
2. You should see the homepage
3. Look for the restaurant name in the hero section
4. It should say "Eat with My Test Restaurant" (or whatever you changed it to)
5. If it still says "Food Zone", refresh the page (settings cache)

### 4. Test Real-time Updates (Advanced)
1. Keep homepage open in one tab
2. Keep admin settings open in another tab
3. Change business name again in admin
4. Save changes
5. Go back to homepage tab
6. Refresh the page
7. Verify the name updated

### 5. Test Other Settings

#### Currency Symbol
1. Admin → Settings → Localization
2. Change "Currency symbol" from "Rs." to "$"
3. Save
4. Go to customer menu page
5. Verify prices show with $ symbol

#### Table Count
1. Admin → Settings → Tables
2. Change "Number of tables" to 30
3. Save
4. Go to Admin → Tables tab
5. Verify 30 tables are shown

#### Delivery Fee
1. Admin → Settings → Delivery
2. Change "Base delivery fee" to 150
3. Save
4. Go to customer delivery cart
5. Add items and proceed to checkout
6. Verify delivery fee shows Rs. 150

#### Happy Hour
1. Admin → Settings → Happy Hour
2. Toggle "Enable happy hour" ON
3. Set start time to current time - 1 hour
4. Set end time to current time + 1 hour
5. Set discount to 20%
6. Save
7. Go to customer menu
8. Items marked for happy hour should show discounted price

## API Testing (Using Browser Console or Postman)

### Test Public Settings Endpoint
```javascript
// Open browser console on any page
fetch('http://localhost:3000/api/settings/public')
  .then(r => r.json())
  .then(data => console.log('Public settings:', data));
```

Expected response:
```json
{
  "business.name": "My Test Restaurant",
  "business.phone": "+977-1-4567890",
  "business.tagline": "Quality food, served fresh",
  "locale.currency_symbol": "Rs.",
  "locale.currency_code": "NPR",
  "tables.table_count": 25,
  "delivery.base_fee": 100,
  ...
}
```

### Test Admin Settings Endpoint (Requires Auth)
```javascript
// In admin panel console (already authenticated)
fetch('http://localhost:3000/api/settings', {
  headers: {
    'Authorization': 'Bearer ' + localStorage.getItem('adminToken')
  }
})
  .then(r => r.json())
  .then(data => console.log('Admin settings:', data));
```

Expected response:
```json
{
  "sections": [
    {
      "id": "business",
      "label": "Business",
      "icon": "🏢",
      "description": "Your brand identity...",
      "fields": [
        {
          "key": "business.name",
          "label": "Business name",
          "type": "string",
          "value": "My Test Restaurant",
          "default": "Food Zone",
          "public": true
        },
        ...
      ]
    },
    ...
  ]
}
```

## Troubleshooting

### Settings not updating on customer pages
1. Check browser console for errors
2. Verify `/api/settings/public` returns data
3. Try hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
4. Check if settingsService is loaded: `console.log(window.settingsService)`

### Admin settings not saving
1. Check browser console for errors
2. Verify you're logged in as admin
3. Check network tab for failed requests
4. Verify database connection

### Settings showing default values
1. Check if database tables exist:
   - `restaurant_settings`
   - `operating_hours`
   - `delivery_zones_config`
   - `payment_methods_config`
   - `tenant_profile`
2. Run database migrations if needed
3. Check server logs for errors

## Expected Behavior

### ✅ Working Correctly
- Admin can view all 14 settings sections
- Admin can edit and save settings
- Changes persist after page refresh
- Customer pages load settings from `/api/settings/public`
- Restaurant name appears on homepage
- Currency symbol appears in prices
- Table count affects table management

### ⚠️ May Need Attention
- Real-time updates via Socket.IO (may need page refresh)
- Image uploads (may need file storage configuration)
- Some settings may not be used yet in customer pages
- Cache may need manual refresh

## Success Criteria

✅ All settings sections load in admin panel
✅ Settings can be edited and saved
✅ Business name appears on homepage
✅ Currency symbol appears in menu prices
✅ Table count affects table display
✅ No console errors
✅ API endpoints return correct data
✅ Changes persist after refresh

## Next Steps After Testing

1. Document which settings are actively used
2. Add loading states to customer pages
3. Implement real-time Socket.IO updates
4. Add validation for interdependent settings
5. Add audit log for settings changes
6. Add bulk import/export functionality
7. Add settings search/filter in admin
8. Add settings documentation/help text
