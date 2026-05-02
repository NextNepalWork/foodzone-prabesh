const { body, param, query, validationResult } = require('express-validator');

// Validation error handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// Common validation rules
const validationRules = {
  // Order validation
  createOrder: [
    body('customerName').optional({ checkFalsy: true }).trim().isLength({ min: 2, max: 100 }).escape(),
    body('phone').optional({ checkFalsy: true }).isMobilePhone().withMessage('Invalid phone number'),
    body('orderType').isIn(['dine-in', 'delivery', 'takeaway']).withMessage('Invalid order type'),
    body('tableId').optional().custom((value) => {
      // Allow 'Delivery' string or numeric table IDs
      if (value === 'Delivery' || value === null || value === undefined) return true;
      if (typeof value === 'string' && !isNaN(parseInt(value))) return true;
      if (typeof value === 'number' && value >= 1) return true;
      throw new Error('Invalid table ID');
    }),
    body('items').isArray({ min: 1 }).withMessage('Order must contain at least one item'),
    body('items.*.id').isInt({ min: 1 }).withMessage('Invalid menu item ID'),
    body('items.*.quantity').isInt({ min: 1, max: 50 }).withMessage('Invalid quantity'),
    body('items.*.price').isFloat({ min: 0 }).withMessage('Invalid price'),
    body('totalAmount').isFloat({ min: 0 }).withMessage('Invalid total amount'),
    body('address').optional().trim().isLength({ max: 500 }).escape(),
    handleValidationErrors
  ],

  // Order status update
  updateOrderStatus: [
    param('orderId').isInt({ min: 1 }).withMessage('Invalid order ID'),
    body('status').isIn(['pending', 'preparing', 'ready', 'completed', 'cancelled']).withMessage('Invalid status'),
    handleValidationErrors
  ],

  // Payment validation
  createPayment: [
    body('order_id').isInt({ min: 1 }).withMessage('Invalid order ID'),
    body('amount').isFloat({ min: 0 }).withMessage('Invalid amount'),
    body('payment_method').isIn(['cash', 'card', 'phonepe', 'esewa', 'khalti', 'fonepay', 'bank_transfer', 'other']).withMessage('Invalid payment method'),
    body('table_id').optional().isInt({ min: 1 }).withMessage('Invalid table ID'),
    handleValidationErrors
  ],

  // Table validation
  tableId: [
    param('tableId').isInt({ min: 1 }).withMessage('Invalid table ID'),
    handleValidationErrors
  ],

  // Customer validation
  createCustomer: [
    body('name').trim().isLength({ min: 2, max: 100 }).escape(),
    body('phone').isMobilePhone().withMessage('Invalid phone number'),
    body('email').optional().isEmail().normalizeEmail(),
    handleValidationErrors
  ],

  // Menu item validation
  createMenuItem: [
    body('name').trim().isLength({ min: 2, max: 200 }).escape(),
    body('description').optional().trim().isLength({ max: 1000 }).escape(),
    body('price').isFloat({ min: 0 }).withMessage('Invalid price'),
    body('category').trim().isLength({ min: 2, max: 100 }).escape(),
    body('is_available').optional().isBoolean(),
    handleValidationErrors
  ],

  // Admin authentication
  adminAuth: [
    body('username').trim().isLength({ min: 3, max: 50 }).escape(),
    body('password').isLength({ min: 8, max: 128 }).withMessage('Password must be 8-128 characters'),
    handleValidationErrors
  ],

  // Staff authentication
  staffAuth: [
    body('username').trim().isLength({ min: 3, max: 50 }).escape(),
    body('password').isLength({ min: 6, max: 128 }).withMessage('Password must be 6-128 characters'),
    handleValidationErrors
  ],

  // Staff validation
  createStaff: [
    body('name').trim().isLength({ min: 2, max: 100 }).escape(),
    body('role').isIn(['Manager', 'Chef', 'Waiter', 'Cashier', 'Kitchen Helper']).withMessage('Invalid staff role'),
    body('phone').optional().isMobilePhone(),
    body('email').optional().isEmail().normalizeEmail(),
    handleValidationErrors
  ],

  // Settings validation
  updateSettings: [
    body('restaurant_name').optional().trim().isLength({ min: 2, max: 200 }).escape(),
    body('phone').optional().isMobilePhone(),
    body('address').optional().trim().isLength({ max: 500 }).escape(),
    body('delivery_radius').optional().isFloat({ min: 0, max: 100 }),
    body('delivery_fee').optional().isFloat({ min: 0 }),
    body('minimum_order').optional().isFloat({ min: 0 }),
    handleValidationErrors
  ],

  // Query parameter validation
  pagination: [
    query('page').optional().isInt({ min: 1 }).withMessage('Invalid page number'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Invalid limit'),
    handleValidationErrors
  ],

  // Date range validation
  dateRange: [
    query('start_date').optional().isISO8601().withMessage('Invalid start date'),
    query('end_date').optional().isISO8601().withMessage('Invalid end date'),
    handleValidationErrors
  ]
};

// Sanitization middleware
const sanitizeInput = (req, res, next) => {
  // Remove any potential script tags or dangerous HTML
  const sanitizeValue = (value) => {
    if (typeof value === 'string') {
      return value
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '');
    }
    return value;
  };

  // Recursively sanitize object properties
  const sanitizeObject = (obj) => {
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        if (typeof obj[key] === 'object' && obj[key] !== null) {
          sanitizeObject(obj[key]);
        } else {
          obj[key] = sanitizeValue(obj[key]);
        }
      }
    }
  };

  if (req.body) sanitizeObject(req.body);
  if (req.query) sanitizeObject(req.query);
  if (req.params) sanitizeObject(req.params);

  next();
};

module.exports = {
  validationRules,
  handleValidationErrors,
  sanitizeInput
};
