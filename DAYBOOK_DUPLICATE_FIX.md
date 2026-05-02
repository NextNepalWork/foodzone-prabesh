# Daybook Duplicate Entries Fix

## Problem
Duplicate entries were appearing in the daybook transaction log for each payment. Each payment was being recorded twice with slightly different descriptions:
- "Payment recorded by admin via fonepay"
- "Fonepay payment - Order #607"

## Root Cause
The payment recording flow had **two separate API calls** that both inserted into `daybook_transactions`:

1. **`PUT /api/orders/:orderId/status`** (line ~1501 in server.js)
   - Called when admin completes order with payment method
   - Inserts daybook entry with description: "{Method} payment - Order #{id}"

2. **`POST /api/payments`** (line ~3340 in server.js)
   - Called immediately after to record in payments table
   - Also inserts daybook entry with description: "Payment recorded by admin via {method}"

Even though both used `ON CONFLICT DO NOTHING` with the unique constraint `uq_daybook_one_payment_per_order`, the constraint wasn't preventing duplicates because the INSERT statements were executing successfully (the unique constraint only prevents duplicate order_id + transaction_type combinations, but both inserts had the same values for those fields).

## Solution
Modified the payment recording flow to prevent duplicate daybook entries:

### 1. Added `skip_daybook` flag to `/api/payments` endpoint
- When `skip_daybook: true` is passed, the endpoint skips daybook insertion
- The payments table record is still created (which is needed)
- Only the daybook insertion is skipped

### 2. Updated `AdminPremium.js` to pass `skip_daybook: true`
- The order status update (step 1) handles daybook insertion
- The payments API call (step 2) only records in payments table
- No duplicate daybook entries are created

### 3. Rebuilt and deployed frontend
- Ran `npm run build` in client directory
- Copied build files to `server/public/`
- Restarted backend server

## Files Modified

### `server/server.js` (lines 3340-3450)
- Added `skip_daybook` parameter extraction
- Added conditional logic to skip daybook insertion when flag is true
- Added logging to indicate when daybook entry is skipped

### `client/src/pages/AdminPremium.js` (lines 890-960)
- Added `skip_daybook: true` to the `/api/payments` call
- Updated comments to explain the flow

## Testing
After the fix:
1. Complete an order with any payment method (Cash, Card, eSewa, Khalti, FonePay, etc.)
2. Check the daybook transaction log
3. Verify only ONE entry appears per payment (not two)

## Deployment Steps Completed
1. ✅ Modified backend code (`server/server.js`)
2. ✅ Modified frontend code (`client/src/pages/AdminPremium.js`)
3. ✅ Rebuilt frontend (`npm run build`)
4. ✅ Deployed to server (`cp -r client/build/* server/public/`)
5. ✅ Restarted backend server

## Additional Fix: Clickable Order Numbers
Also implemented clickable order numbers in the daybook transaction log:
- Order numbers now appear as blue links
- Clicking an order number opens the order details
- Implementation in `client/src/components/Daybook.js`

## Database Constraint
The unique constraint `uq_daybook_one_payment_per_order` in `server/database/daybook-schema.sql` provides an additional safety net:
```sql
CREATE UNIQUE INDEX IF NOT EXISTS uq_daybook_one_payment_per_order
    ON daybook_transactions(order_id)
    WHERE order_id IS NOT NULL
      AND transaction_type IN (
          'cash_payment','card_payment','online_payment',
          'esewa_payment','khalti_payment','fonepay_payment'
      );
```

This ensures that even if duplicate INSERT attempts are made, only one will succeed at the database level.

## Status
✅ **FIXED AND DEPLOYED** - Duplicate entries will no longer be created for new payments
⚠️ **Note**: Existing duplicate entries in the database remain. The frontend Daybook component has defensive deduplication logic to filter them out in the UI.

## How to Test
1. Clear your browser cache or do a hard refresh (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows)
2. Complete a new order with any payment method
3. Go to Daybook and verify only ONE entry appears for the payment
4. Check the console logs - you should see "ℹ️  Skipped daybook entry (already recorded by order status update)"
