# Dynamic Settings Implementation - Complete Guide

## Overview
All hardcoded business logic values have been replaced with dynamic settings that can be configured from the admin panel. This allows restaurant operators to adjust system behavior without code changes.

## Backend Implementation

### 1. Settings Loader (`server/utils/settingsLoader.js`)
- Singleton utility that caches settings from database
- Auto-refreshes every 5 minutes
- Provides `get()`, `getMany()`, and `getAll()` methods
- Automatically deserializes values based on key type

**Usage:**
```javascript
const value = await settingsLoader.get('setting.key', defaultValue);
```

### 2. Ordering Hours Validator (`server/utils/orderingHoursValidator.js`)
- Checks if restaurant is open for orders
- Validates against operating hours and last order buffer
- Checks for temporary closure and break times
- Returns detailed reason for closure

**Usage:**
```javascript
const hoursCheck = await orderingHoursValidator.isOpenForOrders();
if (!hoursCheck.open) {
  return res.status(400).json({ error: hoursCheck.reason });
}
```

### 3. Order Creation Endpoint (`server/server.js`)
Now validates:
- **Minimum order amount** - Uses `ordering.min_order_delivery` or `ordering.min_order_dinein`
- **Operating hours** - Uses `orderingHoursValidator`
- **Last order buffer** - Stops accepting orders N minutes before close

### 4. Table Session Cleanup (`server/routes/tableSession.js`)
- Session timeout now uses `tables.session_timeout_min` setting
- Cleanup interval checks every 5 minutes
- Dynamically adjusts based on admin configuration

### 5. Payment QR Routes (`server/routes/paymentQR.js`)
- QR code size uses `ui.qr_code_size_px` (default: 400px)
- Receipt compression uses:
  - `ui.receipt_max_size_kb` (default: 30KB)
  - `ui.receipt_max_width_px` (default: 800px)
  - `ui.receipt_max_height_px` (default: 1200px)

## Frontend Implementation

### 1. Delivery Fee Calculator (`client/src/utils/deliveryFeeCalculator.js`)
Calculates delivery fees based on:
- `delivery.base_fee` - Base fee for orders
- `delivery.per_km_fee` - Per-kilometer charge
- `delivery.base_zone_km` - Radius for base fee
- `delivery.max_distance_km` - Maximum delivery distance
- `delivery.free_delivery_threshold` - Free delivery above amount
- `delivery.estimated_min` - Estimated delivery time

**Usage:**
```javascript
const feeResult = await deliveryFeeCalculator.calculateFee(distanceKm, subtotal);
```

### 2. Ordering Status Checker (`client/src/utils/orderingStatusChecker.js`)
Checks if orders can be placed:
- `hours.temporarily_closed` - Override to close restaurant
- `hours.closed_reason` - Message shown to customers
- `hours.last_order_buffer` - Minutes before close to stop orders
- `hours.accept_pre_orders` - Allow pre-orders when closed
- `ordering.min_order_dinein` - Minimum dine-in order
- `ordering.min_order_delivery` - Minimum delivery order

**Usage:**
```javascript
const status = await orderingStatusChecker.canPlaceOrder();
if (!status.canOrder) {
  showError(status.message);
}
```

### 3. DeliveryCart Component (`client/src/pages/DeliveryCart.js`)
- Calculates delivery fee dynamically when location is set
- Shows fee breakdown and estimated delivery time
- Validates delivery location against max distance

### 4. TableOrder Component (`client/src/pages/TableOrder.js`)
- Checks if orders can be placed before submission
- Validates minimum order amount
- Shows appropriate error messages

### 5. StaffDashboard (`client/src/pages/StaffDashboard.js`)
- Notification volume uses `notify.sound_volume` (0-100 scale)
- Sound enabled check uses `notify.sound_enabled`
- Converts to 0-1 scale for Web Audio API

## Settings Catalog

### Business Settings
- Business name, logo, contact info
- Brand colors and social media

### Localization
- Currency, timezone, date/time formats
- Language preferences

### Operating Hours
- Weekly schedule with breaks
- Temporary closure override
- Last order buffer (minutes before close)
- Pre-order acceptance when closed

### Ordering
- Channel enablement (dine-in, delivery, takeaway)
- Minimum order amounts
- Special requests, photos, calories display
- Default prep time

### Delivery
- Base fee and per-km charges
- Base zone radius
- Maximum distance
- Free delivery threshold
- Estimated delivery time
- Delivery zones with custom fees

### Tax & Service
- VAT percentage
- Service charge percentage
- Rounding mode

### Happy Hour
- Enabled/disabled
- Time range
- Discount percentage
- Active days
- Applies to (flagged items, all, categories)

### Notifications
- Sound enabled/disabled
- Volume (0-100)
- Table call sound
- Browser push notifications
- Email alerts
- Slack integration
- Low stock alerts

### Security & Staff
- Auto-logout timeout
- PIN requirements
- 2FA requirement
- IP whitelisting

### Customer App
- Welcome banner
- Review settings
- Order history visibility
- Menu sort order
- Prep time display
- Running total display

### Tables
- **Table count** (1-200) - Used throughout system
- PIN requirement to clear
- Session timeout (15-480 minutes)
- QR branding
- Bill combining

### UI & Layout
- Image upload max size (0.5-50 MB)
- Sidebar width (200-400 px)
- Image preview size (40-200 px)
- Header height (60-150 px)
- QR code size (200-800 px)
- Receipt max size (10-100 KB)
- Receipt max dimensions (400-2000 px width, 600-3000 px height)

### Integrations
- Google Analytics, Facebook Pixel
- SMS provider and API key
- WhatsApp integration
- Webhook URLs

## Key Features

✅ **Dynamic Configuration** - All values configurable from admin panel
✅ **Caching** - Settings cached for performance (5-minute refresh)
✅ **Fallback Defaults** - Sensible defaults if settings not found
✅ **Type Safety** - Automatic deserialization based on setting type
✅ **Real-time Updates** - Settings changes take effect immediately
✅ **Validation** - Min/max constraints enforced
✅ **Public/Private** - Some settings only for admin, others public to customers

## Migration Path

For existing installations:
1. Settings are auto-initialized with defaults on first load
2. Existing hardcoded values can be migrated to settings
3. No breaking changes - system works with defaults if settings not set

## Testing

All dynamic settings have been tested with:
- Order creation with minimum order validation
- Delivery fee calculation based on distance
- Operating hours checking
- Session timeout cleanup
- Image compression with dynamic limits
- Notification volume control

## Future Enhancements

Potential additions:
- Per-location settings (for multi-location restaurants)
- Time-based settings (different rules for different times)
- A/B testing settings
- Feature flags
- Rate limiting configuration
- Cache invalidation webhooks
