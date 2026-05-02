const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { query } = require('../database/config');
const settingsLoader = require('../utils/settingsLoader');

// In-memory storage for active table sessions
// sessionToken -> { tableId, createdAt, lastActivity }
const activeSessions = new Map();

// Clean up expired sessions based on settings
let cleanupInterval = setInterval(async () => {
  try {
    const timeoutMin = await settingsLoader.get('tables.session_timeout_min', 120);
    const timeoutMs = timeoutMin * 60 * 1000;
    const expiredTime = Date.now() - timeoutMs;
    
    let expiredCount = 0;
    for (const [token, session] of activeSessions.entries()) {
      if (session.lastActivity < expiredTime) {
        activeSessions.delete(token);
        expiredCount++;
        console.log(`🧹 Expired table session: Table ${session.tableId}`);
      }
    }
    
    if (expiredCount > 0) {
      console.log(`🧹 Cleaned up ${expiredCount} expired sessions`);
    }
  } catch (err) {
    console.error('Error cleaning up sessions:', err);
  }
}, 5 * 60 * 1000); // Check every 5 minutes

// Generate a unique session token
function generateSessionToken(tableId) {
  return crypto.randomBytes(32).toString('hex') + '-' + tableId + '-' + Date.now();
}

// Middleware to validate session token
function validateSession(req, res, next) {
  const sessionToken = req.headers['x-session-token'];
  
  if (!sessionToken) {
    return res.status(401).json({ error: 'Session token required' });
  }
  
  const session = activeSessions.get(sessionToken);
  
  if (!session) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
  
  // Update last activity
  session.lastActivity = Date.now();
  
  // Attach session info to request
  req.session = session;
  req.sessionToken = sessionToken;
  
  next();
}

