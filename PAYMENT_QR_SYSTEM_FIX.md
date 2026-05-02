# Payment QR System - Fix Required

## Current Issues

### 1. PaymentQRModal Crash
**Error**: `Cannot read properties of undefined (reading 'filter')` at line 21
**Cause**: `qrCodes` prop is undefined - not being passed from TableDashboard
**Location**: `client/src/components/PaymentQRModal.js:21`

### 2. No QR Code Upload in Settings
**Issue**: Admin cannot upload payment QR codes (eSewa, Khalti, etc.)
**Needed**: Settings page needs QR code management section

## Required Fixes

### Fix 1: Add QR Code Management to Settings
**File**: `client/src/components/AdminSettings.js` or `client/src/pages/AdminPremium.js`

Add section for:
- Upload eSewa QR code image
- Upload Khalti QR code image  
- Upload other payment method QR codes
- Store in database or settings

### Fix 2: Store QR Codes in Database
**Table**: `payment_qr_codes` or store in `restaurant_settings`

Schema needed:
```sql
CREATE TABLE payment_qr_codes (
  id SERIAL PRIMARY KEY,
  payment_method VARCHAR(50), -- 'esewa', 'khalti', 'fonepay'
  qr_image_url TEXT,
  account_name VARCHAR(100),
  account_number VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Fix 3: Fix PaymentQRModal Component
**File**: `client/src/components/PaymentQRModal.js`

Changes needed:
1. Fetch QR codes from API/settings instead of expecting prop
2. Handle case when no QR codes exist
3. Show fallback message if QR not configured

### Fix 4: Update TableDashboard
**File**: `client/src/pages/TableDashboard.js`

Either:
- Option A: Fetch QR codes and pass to PaymentQRModal
- Option B: Let PaymentQRModal fetch its own QR codes (better)

## Quick Fix (Temporary)

Add default check in PaymentQRModal:
```javascript
const relevantQRs = (qrCodes || []).filter(qr => 
  qr.payment_method.toLowerCase() === paymentMethod.toLowerCase()
);
```

## Proper Solution

1. Create QR code management in admin settings
2. Store QR images in `/public/qr-codes/` or database
3. Create API endpoint: `GET /api/payment-qr-codes`
4. Update PaymentQRModal to fetch QR codes
5. Show setup instructions if no QR codes configured

## Priority
**HIGH** - Payment system is broken without this
