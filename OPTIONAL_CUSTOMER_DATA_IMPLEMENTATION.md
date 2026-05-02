# Optional Customer Data Implementation

## Overview
The system has been updated to work with optional customer names and phone numbers. Orders and table sessions can now be created without customer information, and the system will display "Unknown Customer" or "Table X" as appropriate.

## Database Changes

### 1. Schema Updates (`create-local-database.sql`)
- **table_sessions**: Made `customer_name` and `customer_phone` nullable (removed NOT NULL constraints)
- **orders**: Made `customer_name` and `customer_phone` nullable (removed NOT NULL constraints)

### 2. Migration Script (`server/migrations/make-customer-fields-optional.sql`)
Created helper functions:
- `get_customer_display_name()`: Returns customer name, phone, table ID, or "Unknown Customer"
- `get_customer_identifier()`: Returns phone, name, table ID, or "Unknown" for identification

## Backend Changes

### 1. Table Status Endpoint (`/api/tables/status`)
- Added `display_name` field to table status response
- `display_name` logic: customer_name → customer_phone → "Table X" → null
- Updated all fallback responses to include `display_name`
- Handles missing customer data gracefully

### 2. Payment Receipt Endpoint (`/api/payment-qr/receipts`)
- Updated to accept `null` values for `customer_name` and `customer_phone`
- Stores `null` instead of default values like "Guest"

### 3. Customer Management
- Updated `getStats()` function to safely check for customer name/phone existence
- Filters now check if fields exist before comparing

## Frontend Changes

### 1. AdminPremium.js - Table Details Modal
**Before:**
```javascript
subtitle={selectedTable.customer_name ? `${selectedTable.customer_name} · ${selectedTable.customer_phone || 'No phone'}` : 'Empty'}
```

**After:**
```javascript
subtitle={selectedTable.customer_name ? `${selectedTable.customer_name}${selectedTable.customer_phone ? ` · ${selectedTable.customer_phone}` : ''}` : selectedTable.status === 'occupied' ? 'Unknown Customer' : 'Empty'}
```

### 2. AdminPremium.js - Customer Management
Updated `getStats()` function:
```javascript
const co = orders.filter((o) => 
  (c.name && o.customer_name === c.name) || 
  (c.phone && o.customer_phone === c.phone)
);
```

### 3. AdminPremium.js - Customer Report
Updated filtering logic to safely check for customer data:
```javascript
const customerOrders = filteredOrders.filter((o) => 
  (c.phone && o.customer_phone === c.phone) || 
  (c.name && o.customer_name === c.name)
);
```

### 4. Payment Receipt Display
- Already handles missing customer data with conditional rendering
- Shows customer info only if available

### 5. Order Display
- Shows "Guest" for missing customer names in dine-in orders
- Shows "Table X" for table-based orders

## UI Behavior

### Table Floor Plan
- **Occupied table with customer name**: Shows customer name
- **Occupied table without customer name**: Shows "Unknown Customer"
- **Empty table**: Shows "Empty"

### Payment Receipts
- **With customer info**: Displays name and/or phone
- **Without customer info**: Shows only table ID and payment method

### Reports
- **Customer Report**: Only includes customers with recorded names/phones
- **Order Report**: Shows "Guest" for missing customer names
- **Analytics**: Works with or without customer data

## Data Flow Examples

### Example 1: Table Order Without Customer Info
1. Customer orders from Table 14 without providing name/phone
2. Order created with `customer_name = NULL`, `customer_phone = NULL`
3. Table status shows: "Table 14 - Unknown Customer"
4. Payment receipt submitted without customer info
5. Reports show order under "Guest" or "Unknown"

### Example 2: Delivery Order Without Customer Info
1. Delivery order created without customer name/phone
2. Order stored with `customer_name = NULL`, `customer_phone = NULL`
3. Reports show order with "Guest" as customer
4. Analytics still count the revenue

### Example 3: Mixed Data
1. Some orders have customer info, some don't
2. System handles both seamlessly
3. Reports aggregate correctly
4. Customer management only shows customers with recorded info

## Migration Steps

1. **Run migration script** (if updating existing database):
   ```bash
   psql -U postgres -d foodzone_local -f server/migrations/make-customer-fields-optional.sql
   ```

2. **Restart backend** to apply changes

3. **Clear browser cache** to ensure frontend updates load

## Backward Compatibility

- Existing orders with customer data continue to work
- New orders can be created with or without customer data
- Reports work with mixed data (some with, some without customer info)
- No data loss or corruption

## Testing Checklist

- [ ] Create table order without customer name/phone
- [ ] Create delivery order without customer name/phone
- [ ] Submit payment receipt without customer info
- [ ] Verify table floor plan shows "Unknown Customer"
- [ ] Verify payment receipts display correctly
- [ ] Verify reports work with missing data
- [ ] Verify customer management handles NULL values
- [ ] Verify analytics calculations are correct
- [ ] Test with mixed data (some orders with, some without customer info)

## Future Enhancements

1. Add "Unknown Customer" as a special customer record for aggregation
2. Create automatic customer profiles from phone numbers
3. Add customer identification during payment verification
4. Implement customer matching algorithms
5. Add customer data enrichment from external sources
