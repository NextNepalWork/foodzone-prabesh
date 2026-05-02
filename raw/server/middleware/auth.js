const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

// Use environment variables directly for Railway deployment
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || process.env.ADMIN_PASSWORD; // Fallback to plain password

// Staff roles enum
const STAFF_ROLES = {
  MANAGER: 'Manager',
  CHEF: 'Chef',
  WAITER: 'Waiter',
  CASHIER: 'Cashier',
  KITCHEN_HELPER: 'Kitchen Helper'
};

// Generate JWT token
const generateToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

// Verify JWT token
const verifyToken = (token) => {
  return jwt.verify(token, JWT_SECRET);
};

// Hash password
const hashPassword = async (password) => {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
};

// Compare password with hash
const comparePassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};

// Middleware to authenticate JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      message: 'Access token required' 
    });
  }

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Token expired' 
      });
    }
    return res.status(403).json({ 
      success: false, 
      message: 'Invalid token' 
    });
  }
};

// Middleware to check admin role
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ 
      success: false, 
      message: 'Admin access required' 
    });
  }
  next();
};

// Middleware to check staff roles
const requireStaffRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }

    const userRole = req.user.role;
    const isAdmin = userRole === 'admin';
    const hasRequiredRole = allowedRoles.includes(userRole);

    if (!isAdmin && !hasRequiredRole) {
      return res.status(403).json({ 
        success: false, 
        message: `Access denied. Required roles: ${allowedRoles.join(', ')}` 
      });
    }

    next();
  };
};

// Middleware for specific staff roles
const requireManager = requireStaffRole([STAFF_ROLES.MANAGER]);
const requireChef = requireStaffRole([STAFF_ROLES.CHEF, STAFF_ROLES.KITCHEN_HELPER]);
const requireWaiter = requireStaffRole([STAFF_ROLES.WAITER]);
const requireCashier = requireStaffRole([STAFF_ROLES.CASHIER]);

// Middleware for kitchen staff (Chef + Kitchen Helper)
const requireKitchenStaff = requireStaffRole([STAFF_ROLES.CHEF, STAFF_ROLES.KITCHEN_HELPER]);

// Middleware for front-of-house staff (Manager + Waiter + Cashier)
const requireFrontStaff = requireStaffRole([STAFF_ROLES.MANAGER, STAFF_ROLES.WAITER, STAFF_ROLES.CASHIER]);

// Staff user credentials from environment
const STAFF_CREDENTIALS = {
  manager: {
    username: process.env.MANAGER_USERNAME || 'manager',
    password: process.env.MANAGER_PASSWORD || 'Manager2024!',
    role: STAFF_ROLES.MANAGER
  },
  chef: {
    username: process.env.CHEF_USERNAME || 'chef',
    password: process.env.CHEF_PASSWORD || 'Chef2024!',
    role: STAFF_ROLES.CHEF
  },
  waiter: {
    username: process.env.WAITER_USERNAME || 'waiter',
    password: process.env.WAITER_PASSWORD || 'Waiter2024!',
    role: STAFF_ROLES.WAITER
  },
  cashier: {
    username: process.env.CASHIER_USERNAME || 'cashier',
    password: process.env.CASHIER_PASSWORD || 'Cashier2024!',
    role: STAFF_ROLES.CASHIER
  },
  kitchen_helper: {
    username: process.env.KITCHEN_HELPER_USERNAME || 'kitchen_helper',
    password: process.env.KITCHEN_HELPER_PASSWORD || 'KitchenHelper2024!',
    role: STAFF_ROLES.KITCHEN_HELPER
  }
};

// Admin authentication function - use database staff table
const authenticateAdmin = async (username, password) => {
  try {
    const { query } = require('../database/config');
    
    // Query admin user from staff table
    const result = await query(
      'SELECT id, username, password_hash, full_name, role FROM staff WHERE username = $1 AND role = $2 AND is_active = true',
      [username, 'Manager']
    );
    
    if (result.rows.length === 0) {
      return { success: false, message: 'Invalid credentials' };
    }
    
    const admin = result.rows[0];
    
    // Compare password with hash
    const isValid = await comparePassword(password, admin.password_hash);
    
    if (isValid) {
      const token = generateToken({ 
        username: admin.username, 
        role: 'admin',
        id: admin.id,
        fullName: admin.full_name
      });
      return { 
        success: true, 
        token, 
        user: { 
          username: admin.username, 
          role: 'admin',
          fullName: admin.full_name,
          id: admin.id
        } 
      };
    }

    return { success: false, message: 'Invalid credentials' };
  } catch (error) {
    console.error('Admin authentication error:', error);
    return { success: false, message: 'Authentication error' };
  }
};

// Staff authentication function - now uses database
const authenticateStaff = async (username, password) => {
  try {
    const { query } = require('../database/config');
    
    console.log('Staff auth attempt:', { username, password: password ? '[PROVIDED]' : '[MISSING]' });
    
    // Query staff from database
    const staffQuery = await query(
      'SELECT id, username, password_hash, full_name, role, is_active FROM staff WHERE username = $1 AND is_active = true',
      [username]
    );
    
    console.log('Staff query result:', staffQuery.rows.length > 0 ? 'Found user' : 'User not found');
    
    if (staffQuery.rows.length === 0) {
      return { success: false, message: 'Invalid credentials' };
    }
    
    const staff = staffQuery.rows[0];
    console.log('Comparing password with hash:', { 
      passwordLength: password.length, 
      hashLength: staff.password_hash.length,
      hashPrefix: staff.password_hash.substring(0, 10) 
    });
    
    const isValidPassword = await comparePassword(password, staff.password_hash);
    
    console.log('Password validation:', isValidPassword ? 'Valid' : 'Invalid');
    
    if (!isValidPassword) {
      return { success: false, message: 'Invalid credentials' };
    }
    
    const token = generateToken({
      id: staff.id,
      username: staff.username,
      role: staff.role,
      fullName: staff.full_name
    });
    
    return { 
      success: true, 
      token, 
      user: { 
        id: staff.id,
        username: staff.username, 
        role: staff.role,
        fullName: staff.full_name
      } 
    };
  } catch (error) {
    console.error('Staff authentication error:', error);
    return { success: false, message: 'Authentication failed' };
  }
};

module.exports = {
  generateToken,
  verifyToken,
  hashPassword,
  comparePassword,
  authenticateToken,
  requireAdmin,
  requireStaffRole,
  requireManager,
  requireChef,
  requireWaiter,
  requireCashier,
  requireKitchenStaff,
  requireFrontStaff,
  authenticateAdmin,
  authenticateStaff,
  STAFF_ROLES
};
