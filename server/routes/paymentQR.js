const express = require('express');
const router = express.Router();
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const { query } = require('../database/config');
const { authenticateToken, requireManager } = require('../middleware/auth');
const settingsLoader = require('../utils/settingsLoader');

// Ensure directories exist
const uploadsDir = path.join(__dirname, '../uploads');
const qrCodesDir = path.join(uploadsDir, 'qr-codes');
const receiptsDir = path.join(uploadsDir, 'receipts');

[uploadsDir, qrCodesDir, receiptsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Multer configuration for QR code uploads
const qrStorage = multer.memoryStorage();
const qrUpload = multer({
  storage: qrStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Multer configuration for receipt uploads
const receiptStorage = multer.memoryStorage();
const receiptUpload = multer({
  storage: receiptStorage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Initialize payment QR codes table
async function initializePaymentQRTable() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS payment_qr_codes (
        id SERIAL PRIMARY KEY,
        payment_method VARCHAR(50) NOT NULL,
        label VARCHAR(100) NOT NULL,
        qr_image_path VARCHAR(255) NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS payment_receipts (
        id SERIAL PRIMARY KEY,
        table_id INTEGER NOT NULL,
        order_ids INTEGER[] NOT NULL,
        payment_method VARCHAR(50) NOT NULL,
        receipt_image_path VARCHAR(255) NOT NULL,
        total_amount DECIMAL(10,2) NOT NULL,
        customer_name VARCHAR(100),
        customer_phone VARCHAR(20),
        status VARCHAR(20) DEFAULT 'pending',
        verified_by INTEGER,
        verified_at TIMESTAMP,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ Payment QR tables initialized');
  } catch (error) {
    console.error('❌ Error initializing payment QR tables:', error);
  }
}

// Initialize tables on module load
initializePaymentQRTable();

// Get all active QR codes
router.get('/qr-codes', async (req, res) => {
  try {
    const result = await query(`
      SELECT id, payment_method, label, qr_image_path, is_active, created_at
      FROM payment_qr_codes
      WHERE is_active = true
      ORDER BY payment_method, label
    `);

    const qrCodes = result.rows.map(row => ({
      ...row,
      qr_image_url: `/uploads/qr-codes/${path.basename(row.qr_image_path)}`
    }));

    res.json({
      success: true,
      qrCodes
    });
  } catch (error) {
    console.error('❌ Error fetching QR codes:', error);
    res.status(500).json({ error: 'Failed to fetch QR codes' });
  }
});

// Upload QR code (Admin only)
router.post('/qr-codes', authenticateToken, requireManager, qrUpload.single('qrImage'), async (req, res) => {
  try {
    const { paymentMethod, label } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ error: 'QR code image is required' });
    }

    if (!paymentMethod || !label) {
      return res.status(400).json({ error: 'Payment method and label are required' });
    }

    // Get QR code size from settings
    const qrCodeSize = await settingsLoader.get('ui.qr_code_size_px', 400);

    // Generate unique filename
    const filename = `qr_${paymentMethod}_${Date.now()}.webp`;
    const filepath = path.join(qrCodesDir, filename);

    // Process and compress image
    await sharp(req.file.buffer)
      .resize(qrCodeSize, qrCodeSize, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
      .webp({ quality: 85 })
      .toFile(filepath);

    // Save to database
    const result = await query(`
      INSERT INTO payment_qr_codes (payment_method, label, qr_image_path)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [paymentMethod, label, filepath]);

    res.json({
      success: true,
      qrCode: {
        ...result.rows[0],
        qr_image_url: `/uploads/qr-codes/${filename}`
      }
    });

  } catch (error) {
    console.error('❌ Error uploading QR code:', error);
    res.status(500).json({ error: 'Failed to upload QR code' });
  }
});

// Delete QR code (Admin only)
router.delete('/qr-codes/:id', authenticateToken, requireManager, async (req, res) => {
  try {
    const { id } = req.params;

    // Get QR code info
    const qrResult = await query(`
      SELECT qr_image_path FROM payment_qr_codes WHERE id = $1
    `, [id]);

    if (qrResult.rows.length === 0) {
      return res.status(404).json({ error: 'QR code not found' });
    }

    // Delete file
    const filepath = qrResult.rows[0].qr_image_path;
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
    }

    // Delete from database
    await query(`DELETE FROM payment_qr_codes WHERE id = $1`, [id]);

    res.json({ success: true, message: 'QR code deleted successfully' });

  } catch (error) {
    console.error('❌ Error deleting QR code:', error);
    res.status(500).json({ error: 'Failed to delete QR code' });
  }
});

// Submit payment receipt
router.post('/receipts', receiptUpload.single('receipt'), async (req, res) => {
  try {
    const { tableId, orderIds, paymentMethod, totalAmount, customerName, customerPhone } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ error: 'Receipt image is required' });
    }

    if (!tableId || !orderIds || !paymentMethod || !totalAmount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Parse order IDs
    const orderIdsArray = JSON.parse(orderIds);

    // Get receipt compression settings
    const maxSizeKb = await settingsLoader.get('ui.receipt_max_size_kb', 30);
    const maxWidth = await settingsLoader.get('ui.receipt_max_width_px', 800);
    const maxHeight = await settingsLoader.get('ui.receipt_max_height_px', 1200);

    // Generate unique filename
    const filename = `receipt_table${tableId}_${Date.now()}.webp`;
    const filepath = path.join(receiptsDir, filename);

    // Compress image to under max size
    let quality = 80;
    let compressedBuffer;
    const maxBytes = maxSizeKb * 1024;
    
    do {
      compressedBuffer = await sharp(req.file.buffer)
        .resize(maxWidth, maxHeight, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality })
        .toBuffer();
      
      quality -= 10;
    } while (compressedBuffer.length > maxBytes && quality > 20);

    // Save compressed image
    await fs.promises.writeFile(filepath, compressedBuffer);

    // Save to database
    const result = await query(`
      INSERT INTO payment_receipts (
        table_id, order_ids, payment_method, receipt_image_path, 
        total_amount, customer_name, customer_phone
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [tableId, orderIdsArray, paymentMethod, filepath, totalAmount, customerName || null, customerPhone || null]);

    // Emit notification to admin
    const io = req.app.get('io');
    io.emit('paymentReceiptSubmitted', {
      receiptId: result.rows[0].id,
      tableId,
      paymentMethod,
      totalAmount,
      customerName
    });

    res.json({
      success: true,
      message: 'Payment receipt submitted successfully',
      receiptId: result.rows[0].id
    });

  } catch (error) {
    console.error('❌ Error submitting receipt:', error);
    res.status(500).json({ error: 'Failed to submit receipt' });
  }
});

// Get payment receipts (Admin only)
router.get('/receipts', authenticateToken, async (req, res) => {
  try {
    const { status, tableId } = req.query;
    
    let whereClause = '1=1';
    const params = [];
    
    if (status) {
      whereClause += ' AND status = $' + (params.length + 1);
      params.push(status);
    }
    
    if (tableId) {
      whereClause += ' AND table_id = $' + (params.length + 1);
      params.push(tableId);
    }

    const result = await query(`
      SELECT pr.*
      FROM payment_receipts pr
      WHERE ${whereClause}
      ORDER BY pr.created_at DESC
    `, params);

    const receipts = result.rows.map(row => ({
      ...row,
      receipt_image_url: `/uploads/receipts/${path.basename(row.receipt_image_path)}`
    }));

    res.json({
      success: true,
      receipts
    });

  } catch (error) {
    console.error('❌ Error fetching receipts:', error);
    res.status(500).json({ error: 'Failed to fetch receipts' });
  }
});

// Verify payment receipt (Admin only)
router.post('/receipts/:id/verify', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body; // status: 'verified' or 'rejected'
    const userId = req.user.id;

    if (!['verified', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // First, ensure database constraint allows QR payment methods
    try {
      await query(`
        ALTER TABLE daybook_transactions 
        DROP CONSTRAINT IF EXISTS daybook_transactions_payment_method_check
      `);
      await query(`
        ALTER TABLE daybook_transactions 
        ADD CONSTRAINT daybook_transactions_payment_method_check 
        CHECK (payment_method IN ('cash', 'card', 'online', 'esewa', 'khalti', 'fonepay') OR payment_method IS NULL)
      `);
      
      await query(`
        ALTER TABLE daybook_transactions 
        DROP CONSTRAINT IF EXISTS daybook_transactions_transaction_type_check
      `);
      await query(`
        ALTER TABLE daybook_transactions 
        ADD CONSTRAINT daybook_transactions_transaction_type_check 
        CHECK (transaction_type IN (
          'opening_balance', 'closing_balance', 'cash_payment', 'card_payment', 'online_payment',
          'esewa_payment', 'khalti_payment', 'fonepay_payment',
          'cash_in', 'cash_handover', 'cash_returned', 'expense', 'adjustment', 'day_reopened'
        ))
      `);
    } catch (constraintError) {
      console.log('⚠️ Constraint already updated or not needed:', constraintError.message);
    }

    // Update receipt status
    const receiptResult = await query(`
      UPDATE payment_receipts 
      SET status = $1, verified_by = $2, verified_at = CURRENT_TIMESTAMP, notes = $3, updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *
    `, [status, userId, notes, id]);

    if (receiptResult.rows.length === 0) {
      return res.status(404).json({ error: 'Receipt not found' });
    }

    const receipt = receiptResult.rows[0];

    if (status === 'verified') {
      // Update order status to paid
      await query(`
        UPDATE orders 
        SET payment_status = 'paid', payment_method = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = ANY($2)
      `, [receipt.payment_method, receipt.order_ids]);

      // Get order details for payment recording
      const ordersResult = await query(`
        SELECT id, order_number, total, created_at
        FROM orders
        WHERE id = ANY($1)
      `, [receipt.order_ids]);

      // Record payment in payments table for each order
      for (const order of ordersResult.rows) {
        await query(`
          INSERT INTO payments (
            order_id, payment_method, amount, invoice_number, 
            amount_received, change_given, created_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, NOW())
        `, [
          order.id,
          receipt.payment_method,
          order.total,
          order.order_number,
          order.total, // Full amount received via QR
          0 // No change for QR payments
        ]);

        // Record in daybook transactions
        const transactionType = receipt.payment_method === 'esewa' ? 'esewa_payment' :
                               receipt.payment_method === 'khalti' ? 'khalti_payment' :
                               receipt.payment_method === 'fonepay' ? 'fonepay_payment' :
                               'online_payment';

        const daybookResult = await query(`
          INSERT INTO daybook_transactions (
            transaction_date, transaction_type, category, amount,
            description, order_id, created_at
          )
          VALUES (
            CURRENT_DATE, $1, 'sales', $2, $3, $4, NOW()
          )
          ON CONFLICT DO NOTHING
          RETURNING id
        `, [
          transactionType,
          order.total,
          `${receipt.payment_method.toUpperCase()} payment - Order #${order.order_number} - Table ${receipt.table_id}`,
          order.id
        ]);

        if (daybookResult.rowCount > 0) {
          console.log(`💰 Recorded payment: Order #${order.order_number}, ${receipt.payment_method}, NPR ${order.total}`);
        } else {
          console.log(`ℹ️  Daybook already has entry for Order #${order.order_number}, skipping duplicate`);
        }
      }

      // DO NOT auto-clear table session - let admin manually clear after payment
      // This ensures proper workflow: payment verification → admin clears table
      console.log('💳 Payment verified - table session NOT auto-cleared (admin must manually clear)')

      // Emit payment verified event
      const io = req.app.get('io');
      io.emit('paymentVerified', {
        tableId: receipt.table_id,
        receiptId: receipt.id,
        orderIds: receipt.order_ids,
        totalAmount: receipt.total_amount,
        paymentMethod: receipt.payment_method
      });

      console.log(`✅ Payment verified: Table ${receipt.table_id}, ${receipt.order_ids.length} order(s), NPR ${receipt.total_amount}`);
    }

    res.json({
      success: true,
      message: `Payment ${status} successfully`,
      receipt: {
        ...receipt,
        receipt_image_url: `/uploads/receipts/${path.basename(receipt.receipt_image_path)}`
      }
    });

  } catch (error) {
    console.error('❌ Error verifying receipt:', error);
    res.status(500).json({ error: 'Failed to verify receipt' });
  }
});

module.exports = router;