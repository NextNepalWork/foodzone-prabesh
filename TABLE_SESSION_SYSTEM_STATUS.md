# Table Session System - Status & How It Works

## Overview
The table session system creates a temporary "account" for each table when someone scans the QR code and places an order. This session persists until the admin clears the table or payment is completed.

## How It Works

### 1. Session Creation
- When a customer scans QR code for table 15 → Opens `/15`
- System creates/resumes a `table_session` record with:
  - `table_id`: 15
  - `customer_name`: "Guest" (or provided name)
  - `customer_phone`: optional
  - `status`: "occupied"
  - `session_start`: timestamp

### 2. Ordering
- Customer adds items to cart and places order
- Order is created with:
  - `table_id`: 15
  - `table_session_id`: links to the session
  - `status`: "pending"
  - `payment_status`: "pending"

### 3. Viewing Orders
- Click "📋 Orders" button → Opens `/table/15/dashboard`
- Shows ALL orders for table 15 from the last 24 hours
- Anyone who scans table 15 QR code can see these orders

### 4. Payment
- Customer clicks "Pay with QR Code"
- Scans payment QR (eSewa/Khalti)
- Payment is linked to `table_session_id`
- When paid, `payment_status` → "paid"

### 5. Session Clearing
- **Admin clears table** → Session status → "cleared"
  - All orders for that table are archived
  - Cart is cleared
  - Customer is redirected to homepage
- **Auto-clear** → After payment is verified and order is completed

## Current Status

### ✅ Working
- Table session creation
- Order placement with session linking
- Order viewing by table number
- Payment QR code generation
- Admin table clearing

### 🔧 Recently Fixed
- Backend API endpoint `/api/orders/table/:tableId` 
  - Removed non-existent columns (`vat_amount`, `service_charge`)
  - Now returns: `subtotal`, `discount`, `total`, `items`
- Frontend TableDashboard
  - Removed VAT and service charge display
  - Shows only: subtotal, discount (if > 0), total

### 📊 Database Tables
1. `table_sessions` - Tracks active table sessions
2. `orders` - Stores all orders (linked to sessions)
3. `order_items` - Individual items in each order
4. `table_payments` - Payment records for sessions

## API Endpoints

### Customer-Facing
- `GET /api/orders/table/:tableId` - Get all orders for a table
- `POST /api/orders` - Create new order
- `POST /api/tables/:tableId/payment` - Process payment

### Admin-Facing
- `POST /api/clear-table/:tableId` - Clear specific table
- `POST /api/clear-table-sessions` - Clear all tables
- `GET /api/tables/status` - Get all table statuses

## Testing
1. Navigate to `http://localhost:3005/15`
2. Add items to cart
3. Slide to confirm order
4. Click "📋 Orders" to view order history
5. Click "Pay with QR Code" to see payment options

## Notes
- No user accounts needed - everything is table-based
- Sessions persist across page refreshes (localStorage + database)
- Multiple people can order from same table (orders accumulate)
- Admin can see all active tables in the floor plan
