# QR Code Payment Daybook & Database Integration

## Overview
Integrated QR code payment verification (eSewa, Khalti, Fonepay) with the daybook system and payments database. When admin verifies a payment receipt, the transaction is now recorded in:
1. **Payments table** - Individual payment records
2. **Daybook transactions** - Daily financial tracking
3. **Orders table** - Payment status and method updated

## Implementation Details

### 1. Payment Verification Endpoint Enhancement
**File**: `server/routes/paymentQR.js`

When admin verifies a payment receipt (`POST /api/payment-qr/receipts/:id/verify`):

#### A. Update Orders
```javascript
UPDATE orders 
SET payment_status = 'paid', 
    payment_method = 'esewa|khalti|fonepay',
    updated_at = CURRENT_TIMESTAMP
WHERE id = ANY(order_ids)
```

#### B. Record in Payments Table
For each order in the receipt:
```javascript
INSERT INTO payments (
  order_id, payment_method, amount, invoice_number,
  amount_received, change_given, created_at
)
VALUES (order_id, payment_method, total, order_number, total, 0, NOW())
```

#### C. Record in Daybook Transactions
For each order in the receipt:
```javascript
INSERT INTO daybook_transactions (
  transaction_date, transaction_type, category, amount,
  description, order_id, payment_method, reference, created_at
)
VALUES (
  CURRENT_DATE,
  'esewa_payment|khalti_payment|fonepay_payment',
  'sales',
  order_total,
  'ESEWA payment - Order #FZ-xxx - Table 27',
  order_id,
  'esewa|khalti|fonepay',
  'Receipt #123',
  NOW()
)
```

### 2. New Transaction Types
Added three new transaction types to daybook:
- `esewa_payment` - eSewa QR code payments
- `khalti_payment` - Khalti QR code payments
- `fonepay_payment` - Fonepay QR code payments

### 3. Daybook Summary Updates
**File**: `server/server.js`

Updated all daybook summary queries to include QR payment types:

#### A. Daily Summary Endpoint (`GET /api/daybook/summary`)
```sql
SELECT
  COALESCE(SUM(amount) FILTER (WHERE transaction_type = 'esewa_payment'), 0) AS esewa_payments,
  COALESCE(SUM(amount) FILTER (WHERE transaction_type = 'khalti_payment'), 0) AS khalti_payments,
  COALESCE(SUM(amount) FILTER (WHERE transaction_type = 'fonepay_payment'), 0) AS fonepay_payments,
  ...
```

Total sales calculation now includes:
```javascript
total_sales = cash_payments + card_payments + online_payments + 
              esewa_payments + khalti_payments + fonepay_payments
```

#### B. Daybook Detail Endpoint (`GET /api/daybook/:date`)
Updated to track QR payments separately in daily reports.

#### C. Close Day Endpoint (`POST /api/daybook/close`)
Updated to include QR payments in:
- Daily sales totals
- Closing balance calculations
- Next day opening balance

### 4. Payment Flow

```
Customer Side:
1. Customer scans QR code (eSewa/Khalti/Fonepay)
2. Customer pays via mobile app
3. Customer uploads payment receipt screenshot
4. Receipt stored in payment_receipts table (status: pending)

Admin Side:
5. Admin sees yellow badge on table floor plan
6. Admin clicks table → sees payment alert
7. Admin navigates to Payment Receipts tab
8. Admin reviews receipt image
9. Admin clicks "Verify" or "Reject"

If Verified:
10. Orders marked as paid
11. Payment recorded in payments table
12. Transaction recorded in daybook
13. Table session cleared
14. Socket event emitted to all clients
15. Badge removed from floor plan
```

### 5. Database Schema

#### Payments Table
```sql
CREATE TABLE payments (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id),
  payment_method VARCHAR(50),
  amount DECIMAL(10,2),
  invoice_number VARCHAR(100),
  amount_received DECIMAL(10,2),
  change_given DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT NOW()
)
```

#### Daybook Transactions Table
```sql
CREATE TABLE daybook_transactions (
  id SERIAL PRIMARY KEY,
  transaction_date DATE,
  transaction_type VARCHAR(50), -- includes esewa_payment, khalti_payment, fonepay_payment
  category VARCHAR(50),
  amount DECIMAL(10,2),
  description TEXT,
  order_id INTEGER,
  payment_method VARCHAR(50),
  reference VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
)
```

