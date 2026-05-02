# Sync Payments QR Payment Fix

## Issue
The "Sync Payments" button in the Daybook was not syncing QR code payments (eSewa, Khalti, Fonepay) to the daybook transactions. Only cash and card payments were being synced.

## Root Cause
The sync payments endpoint was using a simple ternary operator to map payment methods:
```javascript
const transactionType = order.payment_method === 'cash' ? 'cash_payment' : 
                       order.payment_method === 'card' ? 'card_payment' : 
                       'online_payment';
```

This meant:
- ✅ `cash` → `cash_payment`
- ✅ `card` → `card_payment`
- ❌ `esewa` → `online_payment` (WRONG!)
- ❌ `khalti` → `online_payment` (WRONG!)
- ❌ `fonepay` → `online_payment` (WRONG!)

## Solution
Changed to a proper switch statement that handles all payment methods:

```javascript
let transactionType;
switch(order.payment_method) {
  case 'cash':
    transactionType = 'cash_payment';
    break;
  case 'card':
    transactionType = 'card_payment';
    break;
  case 'esewa':
    transactionType = 'esewa_payment';
    break;
  case 'khalti':
    transactionType = 'khalti_payment';
    break;
  case 'fonepay':
    transactionType = 'fonepay_payment';
    break;
  default:
    transactionType = 'online_payment';
}
```

## Additional Improvements

1. **Added payment_method column** to daybook insert:
   ```javascript
   INSERT INTO daybook_transactions (
     transaction_date, transaction_type, category, amount, 
     description, order_id, payment_method, created_at
   )
   ```

2. **Improved description formatting**:
   ```javascript
   `${order.payment_method.toUpperCase()} payment - Order #${order.id} (synced)`
   ```
   Now shows: "ESEWA payment - Order #123 (synced)"

## How to Use

### Sync Missing Payments:
1. Go to **Daybook** tab
2. Select the date you want to sync
3. Click **"🔄 Sync payments"** button
4. System will:
   - Find all paid orders for that date
   - Check which ones are missing from daybook
   - Insert them with correct transaction types
   - Show success message with count and amount

### What Gets Synced:
- Orders with `payment_status = 'paid'`
- Orders from the selected date
- Orders not already in daybook
- All payment methods: cash, card, esewa, khalti, fonepay, online

### Console Output:
```
🔄 Syncing payments to daybook for date: 2026-04-23
  ✅ Synced Order #456: esewa_payment NPR 1,500
  ✅ Synced Order #457: khalti_payment NPR 2,000
  ✅ Synced Order #458: fonepay_payment NPR 1,500
```

## Testing

### To Test the Fix:

1. **Verify some QR payments exist**:
   - Go to Tables → Payment Receipts
   - Check that you have verified receipts

2. **Check if they're in daybook**:
   - Go to Daybook tab
   - Look for eSewa/Khalti/Fonepay transactions
   - If missing, proceed to sync

3. **Run sync**:
   - Click "🔄 Sync payments"
   - Should see success message: "Synced X payments"
   - Check transaction log for new entries

4. **Verify in transaction log**:
   - Filter by payment type (eSewa/Khalti/Fonepay)
   - Should see synced transactions
   - Check KPI tiles show correct totals

## Files Modified

- `server/server.js`
  - Updated `/api/daybook/sync-payments` endpoint
  - Changed payment method mapping logic
  - Added payment_method column to insert
  - Improved description formatting

## Notes

- Sync only affects orders that are already marked as `paid`
- Sync does not modify existing daybook entries
- Sync is date-specific (syncs only selected date)
- Sync is idempotent (safe to run multiple times)
- Backend server must be restarted for changes to take effect

## Troubleshooting

### If payments still don't sync:

1. **Check order payment_status**:
   - Orders must have `payment_status = 'paid'`
   - Check in Orders tab or database

2. **Check order payment_method**:
   - Must be one of: cash, card, esewa, khalti, fonepay
   - Check in Orders tab or database

3. **Check date**:
   - Sync uses order `created_at` date
   - Make sure you're syncing the correct date

4. **Check if already synced**:
   - Sync skips orders already in daybook
   - Check transaction log for existing entries

5. **Check console logs**:
   - Backend logs show sync progress
   - Look for "✅ Synced Order #..." messages
