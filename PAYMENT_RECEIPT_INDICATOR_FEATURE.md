# Payment Receipt Verification Indicator on Floor Plan

## Feature Overview
Added visual indicators on the table floor plan to show when a table has pending payment receipt verification requests. This allows admins to quickly identify which tables need payment verification without having to check the Payment Receipts tab.

## Visual Indicators

### 1. Table Tile Indicator
- **Yellow pulsing badge** (💳) appears in the top-right corner of table tiles
- **Yellow ring** around the table tile for additional visibility
- **Animated ping effect** to draw attention
- Visible on both occupied and empty tables (if receipt was submitted)

### 2. Table Detail Modal Alert
- **Yellow alert banner** at the top of the table detail modal
- Shows:
  - Payment amount
  - Payment method (eSewa, Khalti, Fonepay)
  - "Pending Verification" status badge
  - Quick action button to review the receipt
- Clicking "Review Receipt →" navigates to Payment Receipts tab

## Implementation Details

### State Management
```javascript
const [pendingReceipts, setPendingReceipts] = useState([]);
```

### Data Fetching
- Fetches pending receipts on component mount
- Refreshes when `paymentReceiptSubmitted` socket event is received
- Auto-refreshes on the same interval as table statuses
- Filters receipts by `status=pending` query parameter

### Socket Events
Listens for:
- `paymentReceiptSubmitted` - When customer submits a payment receipt
- Automatically refreshes pending receipts list

### Visual Design
- **Color scheme**: Yellow (warning/attention color)
- **Animation**: Pulse + ping effects for high visibility
- **Badge size**: 20px (w-5 h-5) with emoji icon
- **Ring**: 2px yellow ring with 1px offset
- **Alert banner**: Yellow background with darker yellow text

## User Flow

### Admin Perspective:
1. Customer submits payment receipt from their table
2. Table tile shows yellow pulsing badge (💳)
3. Admin clicks on the table
4. Modal shows yellow alert with receipt details
5. Admin clicks "Review Receipt →"
6. Navigates to Payment Receipts tab
7. Admin verifies or rejects the receipt
8. Badge disappears from table tile

### Customer Perspective:
1. Customer scans QR code and pays
2. Customer uploads payment receipt screenshot
3. Waits for admin verification
4. Receives confirmation when verified

## API Endpoint Used
```
GET /api/payment-qr/receipts?status=pending
```

Returns array of pending receipts with:
- `id` - Receipt ID
- `table_id` - Table number
- `total_amount` - Payment amount
- `payment_method` - Payment method used
- `receipt_image_url` - Receipt image URL
- `created_at` - Submission timestamp

## Benefits

1. **Faster Response Time**: Admins can immediately see which tables need attention
2. **Better UX**: No need to constantly check Payment Receipts tab
3. **Visual Priority**: Pulsing animation draws attention to urgent tasks
4. **Contextual Information**: See receipt details in table context
5. **Quick Navigation**: One-click access to verification interface

## Files Modified

- `client/src/pages/AdminPremium.js`
  - Added `pendingReceipts` state
  - Added `fetchPendingReceipts()` function
  - Added socket listener for `paymentReceiptSubmitted`
  - Added visual indicator to table tiles
  - Added alert banner to table detail modal
  - Added periodic refresh of pending receipts

## Testing

To test the feature:

1. **Submit a payment receipt**:
   - Go to customer view: `/table/27`
   - Add items to cart and place order
   - Go to dashboard: `/table/27/dashboard`
   - Click "Pay with QR Code"
   - Upload a screenshot
   - Submit

2. **Check admin view**:
   - Open admin panel → Tables tab → Floor Plan
   - Table 27 should show yellow pulsing badge (💳)
   - Table 27 should have yellow ring around it
   - Click on Table 27
   - Yellow alert banner should appear at top
   - Click "Review Receipt →"
   - Should navigate to Payment Receipts tab

3. **Verify or reject**:
   - In Payment Receipts tab, verify or reject the receipt
   - Go back to Floor Plan
   - Badge should disappear from Table 27

## Future Enhancements

- Add count badge showing number of pending receipts per table
- Add sound notification when new receipt is submitted
- Add desktop notification support
- Add receipt preview in table modal (without navigating away)
- Add bulk verification for multiple receipts
