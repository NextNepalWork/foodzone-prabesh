# Verification Checklist - Optional Customer Data

## Pre-Deployment Checks

### 1. Database Migration
- [ ] Run migration script: `psql -U postgres -d foodzone_local -f server/migrations/make-customer-fields-optional.sql`
- [ ] Verify no errors in migration output
- [ ] Run test script: `node server/test-optional-customer-data.js`
- [ ] Confirm all tests pass

### 2. Code Changes Verification
- [ ] `create-local-database.sql` - customer fields are nullable
- [ ] `server/server.js` - table status endpoint includes `display_name`
- [ ] `server/routes/paymentQR.js` - accepts NULL customer data
- [ ] `client/src/pages/AdminPremium.js` - handles missing customer data in UI
- [ ] All files pass diagnostics (no TypeScript/syntax errors)

## Functional Testing

### 3. Table Orders (Dine-in)
- [ ] Create order from table without entering customer name/phone
- [ ] Verify order appears in admin dashboard
- [ ] Check table floor plan shows "Unknown Customer" for table
- [ ] Verify table detail modal displays correctly
- [ ] Complete order and verify payment flow works
- [ ] Check order appears in reports with "Guest" or "Unknown"

### 4. Payment QR Flow
- [ ] Submit payment receipt without customer info
- [ ] Verify receipt appears in Payment Receipts tab
- [ ] Check receipt detail shows table ID but no customer info
- [ ] Verify payment verification works
- [ ] Check payment records in daybook

### 5. Reports & Analytics
- [ ] Open Reports tab
- [ ] Verify Order Report shows orders with "Guest" for missing names
- [ ] Check Customer Report only shows customers with recorded info
- [ ] Verify Analytics calculations are correct
- [ ] Test CSV export includes proper handling of NULL values

### 6. Customer Management
- [ ] Open Customers tab
- [ ] Verify no errors when loading customers
- [ ] Check customer stats calculate correctly
- [ ] Verify search/filter works with mixed data

### 7. Mixed Data Scenarios
- [ ] Create some orders WITH customer info
- [ ] Create some orders WITHOUT customer info
- [ ] Verify both types display correctly
- [ ] Check reports aggregate both types correctly
- [ ] Verify floor plan handles both types

## UI/UX Verification

### 8. Display Names
- [ ] Table with customer name shows: "Customer Name"
- [ ] Table with only phone shows: "Phone Number"
- [ ] Table without customer data shows: "Unknown Customer"
- [ ] Empty table shows: "Empty"
- [ ] Receipt without customer shows only table ID

### 9. Forms & Inputs
- [ ] Customer name field shows "(Optional)" label
- [ ] Customer phone field shows "(Optional)" label
- [ ] Forms submit successfully with empty customer fields
- [ ] No validation errors for missing customer data

### 10. Error Handling
- [ ] No console errors when loading pages
- [ ] No database errors in server logs
- [ ] Graceful handling of NULL values throughout
- [ ] No crashes or blank screens

## Backend Verification

### 11. API Endpoints
- [ ] `GET /api/tables/status` returns `display_name` field
- [ ] `GET /api/orders` handles NULL customer fields
- [ ] `POST /api/payment-qr/receipts` accepts NULL customer data
- [ ] `GET /api/reports/*` endpoints work with NULL values
- [ ] `GET /api/customers` filters correctly

### 12. Database Queries
- [ ] No SQL errors in logs
- [ ] Queries handle NULL values with COALESCE
- [ ] JOINs work correctly with optional customer data
- [ ] Aggregations calculate correctly

## Performance & Security

### 13. Performance
- [ ] Page load times are acceptable
- [ ] No N+1 query issues
- [ ] Reports generate in reasonable time
- [ ] Floor plan updates quickly

### 14. Security
- [ ] No SQL injection vulnerabilities
- [ ] NULL values don't break authentication
- [ ] Customer data privacy maintained
- [ ] No data leakage in error messages

## Edge Cases

### 15. Special Scenarios
- [ ] Order with empty string vs NULL for customer name
- [ ] Order with whitespace-only customer name
- [ ] Multiple orders from same table without customer info
- [ ] Payment receipt with partial customer info (name but no phone)
- [ ] Customer search with NULL values
- [ ] Sorting/filtering with mixed NULL and non-NULL data

## Rollback Plan

### 16. If Issues Found
- [ ] Document the specific issue
- [ ] Check if it's a migration issue or code issue
- [ ] Rollback migration if needed:
  ```sql
  ALTER TABLE orders ALTER COLUMN customer_name SET NOT NULL;
  ALTER TABLE orders ALTER COLUMN customer_phone SET NOT NULL;
  ALTER TABLE table_sessions ALTER COLUMN customer_name SET NOT NULL;
  ALTER TABLE table_sessions ALTER COLUMN customer_phone SET NOT NULL;
  ```
- [ ] Revert code changes if needed
- [ ] Test rollback doesn't break existing data

## Sign-off

- [ ] All tests passed
- [ ] No critical issues found
- [ ] Documentation updated
- [ ] Team notified of changes
- [ ] Ready for production deployment

---

## Test Results

**Date:** _____________
**Tester:** _____________
**Environment:** _____________

**Overall Status:** ⬜ PASS  ⬜ FAIL  ⬜ NEEDS REVIEW

**Notes:**
_____________________________________________
_____________________________________________
_____________________________________________

**Issues Found:**
_____________________________________________
_____________________________________________
_____________________________________________
