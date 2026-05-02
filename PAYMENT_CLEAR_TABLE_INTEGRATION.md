# Payment Method Integration with Clear Table

## Overview
Integrated payment method selection with the table clearing workflow. Now when admin completes an order and records payment, the table is automatically cleared in one smooth flow.

## Changes Made

### 1. OrdersManagement.js - Smart Button Logic

Updated the "Clear Table" button to be context-aware:

**For orders with status "ready":**
- Shows: "💳 Complete & Pay" button
- Action: Opens payment method modal

**For completed orders (not yet paid):**
- Shows: "💳 Pay & Clear" button  
- Action: Opens payment method modal → records payment → clears table

**For completed orders (already paid):**
- Shows: "🧹 Clear Table" button
- Action: Just clears the table (no payment needed)

### 2. AdminPremium.js - Auto-Clear After Payment

Updated `handlePaymentMethodConfirm` function to:
1. Record payment with selected method
2. Update order status to completed
3. **Automatically clear the table** (for dine-in orders)
4. Show success notification

## Workflow

### Scenario 1: Normal Flow (Ready → Complete & Pay)
1. Order status: "ready"
2. Admin clicks "💳 Complete & Pay"
3. Payment method modal appears
4. Admin selects payment method (Cash, Card, eSewa, etc.)
5. System records payment
6. **Table is automatically cleared**
7. Notification: "Order completed, payment recorded, and Table X cleared"

### Scenario 2: Completed but Unpaid (Complete → Pay & Clear)
1. Order status: "completed" but payment_status: "pending"
2. Admin clicks "💳 Pay & Clear"
3. Payment method modal appears
4. Admin selects payment method
5. System records payment
6. **Table is automatically cleared**
7. Notification: "Order completed, payment recorded, and Table X cleared"

### Scenario 3: Already Paid (Just Clear)
1. Order status: "completed" and payment_status: "paid"
2. Admin clicks "🧹 Clear Table"
3. Table is cleared immediately (no modal)
4. Notification: "Table X cleared successfully"

## Benefits

✅ **One-Click Workflow**: Payment + Clear Table in single action
✅ **Smart Buttons**: Button text changes based on payment status
✅ **Prevents Errors**: Can't clear table without recording payment
✅ **Consistent UX**: Same flow across all card modes (mini, compact, full)
✅ **Auto-Clear**: No need to manually click "Clear Table" after payment
✅ **Flexible**: Still allows manual clearing for already-paid orders

## Button States Summary

| Order Status | Payment Status | Button Text | Action |
|-------------|---------------|-------------|--------|
| pending | pending | 🔥 Start Preparing | Change status to preparing |
| preparing | pending | ✅ Mark Ready | Change status to ready |
| ready | pending | 💳 Complete & Pay | Open payment modal → auto-clear |
| completed | pending | 💳 Pay & Clear | Open payment modal → auto-clear |
| completed | paid | 🧹 Clear Table | Clear table only |

## Code Changes

### File: `client/src/components/premium/OrdersManagement.js`

**Lines ~1077-1088 (Mini mode):**
```javascript
{(order.status === 'completed' || order.payment_status === 'paid') && type === 'dine-in' && (
  <button 
    onClick={() => {
      if (order.payment_status !== 'paid') {
        onCompleteOrder(order.id); // Ask for payment method first
      } else {
        onClearTable(order.table_id); // Just clear table
      }
    }} 
    className="flex-1 bg-purple-600 text-white py-1 px-2 rounded text-[10px] font-medium hover:bg-purple-700"
  >
    Clear
  </button>
)}
```

**Lines ~1150-1165 (Compact mode):**
```javascript
{(order.status === 'completed' || order.payment_status === 'paid') && type === 'dine-in' && (
  <button 
    onClick={() => {
      if (order.payment_status !== 'paid') {
        onCompleteOrder(order.id); // Ask for payment method first
      } else {
        onClearTable(order.table_id); // Just clear table
      }
    }} 
    className="flex-1 bg-purple-600 text-white py-1.5 px-3 rounded-lg text-xs font-medium hover:bg-purple-700"
  >
    {order.payment_status !== 'paid' ? '💳 Pay & Clear' : '🧹 Clear Table'}
  </button>
)}
```

**Lines ~1256-1271 (Full mode):**
```javascript
{(order.status === 'completed' || order.payment_status === 'paid') && type === 'dine-in' && (
  <button
    onClick={() => {
      if (order.payment_status !== 'paid') {
        onCompleteOrder(order.id); // Ask for payment method first
      } else {
        onClearTable(order.table_id); // Just clear table
      }
    }}
    className="flex-1 bg-gradient-to-r from-purple-600 to-purple-700 text-white py-2 px-4 rounded-lg font-medium hover:from-purple-700 hover:to-purple-800 transition-all"
  >
    {order.payment_status !== 'paid' ? '💳 Pay & Clear Table' : '🧹 Clear Table'}
  </button>
)}
```

### File: `client/src/pages/AdminPremium.js`

**Lines ~879-920 (handlePaymentMethodConfirm):**
```javascript
const handlePaymentMethodConfirm = async (paymentMethod) => {
  if (!pendingOrderCompletion) return;
  
  const { orderId, amount } = pendingOrderCompletion;
  
  try {
    const token = localStorage.getItem('adminToken');
    if (!token) { alert('Session expired.'); window.location.reload(); return; }
    
    // Find the order to get table_id
    const order = orders.find(o => o.id === orderId);
    
    // Update order status to completed
    await fetchApi.put(`/api/orders/${orderId}/status`, { 
      status: 'completed', 
      payment_status: 'paid' 
    });
    
    // Create payment record
    await fetchApi.post('/api/payments', {
      order_id: orderId,
      amount: parseFloat(amount),
      payment_method: paymentMethod,
      payment_status: 'paid',
      transaction_id: `ADMIN-${Date.now()}`,
      notes: `Payment recorded by admin via ${paymentMethod}`
    });
    
    // If this is a dine-in order, clear the table automatically
    if (order && order.table_id && order.order_type === 'dine-in') {
      try {
        await handleClearTable(order.table_id);
        pushToast(`Order completed, payment recorded, and Table ${order.table_id} cleared`);
      } catch (clearError) {
        console.error('Failed to clear table:', clearError);
        pushToast('Order completed and payment recorded, but failed to clear table');
      }
    } else {
      pushToast('Order completed and payment recorded');
    }
    
    fetchOrders();
    setShowPaymentMethodModal(false);
    setPendingOrderCompletion(null);
  } catch (err) {
    if (String(err.message).includes('Authentication failed')) { alert('Session expired.'); window.location.reload(); }
    else alert(`Failed to complete order: ${err.message}`);
  }
};
```

## Testing Checklist

- [ ] Order in "ready" status shows "Complete & Pay" button
- [ ] Clicking "Complete & Pay" opens payment method modal
- [ ] Selecting payment method records payment and clears table
- [ ] Completed unpaid order shows "Pay & Clear" button
- [ ] Already paid order shows "Clear Table" button
- [ ] "Clear Table" button only clears (no payment modal)
- [ ] Success notifications show correct messages
- [ ] Table becomes available after clearing
- [ ] Payment is recorded in daybook
- [ ] Works in all three card modes (mini, compact, full)

## Date
April 23, 2026
