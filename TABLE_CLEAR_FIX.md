# Table Clear Functionality Fix

## Issue
After clearing a table in the admin panel, the customer's TableDashboard view was still showing completed orders, and the table was not refreshing back to normal (empty) state.

## Root Cause
1. The `/api/orders/table/:tableId` endpoint was returning ALL orders from the last 24 hours, including completed ones
2. The customer's TableDashboard was not listening for table cleared events
3. When admin cleared a table, orders were marked as completed but still visible to customers

## Changes Made

### Backend Changes (server/server.js)

1. **Fixed `/api/orders/table/:tableId` Endpoint**
   - Changed query to exclude completed orders: `WHERE o.status NOT IN ('completed', 'cancelled')`
   - Removed the 24-hour time filter (was showing old completed orders)
   - Now only returns ACTIVE orders (pending, preparing, ready)

2. **Enhanced Table Session Cleanup**
   - Added `TableSession.clearSession(tableIdInt)` to clear table session from database
   - Existing in-memory session cleanup maintained (tableSessions Map)
   - Existing table-session API cleanup maintained

3. **Added Real-time Status Update Event**
   - Added `io.emit('tableStatusUpdated', {...})` to broadcast table status change
   - Sends complete table state: empty status, null customer info, zero amounts
   - This ensures all connected clients see the table as empty immediately

4. **Improved Response Data**
   - Added `sessionCleared: true` to response to confirm session cleanup

### Frontend Changes

#### AdminPremium.js (Admin Panel)

1. **Added Socket Listener for Table Status Updates**
   - Added `socket.on('tableStatusUpdated', ...)` listener
   - Automatically refreshes table statuses when status update event received
   - Added console logging for debugging

2. **Enhanced clearTable Function**
   - Closes modals immediately after successful clear
   - Performs table status refresh twice (once after success, once in finally block)
   - Ensures UI updates even if there are errors

#### TableDashboard.js (Customer View)

1. **Added Socket Event Listeners**
   - Added `socket.on('tableCleared', ...)` listener
   - Added `socket.on('tableStatusUpdated', ...)` listener
   - Automatically refreshes orders when table is cleared by admin
   - Uses dynamic socket.io import to avoid dependency issues

2. **Improved Order Display**
   - Now only shows active orders (completed orders are hidden)
   - When table is cleared, orders list becomes empty
   - Shows "No Orders Yet" message when table is cleared

## How It Works

### Admin Clears Table:
1. Admin clicks "Clear Table" button in admin panel
2. Backend receives request and:
   - Marks all orders as completed in database
   - Clears table session from database (table_sessions table)
   - Clears in-memory sessions (all variants)
   - Clears table-session API sessions
   - Emits `tableCleared` event
   - Emits `tableStatusUpdated` event with empty table data
3. Admin panel receives events and:
   - Closes the table detail modal
   - Refreshes table statuses from API
   - Updates UI to show table as empty

### Customer View Updates:
1. Customer's TableDashboard receives socket events
2. Automatically fetches fresh order data
3. Backend returns empty array (no active orders)
4. UI shows "No Orders Yet" message
5. Customer can start a new order or leave

## Testing

To test the fix:

### Admin Side:
1. Open admin panel → Tables tab
2. Select an occupied table
3. Click "Clear Table" button
4. Confirm the action
5. Verify:
   - Modal closes immediately
   - Table shows as empty (gray/available state)
   - No customer name or phone displayed
   - Total amount shows Rs. 0
   - Order count shows 0

### Customer Side:
1. Open customer view: `/table/27/dashboard`
2. Verify orders are visible
3. Have admin clear the table
4. Verify:
   - Orders disappear automatically (within 1-2 seconds)
   - "No Orders Yet" message appears
   - Can click "Browse Menu" to start new order

## Files Modified

- `server/server.js` - Fixed `/api/orders/table/:tableId` endpoint and enhanced clear-table endpoint
- `client/src/pages/AdminPremium.js` - Added socket listener and improved clearTable function
- `client/src/pages/TableDashboard.js` - Added socket listeners for real-time updates

## Notes

- The system doesn't create "temporary customer accounts" - it uses table sessions
- Table sessions are now properly cleared from both database and memory
- Real-time updates ensure all connected clients see the change immediately
- The fix handles both the table_sessions table and in-memory session storage
- Customer view now only shows active orders, hiding completed/cancelled ones
- Socket events provide instant feedback without requiring manual refresh