// Create or get session for a table
router.post('/create', async (req, res) => {
  try {
    const { tableId } = req.body;
    
    if (!tableId || tableId < 1) {
      return res.status(400).json({ error: 'Valid table ID required' });
    }
    
    // Check if table exists and is valid
    const settingsResult = await query(
      `SELECT setting_value FROM restaurant_settings WHERE setting_key = 'tables.table_count'`
    );
    
    const tableCount = settingsResult.rows[0]?.setting_value || 25;
    
    if (tableId > tableCount) {
      return res.status(400).json({ error: `Invalid table. Tables 1-${tableCount} available.` });
    }
    
    // Check if there's already an active session for this table
    let existingToken = null;
    for (const [token, session] of activeSessions.entries()) {
      if (session.tableId === tableId) {
        existingToken = token;
        session.lastActivity = Date.now();
        break;
      }
    }
    
    if (existingToken) {
      return res.json({
        success: true,
        sessionToken: existingToken,
        tableId,
        message: 'Existing session resumed'
      });
    }
    
    // Create new session
    const sessionToken = generateSessionToken(tableId);
    activeSessions.set(sessionToken, {
      tableId,
      createdAt: Date.now(),
      lastActivity: Date.now()
    });
    
    console.log(`✅ New table session created: Table ${tableId}`);
    
    res.json({
      success: true,
      sessionToken,
      tableId,
      message: 'Session created'
    });
    
  } catch (error) {
    console.error('❌ Error creating table session:', error);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

// Get session info
router.get('/info', validateSession, (req, res) => {
  res.json({
    success: true,
    session: {
      tableId: req.session.tableId,
      createdAt: req.session.createdAt,
      lastActivity: req.session.lastActivity
    }
  });
});

// Get order history for current table session
router.get('/orders', validateSession, async (req, res) => {
  try {
    const { tableId } = req.session;
    
    // Get all orders for this table that are not completed or cancelled
    const ordersResult = await query(`
      SELECT 
        o.id,
        o.order_number,
        o.order_type,
        o.customer_name,
        o.customer_phone,
        o.table_id,
        o.subtotal,
        o.discount,
        o.total,
        o.status,
        o.payment_status,
        o.payment_method,
        o.notes,
        o.created_at,
        o.updated_at,
        json_agg(
          json_build_object(
            'id', oi.id,
            'menu_item_id', oi.menu_item_id,
            'name', mi.name,
            'price', oi.price,
            'quantity', oi.quantity,
            'subtotal', oi.subtotal,
            'special_instructions', oi.special_instructions
          )
        ) as items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
      WHERE o.table_id = $1 
        AND o.status NOT IN ('completed', 'cancelled')
        AND o.order_type = 'dine-in'
      GROUP BY o.id
      ORDER BY o.created_at DESC
    `, [tableId]);
    
    res.json({
      success: true,
      orders: ordersResult.rows,
      tableId
    });
    
  } catch (error) {
    console.error('❌ Error fetching table orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Get total bill for current table session
router.get('/bill', validateSession, async (req, res) => {
  try {
    const { tableId } = req.session;
    
    // Calculate total bill for all unpaid orders at this table
    const billResult = await query(`
      SELECT 
        COUNT(o.id) as order_count,
        COALESCE(SUM(o.subtotal), 0) as subtotal,
        COALESCE(SUM(o.discount), 0) as total_discount,
        COALESCE(SUM(o.total), 0) as total,
        json_agg(
          json_build_object(
            'order_id', o.id,
            'order_number', o.order_number,
            'subtotal', o.subtotal,
            'discount', o.discount,
            'total', o.total,
            'status', o.status,
            'payment_status', o.payment_status,
            'created_at', o.created_at
          )
        ) FILTER (WHERE o.id IS NOT NULL) as orders
      FROM orders o
      WHERE o.table_id = $1 
        AND o.payment_status = 'pending'
        AND o.status NOT IN ('cancelled')
        AND o.order_type = 'dine-in'
    `, [tableId]);
    
    const bill = billResult.rows[0];
    
    res.json({
      success: true,
      tableId,
      bill: {
        orderCount: parseInt(bill.order_count) || 0,
        subtotal: parseFloat(bill.subtotal) || 0,
        discount: parseFloat(bill.total_discount) || 0,
        total: parseFloat(bill.total) || 0,
        orders: bill.orders || []
      }
    });
    
  } catch (error) {
    console.error('❌ Error calculating table bill:', error);
    res.status(500).json({ error: 'Failed to calculate bill' });
  }
});

// Request payment (marks orders as ready for payment)
router.post('/request-payment', validateSession, async (req, res) => {
  try {
    const { tableId } = req.session;
    const { paymentMethod } = req.body;
    
    if (!paymentMethod || !['cash', 'card', 'phonepe', 'esewa', 'khalti'].includes(paymentMethod)) {
      return res.status(400).json({ error: 'Valid payment method required' });
    }
    
    // Get all unpaid orders for this table
    const ordersResult = await query(`
      SELECT id, order_number, total
      FROM orders
      WHERE table_id = $1 
        AND payment_status = 'pending'
        AND status NOT IN ('cancelled')
        AND order_type = 'dine-in'
    `, [tableId]);
    
    if (ordersResult.rows.length === 0) {
      return res.status(400).json({ error: 'No unpaid orders found' });
    }
    
    const totalAmount = ordersResult.rows.reduce((sum, order) => sum + parseFloat(order.total), 0);
    
    // Update payment method for all orders
    await query(`
      UPDATE orders
      SET payment_method = $1, updated_at = CURRENT_TIMESTAMP
      WHERE table_id = $2 
        AND payment_status = 'pending'
        AND status NOT IN ('cancelled')
        AND order_type = 'dine-in'
    `, [paymentMethod, tableId]);
    
    // Emit payment request to admin
    const io = req.app.get('io');
    io.emit('paymentRequested', {
      tableId,
      orderCount: ordersResult.rows.length,
      totalAmount,
      paymentMethod,
      orders: ordersResult.rows
    });
    
    console.log(`💳 Payment requested: Table ${tableId}, Amount: Rs. ${totalAmount}`);
    
    res.json({
      success: true,
      message: 'Payment request sent to staff',
      totalAmount,
      orderCount: ordersResult.rows.length,
      paymentMethod
    });
    
  } catch (error) {
    console.error('❌ Error requesting payment:', error);
    res.status(500).json({ error: 'Failed to request payment' });
  }
});

// Delete session (called when table is cleared by admin or after payment verified)
router.delete('/clear', async (req, res) => {
  try {
    const { tableId } = req.body;

    if (!tableId) {
      return res.status(400).json({ error: 'Table ID required' });
    }

    // Find and delete session for this table
    let deletedCount = 0;
    for (const [token, session] of activeSessions.entries()) {
      if (session.tableId === tableId) {
        activeSessions.delete(token);
        deletedCount++;
      }
    }

    console.log(`🧹 Cleared ${deletedCount} session(s) for Table ${tableId}`);

    // Broadcast so admin/staff UIs refresh without polling.
    const io = req.app.get('io');
    if (io) {
      io.emit('tableCleared', { tableId });
      io.emit('tableStatusUpdated', { tableId, status: 'empty' });
    }

    res.json({
      success: true,
      message: `Cleared ${deletedCount} session(s)`,
      tableId
    });

  } catch (error) {
    console.error('❌ Error clearing table session:', error);
    res.status(500).json({ error: 'Failed to clear session' });
  }
});

// Get active sessions count (admin only)
router.get('/active-count', (req, res) => {
  const activeCount = activeSessions.size;
  const sessions = Array.from(activeSessions.values()).map(s => ({
    tableId: s.tableId,
    createdAt: s.createdAt,
    lastActivity: s.lastActivity
  }));
  
  res.json({
    success: true,
    activeCount,
    sessions
  });
});

module.exports = router;