#### Payment Receipts Table
```sql
CREATE TABLE payment_receipts (
  id SERIAL PRIMARY KEY,
  table_id INTEGER,
  order_ids INTEGER[],
  payment_method VARCHAR(50), -- esewa, khalti, fonepay
  receipt_image_path VARCHAR(255),
  total_amount DECIMAL(10,2),
  customer_name VARCHAR(100),
  customer_phone VARCHAR(20),
  status VARCHAR(20) DEFAULT 'pending', -- pending, verified, rejected
  verified_by INTEGER,
  verified_at TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
)
```

### 6. Logging & Monitoring

Console logs added for tracking:
```
💰 Recorded payment: Order #FZ-20260423-003, esewa, NPR 1500
✅ Payment verified: Table 27, 1 order(s), NPR 1500
```

### 7. Socket Events

Emits `paymentVerified` event with:
```javascript
{
  tableId: 27,
  receiptId: 123,
  orderIds: [456],
  totalAmount: 1500,
  paymentMethod: 'esewa'
}
```

## Benefits

1. **Complete Financial Tracking**: All QR payments now tracked in daybook
2. **Accurate Reports**: Daily summaries include all payment methods
3. **Payment History**: Individual payment records in payments table
4. **Audit Trail**: Full transaction history with references
5. **Real-time Updates**: Socket events keep all clients synchronized
6. **Proper Accounting**: Closing balance calculations include QR payments

## Testing

### Test Payment Verification:

1. **Submit Receipt**:
   - Customer view: `/table/27`
   - Place order
   - Go to dashboard: `/table/27/dashboard`
   - Click "Pay with QR Code"
   - Upload screenshot
   - Submit

2. **Verify Payment**:
   - Admin panel → Tables → Payment Receipts
   - Click on pending receipt
   - Click "Verify Payment"

3. **Check Database**:
   ```sql
   -- Check payments table
   SELECT * FROM payments WHERE order_id = 456;
   
   -- Check daybook
   SELECT * FROM daybook_transactions 
   WHERE transaction_type IN ('esewa_payment', 'khalti_payment', 'fonepay_payment')
   AND transaction_date = CURRENT_DATE;
   
   -- Check order status
   SELECT payment_status, payment_method FROM orders WHERE id = 456;
   ```

4. **Check Daybook Summary**:
   - Admin panel → Daybook
   - Verify QR payments appear in daily totals
   - Check that total sales includes QR payments

## Files Modified

1. **server/routes/paymentQR.js**
   - Enhanced `/receipts/:id/verify` endpoint
   - Added payments table recording
   - Added daybook transaction recording
   - Added payment method update to orders

2. **server/server.js**
   - Updated `/api/daybook/summary` query
   - Updated `/api/daybook/:date` query
   - Updated `/api/daybook/close` calculations
   - Added esewa_payments, khalti_payments, fonepay_payments fields

## Migration Notes

### For Existing Data:
If you have existing verified payment receipts that weren't recorded in daybook:

```sql
-- Find verified receipts without daybook entries
SELECT pr.*, o.order_number, o.total
FROM payment_receipts pr
JOIN orders o ON o.id = ANY(pr.order_ids)
LEFT JOIN daybook_transactions dt ON dt.order_id = o.id
WHERE pr.status = 'verified'
  AND dt.id IS NULL;

-- Manually insert missing transactions (adjust as needed)
INSERT INTO daybook_transactions (
  transaction_date, transaction_type, category, amount,
  description, order_id, payment_method, reference, created_at
)
SELECT 
  DATE(pr.verified_at),
  CASE pr.payment_method
    WHEN 'esewa' THEN 'esewa_payment'
    WHEN 'khalti' THEN 'khalti_payment'
    WHEN 'fonepay' THEN 'fonepay_payment'
  END,
  'sales',
  o.total,
  pr.payment_method || ' payment - Order #' || o.order_number || ' - Table ' || pr.table_id,
  o.id,
  pr.payment_method,
  'Receipt #' || pr.id,
  pr.verified_at
FROM payment_receipts pr
JOIN orders o ON o.id = ANY(pr.order_ids)
WHERE pr.status = 'verified';
```

## Future Enhancements

1. Add payment gateway transaction IDs
2. Add refund support for QR payments
3. Add payment reconciliation reports
4. Add automatic payment verification via API integration
5. Add payment analytics dashboard
6. Add payment method preferences tracking
