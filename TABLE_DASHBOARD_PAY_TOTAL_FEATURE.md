# Table Dashboard - Pay Total Feature

## Feature Added

Added a "Pay Total" button to the table dashboard (`/table/{tableId}/dashboard`) that allows customers to pay for all pending orders at once using a single QR code payment.

## Changes Made

### 1. New `handlePayTotal()` Function

```javascript
const handlePayTotal = () => {
  // Create a combined order object for all pending orders
  const pendingOrders = orders.filter(order => order.payment_status === 'pending');
  if (pendingOrders.length === 0) return;

  const combinedOrder = {
    id: 'combined',
    total: getPendingAmount(),
    items: pendingOrders.flatMap(order => order.items || []),
    order_ids: pendingOrders.map(order => order.id)
  };

  setSelectedOrder(combinedOrder);
  setShowPaymentModal(true);
};
```

This function:
- Filters all pending orders
- Combines them into a single payment object
- Calculates the total amount
- Merges all items from all orders
- Passes all order IDs to the payment modal

### 2. Updated Payment Modal Integration

Modified the `PaymentQRModal` props to handle both single and combined orders:

```javascript
orderIds={selectedOrder.id === 'combined' ? selectedOrder.order_ids : [selectedOrder.id]}
```

This ensures:
- Single order payments pass `[orderId]`
- Combined payments pass `[orderId1, orderId2, orderId3, ...]`

### 3. Pay Total UI Component

Added a prominent "Pay Total" button that appears when there are 2+ pending orders:

**Features:**
- 🎨 Orange gradient design to stand out
- 💰 Shows total pending amount
- 📊 Displays count of pending orders
- 📱 QR code payment icon
- ✨ Smooth hover and active states

**Visibility Logic:**
```javascript
{orders.filter(order => order.payment_status === 'pending').length > 1 && (
  // Pay Total Button UI
)}
```

Only shows when there are multiple pending orders.

### 4. Layout Adjustment

Added bottom padding to the orders list (`pb-24`) to prevent the last order from being hidden behind the pay total button.

## User Experience

### Before
- Customer had to pay each order individually
- Multiple QR code scans required
- Time-consuming for tables with multiple orders

### After
- Customer sees a prominent "Pay Total" button at the top
- Single QR code payment for all pending orders
- Faster checkout experience
- Individual order payment still available if needed

## UI Layout

```
┌─────────────────────────────────────┐
│ Header (Table 15, Back, Refresh)   │
│ Summary Cards (Total Orders, Pending)│
├─────────────────────────────────────┤
│ 💰 Pay All Pending Orders          │
│ 3 orders pending payment            │
│ NPR 1,250.00                        │
│ [📱 Pay Total with QR Code]        │
├─────────────────────────────────────┤
│ Order #1 - NPR 450.00              │
│ [📱 Pay with QR Code]              │
├─────────────────────────────────────┤
│ Order #2 - NPR 350.00              │
│ [📱 Pay with QR Code]              │
├─────────────────────────────────────┤
│ Order #3 - NPR 450.00              │
│ [📱 Pay with QR Code]              │
└─────────────────────────────────────┘
```

## Technical Details

**File Modified:** `client/src/pages/TableDashboard.js`

**Functions Added:**
- `handlePayTotal()` - Combines pending orders and opens payment modal

**Functions Modified:**
- Payment modal now accepts either single order ID or array of order IDs

**Conditional Rendering:**
- Pay Total button only shows when `pendingOrders.length > 1`

## Testing Checklist

- ✅ Pay Total button appears when 2+ pending orders exist
- ✅ Pay Total button hidden when 0-1 pending orders
- ✅ Clicking Pay Total opens QR payment modal
- ✅ Total amount correctly sums all pending orders
- ✅ All order IDs passed to payment modal
- ✅ Individual order payment buttons still work
- ✅ Payment completion refreshes order list
- ✅ Paid orders don't show payment buttons

## Backend Compatibility

The existing `PaymentQRModal` component already supports multiple order IDs via the `orderIds` prop, so no backend changes are required. The payment receipt will be linked to all specified order IDs.
