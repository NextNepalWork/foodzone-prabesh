# Prompt for Claude Opus: Fix Order Payment Flow

## Context
I have a restaurant management system with an order workflow. The payment method selection modal is not appearing when clicking the "Complete & Pay" button.

## Current Issue
When I click the "Complete & Pay" button for orders in "ready" status, the payment method modal should appear but it doesn't. The button exists in the code but the modal is not showing up.

## Required Workflow
The order should follow this flow:
1. **Pending** → Button: "Start Preparing" → Changes status to "preparing"
2. **Preparing** → Button: "Mark Ready" → Changes status to "ready"
3. **Ready** → Button: "Complete & Pay" → Opens payment method modal
4. **After payment selected** → Records payment, marks as completed, clears table automatically
5. **Completed & Paid** → Button: "Clear Table" → Clears table (if not already cleared)

## Files Involved
- `client/src/pages/AdminPremium.js` - Contains `handleCompleteOrder` function and PaymentMethodModal
- `client/src/components/premium/OrdersManagement.js` - Contains OrderCard component with buttons
- `client/src/components/PaymentMethodModal.js` - The modal component

## What Needs to Work
1. When order status is "ready", show "💳 Complete & Pay" button
2. Clicking this button should call `onCompleteOrder(order.id)`
3. This should trigger `handleCompleteOrder` in AdminPremium.js
4. This should set `showPaymentMethodModal` to true
5. PaymentMethodModal should appear with 7 payment options (Cash, Card, eSewa, Khalti, FonePay, Bank Transfer, Other)
6. After selecting payment method and confirming:
   - Record payment in database
   - Update order status to "completed"
   - Update payment_status to "paid"
   - Clear the table automatically (for dine-in orders)
   - Show success notification

## Requirements
- The payment method modal MUST appear when clicking "Complete & Pay"
- The modal should be visible and functional
- After payment is recorded, the table should be automatically cleared
- The button should change to "Clear Table" after payment is complete
- All three card modes (mini, compact, full) should work the same way

## Debug
Please add console.log statements to verify:
1. Button click is registered
2. onCompleteOrder is called with correct orderId
3. handleCompleteOrder receives the orderId
4. Order is found in the orders array
5. Modal state is being set to true
6. Modal is rendering

## Expected Behavior
```
User clicks "Complete & Pay"
  ↓
Console: "🔔 handleCompleteOrder called with orderId: 123"
  ↓
Console: "📦 Found order: {...}"
  ↓
Console: "💳 Setting payment modal state..."
  ↓
Modal appears on screen
  ↓
User selects payment method (e.g., Cash)
  ↓
User clicks "Confirm Payment"
  ↓
Payment is recorded
  ↓
Table is cleared
  ↓
Success notification appears
  ↓
Button changes to "Clear Table"
```

## Additional Context
- The PaymentMethodModal component exists and is imported correctly
- The handleCompleteOrder function exists in AdminPremium.js
- The onCompleteOrder prop is passed to OrdersManagement component
- No syntax errors are present in any files
- This might be a state management or rendering issue

## Task
Please investigate why the PaymentMethodModal is not appearing and fix it so that:
1. The modal appears when clicking "Complete & Pay"
2. Payment can be recorded
3. Table is automatically cleared after payment
4. The workflow is smooth and intuitive

Make sure to test all three card display modes (mini, compact, full) to ensure consistency.
