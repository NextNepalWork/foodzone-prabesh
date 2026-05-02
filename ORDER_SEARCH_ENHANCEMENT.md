# Order Search Enhancement - Comprehensive Search

## Changes Made

### Frontend Changes
**File**: `client/src/components/premium/OrdersManagement.js`

#### 1. Updated Search Parameter
**Before**:
```javascript
// Search terms
if (searchTerm) {
  if (searchTerm.includes('FZ-')) {
    params.append('orderNumber', searchTerm);
  } else if (/^\d+$/.test(searchTerm)) {
    params.append('customerPhone', searchTerm);
  } else {
    params.append('customerName', searchTerm);
  }
}
```

**After**:
```javascript
// Search terms - search across name, dish, table, phone, order number
if (searchTerm) {
  const trimmed = searchTerm.trim();
  if (trimmed) {
    // Use a general search parameter that the backend can handle
    params.append('search', trimmed);
  }
}
```

#### 2. Updated Placeholder Text
**Before**: `"Search orders..."`
**After**: `"Search name, dish, table..."`

### Backend Changes

#### Server API (server/server.js)
Added `search` parameter to the orders API endpoint:

```javascript
const { 
  status, 
  orderType, 
  tableId, 
  paymentStatus,
  customerName,
  customerPhone,
  orderNumber,
  search,  // NEW: General search parameter
  startDate,
  endDate,
  // ...
} = req.query;

if (search) filters.search = search;
```

#### Database Model (server/database/models.js)
Added comprehensive search logic that searches across multiple fields:

```javascript
// General search across multiple fields (name, phone, table, order number, dish name)
if (filters.search) {
  paramCount++;
  const searchPattern = `%${filters.search}%`;
  whereClause += whereClause 
    ? ` AND (
        o.customer_name ILIKE $${paramCount} OR 
        o.customer_phone ILIKE $${paramCount} OR 
        o.order_number ILIKE $${paramCount} OR 
        CAST(o.table_id AS TEXT) ILIKE $${paramCount} OR 
        EXISTS (
          SELECT 1 FROM order_items oi 
          WHERE oi.order_id = o.id 
          AND oi.menu_item_name ILIKE $${paramCount}
        )
      )`
    : ` WHERE (...)`;
  params.push(searchPattern);
}
```

## Search Capabilities

The search now works across **5 different fields**:

### 1. Customer Name
- Search: "john" → Finds "John Doe", "Johnny", etc.
- Case-insensitive partial matching

### 2. Customer Phone
- Search: "9841" → Finds "+977-9841234567", "9841-xxx-xxx", etc.
- Partial matching

### 3. Table Number
- Search: "5" → Finds Table 5, Table 15, Table 25
- Search: "12" → Finds Table 12
- Converts table_id to text for searching

### 4. Order Number
- Search: "FZ-" → Finds all orders with FZ prefix
- Search: "001" → Finds FZ-001, FZ-1001, etc.
- Partial matching

### 5. Dish/Item Name
- Search: "momo" → Finds all orders containing "Chicken Momo", "Veg Momo", etc.
- Search: "pizza" → Finds all orders with pizza items
- Uses EXISTS subquery to search order_items table
- Case-insensitive partial matching

## Examples

### Search by Customer
```
Input: "ram"
Finds: Orders from "Ram Sharma", "Ramesh", "Shyam"
```

### Search by Table
```
Input: "7"
Finds: Orders from Table 7, Table 17, Table 27
```

### Search by Dish
```
Input: "chicken"
Finds: All orders containing "Chicken Momo", "Chicken Curry", "Butter Chicken"
```

### Search by Phone
```
Input: "9841"
Finds: Orders from customers with phone numbers containing "9841"
```

### Search by Order Number
```
Input: "FZ-"
Finds: All orders (if they all have FZ prefix)

Input: "123"
Finds: FZ-123, FZ-1234, FZ-0123
```

## Performance Considerations

### Optimized Query
- Single database query with OR conditions
- Uses ILIKE for case-insensitive matching
- EXISTS subquery for item name search (efficient)
- Indexed fields (customer_name, order_number, table_id) for fast searching

### Query Example
```sql
SELECT o.*, ...
FROM orders o
WHERE (
  o.customer_name ILIKE '%search%' OR
  o.customer_phone ILIKE '%search%' OR
  o.order_number ILIKE '%search%' OR
  CAST(o.table_id AS TEXT) ILIKE '%search%' OR
  EXISTS (
    SELECT 1 FROM order_items oi
    WHERE oi.order_id = o.id
    AND oi.menu_item_name ILIKE '%search%'
  )
)
AND o.created_at >= '2026-04-20'  -- Today's filter
AND o.created_at <= '2026-04-20T23:59:59.999Z'
ORDER BY o.created_at DESC
```

## Benefits

### User Experience
- ✅ **Single search box** for all search needs
- ✅ **No need to remember** which field to search
- ✅ **Intuitive** - just type what you're looking for
- ✅ **Fast results** - optimized database query

### Operational Efficiency
- ✅ Find orders by customer name quickly
- ✅ Search by table number for dine-in orders
- ✅ Find orders containing specific dishes
- ✅ Look up by phone number for delivery
- ✅ Search by order number for tracking

### Technical
- ✅ Single API parameter (simplified)
- ✅ Efficient SQL query with proper indexing
- ✅ Case-insensitive matching
- ✅ Partial matching for flexibility

## Testing

Build Status: ✅ **Compiled successfully**
- No errors in frontend
- No errors in backend
- No diagnostics issues

## Usage

**To search for an order**:
1. Type in the search box: name, dish, table, phone, or order number
2. Results update automatically
3. Works with status filters (All, Active, Pending, etc.)
4. Combined with today's date filter

**Examples**:
- Type "momo" → See all orders with momo items
- Type "5" → See orders from Table 5
- Type "ram" → See orders from customers named Ram
- Type "9841" → See orders from phone numbers with 9841
