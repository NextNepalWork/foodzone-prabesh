# Print Bill Feature - Order Management

## Feature Added

A "Print Bill" button has been added to all completed and paid orders in the Order Management page. This allows staff to quickly print customer bills for completed orders.

## Implementation Details

### Button Visibility

The Print Bill button appears when:
- Order status is `completed` OR
- Order status is `paid`

**Button Design:**
- 🖨️ Print icon
- Indigo background color
- Appears next to the "Details" button
- Available in all three card modes (mini, compact, full)

### Print Bill Function

**Function:** `handlePrintBill(order)`

**What it does:**
1. Opens a new browser window
2. Generates a formatted bill with:
   - Restaurant header (FOOD ZONE)
   - Order information (number, date, time, table, customer)
   - Itemized list of ordered items with quantities and prices
   - Subtotal, discount, delivery fee (if applicable)
   - Grand total
   - Payment status
   - Thank you message
3. Automatically triggers print dialog
4. Closes window after printing

### Bill Format

The bill is formatted for thermal printers (80mm width) with:

```
================================
        FOOD ZONE
      Restaurant Bill
  Thank you for dining with us!
================================

Order #: ORD-12345
Date: Jan 15, 2024
Time: 2:30 PM
Table: 15
Customer: John Doe
Phone: 9841234567
Status: [COMPLETED]
Payment: [PAID]

--------------------------------
ITEM                QTY    PRICE
--------------------------------
Chicken Momo        × 2    400.00
Cheese Pizza        × 1    850.00
Coke                × 2    100.00
--------------------------------

Subtotal:              1350.00
Discount:               -50.00
--------------------------------
TOTAL:            NPR 1300.00
================================

    Thank you for your order!
        Visit us again 🙏

Note: Extra spicy as requested
================================
```

### Bill Styling

**Features:**
- Monospace font (Courier New) for alignment
- 80mm width (thermal printer standard)
- Dashed borders for sections
- Bold text for totals
- Centered header and footer
- Responsive to print media queries
- Auto-print on load
- Auto-close after printing

### Button Locations

#### 1. Compact Mode (Main View)
```
[🔥 Start Preparing] [Details] [🗑️]
[✅ Mark Ready] [Details] [🗑️]
[✅ Clear Table] [Details] [🖨️ Print] [🗑️]  ← Print button appears
```

#### 2. Full Mode (Expanded View)
```
[🔥 Start Preparing] [👁️ View] [🗑️] [📍]
[✅ Mark Ready] [👁️ View] [🗑️] [📍]
[✅ Clear Table] [👁️ View] [🖨️ Print] [🗑️] [📍]  ← Print button appears
```

#### 3. Mini Mode (Delivery Sidebar)
```
[Prepare] [View]
[Ready] [View]
[Complete] [View] [🖨️]  ← Print button appears
```

## Code Implementation

### Print Function

```javascript
const handlePrintBill = (order) => {
  const printWindow = window.open('', '_blank');
  const orderTotal = getTotalAmount(order);
  const orderDate = new Date(order.created_at);
  
  const billHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Bill - Order #${order.order_number}</title>
      <style>
        /* Thermal printer optimized styles */
        body {
          font-family: 'Courier New', monospace;
          max-width: 80mm;
          margin: 0 auto;
          padding: 10px;
          font-size: 12px;
        }
        /* ... more styles ... */
      </style>
    </head>
    <body>
      <!-- Bill content -->
      <script>
        window.onload = function() {
          window.print();
          setTimeout(function() {
            window.close();
          }, 100);
        };
      </script>
    </body>
    </html>
  `;
  
  printWindow.document.write(billHTML);
  printWindow.document.close();
};
```

### Button Rendering

```javascript
{(order.status === 'completed' || order.status === 'paid') && (
  <button 
    onClick={() => handlePrintBill(order)} 
    className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700" 
    title="Print Bill"
  >
    🖨️ Print
  </button>
)}
```

## User Flow

### For Staff

1. **Order Completion:**
   - Staff marks order as "Ready"
   - Staff clicks "Clear Table" or "Complete"
   - Admin selects payment method
   - Order status changes to "Completed"

2. **Print Bill:**
   - Print button (🖨️) appears on order card
   - Staff clicks "Print Bill"
   - Print dialog opens automatically
   - Staff selects printer and prints
   - Window closes automatically

3. **Customer Receives:**
   - Printed bill with all order details
   - Clear itemization
   - Total amount
   - Payment status

## Bill Information Included

### Header Section
- Restaurant name (FOOD ZONE)
- Bill title
- Thank you message

### Order Information
- Order number
- Date and time
- Table number (for dine-in)
- Customer name (if provided)
- Customer phone (if provided)
- Order status
- Payment status

### Items Section
- Item name
- Quantity
- Individual price
- Line total

### Totals Section
- Subtotal
- Discount (if applicable)
- Delivery fee (if applicable)
- **Grand Total** (bold)

### Footer Section
- Thank you message
- Visit again message
- Order notes (if any)

## Print Settings

### Recommended Printer Settings
- Paper size: 80mm (thermal)
- Orientation: Portrait
- Margins: Minimal (handled by CSS)
- Scale: 100%
- Background graphics: Off

### Browser Compatibility
- ✅ Chrome/Edge: Full support
- ✅ Firefox: Full support
- ✅ Safari: Full support
- ✅ Mobile browsers: Supported

## Benefits

1. **Quick Billing**: One-click bill printing for completed orders
2. **Professional**: Formatted bills with all necessary information
3. **Thermal Printer Ready**: Optimized for 80mm thermal printers
4. **No Extra Software**: Uses browser's native print functionality
5. **Automatic**: Auto-opens print dialog, auto-closes window
6. **Complete Information**: Includes all order and payment details
7. **Customer Satisfaction**: Professional bills enhance customer experience

## Testing Checklist

- ✅ Print button appears only for completed/paid orders
- ✅ Print button hidden for pending/preparing/ready orders
- ✅ Print dialog opens automatically
- ✅ Bill includes all order information
- ✅ Items are properly formatted
- ✅ Totals calculate correctly
- ✅ Discount shows when applicable
- ✅ Delivery fee shows for delivery orders
- ✅ Table number shows for dine-in orders
- ✅ Customer info shows when available
- ✅ Payment status displays correctly
- ✅ Window closes after printing
- ✅ Works on all three card modes (mini, compact, full)

## Future Enhancements

1. **Customizable Templates**: Allow restaurant to customize bill format
2. **Logo Integration**: Add restaurant logo to bill header
3. **QR Code**: Add QR code for feedback or loyalty program
4. **Multiple Copies**: Option to print multiple copies
5. **Email Bill**: Option to email bill to customer
6. **Save as PDF**: Option to save bill as PDF
7. **Barcode**: Add barcode for order tracking
8. **Tax Breakdown**: Show detailed tax calculation

## Files Modified

- `client/src/components/premium/OrdersManagement.js` - Added print bill function and button

## Status

✅ **COMPLETE AND READY TO USE**

The print bill feature is now live and available for all completed and paid orders in the Order Management page.
