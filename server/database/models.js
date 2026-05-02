const { query, getClient, pool } = require('./config');

// Customer Model
class Customer {
  static async create(customerData) {
    const { name, phone, email } = customerData;
    const result = await query(
      'INSERT INTO customers (name, phone, email) VALUES ($1, $2, $3) RETURNING *',
      [name, phone, email]
    );
    return result.rows[0];
  }

  static async findByPhone(phone) {
    const result = await query('SELECT * FROM customers WHERE phone = $1', [phone]);
    return result.rows[0];
  }

  static async findOrCreate(customerData) {
    let customer = await this.findByPhone(customerData.phone);
    if (!customer) {
      customer = await this.create(customerData);
    }
    return customer;
  }

  static async updateStats(customerId, orderAmount) {
    await query(
      'UPDATE customers SET total_orders = total_orders + 1, total_spent = total_spent + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [orderAmount, customerId]
    );
  }

  static async addAddress(customerId, addressData) {
    const { label, address, latitude, longitude, landmark, isDefault } = addressData;
    
    // If this is default, unset other defaults
    if (isDefault) {
      await query('UPDATE customer_addresses SET is_default = false WHERE customer_id = $1', [customerId]);
    }
    
    const result = await query(
      'INSERT INTO customer_addresses (customer_id, label, address, latitude, longitude, landmark, is_default) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [customerId, label, address, latitude, longitude, landmark, isDefault]
    );
    return result.rows[0];
  }

  static async getAddresses(customerId) {
    const result = await query(
      'SELECT * FROM customer_addresses WHERE customer_id = $1 ORDER BY is_default DESC, created_at DESC',
      [customerId]
    );
    return result.rows;
  }
}

// Order Model
class Order {
  static async create(orderData) {
    const client = await getClient();
    try {
      await client.query('BEGIN');
      
      console.log('🔍 Order.create debug - tableId:', orderData.tableId, 'type:', typeof orderData.tableId);
      
      // Handle tableId without any conversion that might cause NaN
      const safeTableId = orderData.tableId;
      console.log('🔍 Raw tableId from orderData:', safeTableId, 'type:', typeof safeTableId);
      // Generate order number
      const orderNumber = await this.generateOrderNumber();
      
      console.log('🔍 All parameters for query:', [
        orderNumber, orderData.orderType, orderData.customerId, orderData.customerName,
        orderData.customerPhone, orderData.deliveryAddress, orderData.deliveryLatitude,
        orderData.deliveryLongitude, orderData.deliveryLandmark, orderData.deliveryDistance,
        orderData.deliveryFee, safeTableId, orderData.subtotal, orderData.discount,
        orderData.total, orderData.paymentMethod, orderData.notes
      ]);
      
      // Create order
      const orderResult = await client.query(`
        INSERT INTO orders (
          order_number, order_type, customer_id, customer_name, customer_phone,
          delivery_address, delivery_latitude, delivery_longitude, delivery_landmark,
          delivery_distance, delivery_fee, table_id, subtotal, discount, total,
          payment_method, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        RETURNING *
      `, [
        orderNumber, orderData.orderType, orderData.customerId, orderData.customerName,
        orderData.customerPhone, orderData.deliveryAddress, orderData.deliveryLatitude,
        orderData.deliveryLongitude, orderData.deliveryLandmark, orderData.deliveryDistance,
        orderData.deliveryFee, safeTableId, orderData.subtotal, orderData.discount,
        orderData.total, orderData.paymentMethod, orderData.notes
      ]);
      
      const order = orderResult.rows[0];
      
      // Create order items
      for (const item of orderData.items) {
        await client.query(`
          INSERT INTO order_items (
            order_id, menu_item_id, menu_item_name, menu_item_category,
            price, quantity, subtotal, special_instructions
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
          order.id, item.id, item.name, item.category,
          item.price, item.quantity, item.price * item.quantity, item.instructions
        ]);
      }
      
      // Update customer stats if customer exists
      if (orderData.customerId) {
        await client.query(
          'UPDATE customers SET total_orders = total_orders + 1, total_spent = total_spent + $1 WHERE id = $2',
          [orderData.total, orderData.customerId]
        );
      }
      
      await client.query('COMMIT');
      
      // Return complete order with items
      return await this.findById(order.id);
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async generateOrderNumber() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    
    const prefix = `FZ-${year}${month}${day}-`;
    
    // Try up to 100 times to generate a unique order number
    for (let attempt = 1; attempt <= 100; attempt++) {
      // Get today's order count and add attempt number for uniqueness
      const result = await query(
        "SELECT COUNT(*) as count FROM orders WHERE order_number LIKE $1",
        [`${prefix}%`]
      );
      
      const orderCount = parseInt(result.rows[0].count) + attempt;
      const orderNumber = `${prefix}${String(orderCount).padStart(3, '0')}`;
      
      // Check if this order number already exists
      const existingOrder = await query(
        "SELECT id FROM orders WHERE order_number = $1",
        [orderNumber]
      );
      
      if (existingOrder.rows.length === 0) {
        return orderNumber; // Found unique number
      }
    }
    
    // Fallback: use timestamp if all attempts fail
    const timestamp = Date.now().toString().slice(-6);
    return `${prefix}${timestamp}`;
  }

  static async findById(orderId) {
    const orderResult = await query('SELECT * FROM orders WHERE id = $1', [orderId]);
    if (orderResult.rows.length === 0) return null;
    
    const order = orderResult.rows[0];
    
    // Get order items
    const itemsResult = await query('SELECT * FROM order_items WHERE order_id = $1', [orderId]);
    order.items = itemsResult.rows;
    
    return order;
  }

  static async findAll(filters = {}) {
    let whereClause = '';
    let params = [];
    let paramCount = 0;
    
    if (filters.status) {
      paramCount++;
      whereClause += ` WHERE o.status = $${paramCount}`;
      params.push(filters.status);
    }
    
    if (filters.orderType) {
      paramCount++;
      whereClause += whereClause ? ` AND o.order_type = $${paramCount}` : ` WHERE o.order_type = $${paramCount}`;
      params.push(filters.orderType);
    }
    
    if (filters.tableId) {
      paramCount++;
      whereClause += whereClause ? ` AND o.table_id = $${paramCount}` : ` WHERE o.table_id = $${paramCount}`;
      params.push(filters.tableId);
    }
    
    console.log('🔍 Order.findAll SQL:', {
      whereClause,
      params,
      filters
    });
    
    const result = await query(`
      SELECT o.*, 
             COALESCE(
               JSON_AGG(
                 JSON_BUILD_OBJECT(
                   'id', oi.menu_item_id,
                   'name', oi.menu_item_name,
                   'category', oi.menu_item_category,
                   'price', oi.price,
                   'quantity', oi.quantity,
                   'subtotal', oi.subtotal,
                   'instructions', oi.special_instructions
                 ) ORDER BY oi.id
               ) FILTER (WHERE oi.id IS NOT NULL),
               '[]'::json
             ) as items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      ${whereClause}
      GROUP BY o.id
      ORDER BY o.created_at DESC
      LIMIT ${filters.limit || 100}
    `, params);
    
    console.log(`📋 Query returned ${result.rows.length} orders`);
    return result.rows;
  }

  static async findAllWithPagination(filters = {}) {
    let whereClause = '';
    let params = [];
    let paramCount = 0;
    
    // General search across multiple fields (name, phone, table, order number, dish name)
    if (filters.search) {
      paramCount++;
      const searchPattern = `%${filters.search}%`;
      whereClause += whereClause 
        ? ` AND (o.customer_name ILIKE $${paramCount} OR o.customer_phone ILIKE $${paramCount} OR o.order_number ILIKE $${paramCount} OR CAST(o.table_id AS TEXT) ILIKE $${paramCount} OR EXISTS (SELECT 1 FROM order_items oi WHERE oi.order_id = o.id AND oi.menu_item_name ILIKE $${paramCount}))`
        : ` WHERE (o.customer_name ILIKE $${paramCount} OR o.customer_phone ILIKE $${paramCount} OR o.order_number ILIKE $${paramCount} OR CAST(o.table_id AS TEXT) ILIKE $${paramCount} OR EXISTS (SELECT 1 FROM order_items oi WHERE oi.order_id = o.id AND oi.menu_item_name ILIKE $${paramCount}))`;
      params.push(searchPattern);
    }
    
    // Build WHERE clause with all filters
    if (filters.status) {
      paramCount++;
      whereClause += whereClause ? ` AND o.status = $${paramCount}` : ` WHERE o.status = $${paramCount}`;
      params.push(filters.status);
    }
    
    if (filters.orderType) {
      paramCount++;
      whereClause += whereClause ? ` AND o.order_type = $${paramCount}` : ` WHERE o.order_type = $${paramCount}`;
      params.push(filters.orderType);
    }
    
    if (filters.tableId) {
      paramCount++;
      whereClause += whereClause ? ` AND o.table_id = $${paramCount}` : ` WHERE o.table_id = $${paramCount}`;
      params.push(filters.tableId);
    }
    
    if (filters.paymentStatus) {
      paramCount++;
      whereClause += whereClause ? ` AND o.payment_status = $${paramCount}` : ` WHERE o.payment_status = $${paramCount}`;
      params.push(filters.paymentStatus);
    }
    
    if (filters.customerName) {
      paramCount++;
      whereClause += whereClause ? ` AND o.customer_name ILIKE $${paramCount}` : ` WHERE o.customer_name ILIKE $${paramCount}`;
      params.push(`%${filters.customerName}%`);
    }
    
    if (filters.customerPhone) {
      paramCount++;
      whereClause += whereClause ? ` AND o.customer_phone ILIKE $${paramCount}` : ` WHERE o.customer_phone ILIKE $${paramCount}`;
      params.push(`%${filters.customerPhone}%`);
    }
    
    if (filters.orderNumber) {
      paramCount++;
      whereClause += whereClause ? ` AND o.order_number ILIKE $${paramCount}` : ` WHERE o.order_number ILIKE $${paramCount}`;
      params.push(`%${filters.orderNumber}%`);
    }
    
    if (filters.startDate) {
      paramCount++;
      whereClause += whereClause ? ` AND o.created_at >= $${paramCount}` : ` WHERE o.created_at >= $${paramCount}`;
      params.push(filters.startDate);
    }
    
    if (filters.endDate) {
      paramCount++;
      whereClause += whereClause ? ` AND o.created_at <= $${paramCount}` : ` WHERE o.created_at <= $${paramCount}`;
      params.push(filters.endDate);
    }
    
    // Get total count
    const countResult = await query(`
      SELECT COUNT(*) as total
      FROM orders o
      ${whereClause}
    `, params);
    
    const total = parseInt(countResult.rows[0].total);
    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const offset = (page - 1) * limit;
    const totalPages = Math.ceil(total / limit);
    
    // Build ORDER BY clause
    const validSortFields = ['created_at', 'updated_at', 'total', 'customer_name', 'order_number', 'status'];
    const sortBy = validSortFields.includes(filters.sortBy) ? filters.sortBy : 'created_at';
    const sortOrder = filters.sortOrder === 'ASC' ? 'ASC' : 'DESC';
    
    // Add pagination parameters
    paramCount++;
    const limitParam = paramCount;
    params.push(limit);
    
    paramCount++;
    const offsetParam = paramCount;
    params.push(offset);
    
    console.log('🔍 Order.findAllWithPagination SQL:', {
      whereClause,
      params,
      filters,
      total,
      page,
      limit,
      offset
    });
    
    const result = await query(`
      SELECT o.*, 
             COALESCE(
               JSON_AGG(
                 JSON_BUILD_OBJECT(
                   'id', oi.menu_item_id,
                   'name', oi.menu_item_name,
                   'category', oi.menu_item_category,
                   'price', oi.price,
                   'quantity', oi.quantity,
                   'subtotal', oi.subtotal,
                   'instructions', oi.special_instructions
                 ) ORDER BY oi.id
               ) FILTER (WHERE oi.id IS NOT NULL),
               '[]'::json
             ) as items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      ${whereClause}
      GROUP BY o.id
      ORDER BY o.${sortBy} ${sortOrder}
      LIMIT $${limitParam} OFFSET $${offsetParam}
    `, params);
    
    console.log(`📋 Query returned ${result.rows.length} orders (${total} total)`);
    
    return {
      orders: result.rows,
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    };
  }

  static async updateStatus(orderId, status, completedAt = null) {
    const params = [status, orderId];
    let query_text = 'UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP';
    
    if (completedAt && (status === 'completed' || status === 'cancelled')) {
      query_text += ', completed_at = $3';
      params.push(completedAt);
    }
    
    query_text += ' WHERE id = $2 RETURNING *';
    
    const result = await query(query_text, params);
    return result.rows[0];
  }

  static async getOrderHistory(filters = {}) {
    let whereClause = "WHERE o.status IN ('completed', 'cancelled')";
    let params = [];
    let paramCount = 0;
    
    if (filters.customerPhone) {
      paramCount++;
      whereClause += ` AND o.customer_phone = $${paramCount}`;
      params.push(filters.customerPhone);
    }
    
    if (filters.startDate) {
      paramCount++;
      whereClause += ` AND o.created_at >= $${paramCount}`;
      params.push(filters.startDate);
    }
    
    if (filters.endDate) {
      paramCount++;
      whereClause += ` AND o.created_at <= $${paramCount}`;
      params.push(filters.endDate);
    }
    
    const result = await query(`
      SELECT o.*, 
             COALESCE(
               JSON_AGG(
                 JSON_BUILD_OBJECT(
                   'id', oi.menu_item_id,
                   'name', oi.menu_item_name,
                   'category', oi.menu_item_category,
                   'price', oi.price,
                   'quantity', oi.quantity,
                   'subtotal', oi.subtotal,
                   'instructions', oi.special_instructions
                 ) ORDER BY oi.id
               ) FILTER (WHERE oi.id IS NOT NULL),
               '[]'::json
             ) as items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      ${whereClause}
      GROUP BY o.id
      ORDER BY o.created_at DESC
      LIMIT ${filters.limit || 50}
    `, params);
    
    return result.rows;
  }

  static async clearTable(tableId) {
    const client = await getClient();
    try {
      await client.query('BEGIN');
      
      // Update all orders for this table to completed status
      const result = await client.query(
        'UPDATE orders SET status = $1, completed_at = CURRENT_TIMESTAMP WHERE table_id = $2 AND status != $1 RETURNING *',
        ['completed', tableId]
      );
      
      await client.query('COMMIT');
      return result.rows.length;
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Database cleanup methods for removing test data
  static async clearAllTestData() {
    const client = await getClient();
    try {
      await client.query('BEGIN');
      
      console.log('🧹 Starting database cleanup...');
      
      let deletedCounts = {
        customers: 0,
        orders: 0,
        orderItems: 0,
        addresses: 0
      };
      
      // Helper function to safely delete from table
      const safeDelete = async (tableName, displayName) => {
        try {
          const result = await client.query(`DELETE FROM ${tableName} RETURNING id`);
          const count = result.rows.length;
          console.log(`🗑️ Deleted ${count} ${displayName}`);
          return count;
        } catch (error) {
          if (error.code === '42P01') { // Table doesn't exist
            console.log(`⚠️ Table ${tableName} doesn't exist, skipping...`);
            return 0;
          }
          throw error;
        }
      };
      
      // Helper function to safely reset sequence
      const safeResetSequence = async (sequenceName) => {
        try {
          await client.query(`ALTER SEQUENCE ${sequenceName} RESTART WITH 1`);
          console.log(`🔄 Reset sequence ${sequenceName}`);
        } catch (error) {
          if (error.code === '42P01') { // Sequence doesn't exist
            console.log(`⚠️ Sequence ${sequenceName} doesn't exist, skipping...`);
          } else {
            console.error(`❌ Error resetting sequence ${sequenceName}:`, error.message);
          }
        }
      };
      
      // Delete data in correct order (respecting foreign key constraints)
      deletedCounts.orderItems = await safeDelete('order_items', 'order items');
      deletedCounts.orders = await safeDelete('orders', 'orders');
      deletedCounts.addresses = await safeDelete('customer_addresses', 'customer addresses');
      deletedCounts.customers = await safeDelete('customers', 'customers');
      
      // Reset sequences
      await safeResetSequence('customers_id_seq');
      await safeResetSequence('orders_id_seq');
      await safeResetSequence('order_items_id_seq');
      await safeResetSequence('customer_addresses_id_seq');
      
      await client.query('COMMIT');
      
      const summary = {
        customers: deletedCounts.customers,
        orders: deletedCounts.orders,
        orderItems: deletedCounts.orderItems,
        addresses: deletedCounts.addresses,
        message: 'All test data cleared successfully'
      };
      
      console.log('✅ Database cleanup completed:', summary);
      return summary;
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Database cleanup failed:', error);
      throw new Error(`Database cleanup failed: ${error.message}`);
    } finally {
      client.release();
    }
  }

  static async getDataSummary() {
    try {
      const results = await Promise.all([
        query('SELECT COUNT(*) as count FROM customers'),
        query('SELECT COUNT(*) as count FROM orders'),
        query('SELECT COUNT(*) as count FROM order_items'),
        query('SELECT COUNT(*) as count FROM customer_addresses'),
        query('SELECT COUNT(*) as count FROM orders WHERE status = $1', ['completed']),
        query('SELECT COUNT(*) as count FROM orders WHERE status != $1', ['completed'])
      ]);

      return {
        customers: parseInt(results[0].rows[0].count),
        totalOrders: parseInt(results[1].rows[0].count),
        orderItems: parseInt(results[2].rows[0].count),
        addresses: parseInt(results[3].rows[0].count),
        completedOrders: parseInt(results[4].rows[0].count),
        activeOrders: parseInt(results[5].rows[0].count)
      };
    } catch (error) {
      console.error('Error getting data summary:', error);
      throw error;
    }
  }
}

// Settings Model
class Settings {
  static async get(key) {
    const result = await query('SELECT setting_value FROM restaurant_settings WHERE setting_key = $1', [key]);
    return result.rows[0]?.setting_value;
  }

  static async set(key, value, description = null) {
    const result = await query(`
      INSERT INTO restaurant_settings (setting_key, setting_value, description)
      VALUES ($1, $2, $3)
      ON CONFLICT (setting_key) 
      DO UPDATE SET setting_value = $2, description = COALESCE($3, restaurant_settings.description), updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `, [key, value, description]);
    return result.rows[0];
  }

  static async getAll() {
    const result = await query('SELECT * FROM restaurant_settings ORDER BY setting_key');
    return result.rows;
  }
}

// Delivery Zone Model
class DeliveryZone {
  static async findAll() {
    const result = await query('SELECT * FROM delivery_zones WHERE active = true ORDER BY max_distance');
    return result.rows;
  }

  static async findByDistance(distance) {
    const result = await query(
      'SELECT * FROM delivery_zones WHERE active = true AND max_distance >= $1 ORDER BY max_distance LIMIT 1',
      [distance]
    );
    return result.rows[0];
  }

  static async create(zoneData) {
    const { name, description, deliveryFee, estimatedTime, maxDistance, minOrderAmount } = zoneData;
    const result = await query(`
      INSERT INTO delivery_zones (name, description, delivery_fee, estimated_time, max_distance, min_order_amount)
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
    `, [name, description, deliveryFee, estimatedTime, maxDistance, minOrderAmount]);
    return result.rows[0];
  }
}

// Table Session Management Class
class TableSession {
  // Create new table session when customer scans QR
  static async createSession(tableId, customerName, customerPhone) {
    try {
      console.log(`🍽️ Creating table session for table ${tableId}, customer: ${customerName}`);
      
      // Check if table is already occupied
      const existingSession = await this.getActiveSession(tableId);
      if (existingSession) {
        throw new Error(`Table ${tableId} is already occupied`);
      }

      const query = `
        INSERT INTO table_sessions (table_id, customer_name, customer_phone, status)
        VALUES ($1, $2, $3, 'occupied')
        RETURNING *
      `;
      
      const result = await pool.query(query, [tableId, customerName, customerPhone]);
      console.log(`✅ Table session created:`, result.rows[0]);
      return result.rows[0];
    } catch (error) {
      console.error('❌ Error creating table session:', error);
      throw error;
    }
  }

  // Get active session for a table
  static async getActiveSession(tableId) {
    try {
      const query = `
        SELECT * FROM table_sessions 
        WHERE table_id = $1 AND status NOT IN ('completed', 'cleared')
        ORDER BY session_start DESC
        LIMIT 1
      `;
      
      const result = await pool.query(query, [tableId]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('❌ Error getting active session:', error);
      throw error;
    }
  }

  // Get all table statuses for admin dashboard
  static async getAllTableStatuses() {
    try {
      // First get active table sessions
      const sessionQuery = `
        SELECT 
          t.table_id,
          t.customer_name,
          t.customer_phone,
          t.session_start,
          t.status,
          t.total_amount,
          t.payment_status,
          EXTRACT(EPOCH FROM (NOW() - t.session_start))/3600 as hours_occupied,
          0 as order_count
        FROM table_sessions t
        WHERE t.status NOT IN ('completed', 'cleared')
        ORDER BY t.table_id
      `;
      
      // Skip order query for now to avoid casting issues
      const orderQuery = `
        SELECT 
          1 as table_id,
          'No Orders' as customer_name,
          '' as customer_phone,
          NOW() as session_start,
          'available' as status,
          0 as total_amount,
          'unpaid' as payment_status,
          0 as hours_occupied,
          0 as order_count
        WHERE FALSE
      `;
      
      const [sessionResult, orderResult] = await Promise.all([
        pool.query(sessionQuery),
        pool.query(orderQuery)
      ]);
      
      // Create array for all 25 tables
      const allTables = [];
      for (let i = 1; i <= 25; i++) {
        const sessionData = sessionResult.rows.find(row => row.table_id === i);
        const orderData = orderResult.rows.find(row => row.table_id === i);
        
        // Prioritize session data over order data
        const tableData = sessionData || orderData;
        
        allTables.push({
          table_id: i,
          status: tableData ? tableData.status : 'empty',
          customer_name: tableData?.customer_name || null,
          customer_phone: tableData?.customer_phone || null,
          session_start: tableData?.session_start || null,
          hours_occupied: tableData?.hours_occupied || 0,
          total_amount: parseFloat(tableData?.total_amount || 0),
          payment_status: tableData?.payment_status || 'unpaid',
          order_count: parseInt(tableData?.order_count || 0)
        });
      }
      
      return allTables;
    } catch (error) {
      console.error('❌ Error getting table statuses:', error);
      throw error;
    }
  }

  // Update table session status
  static async updateSessionStatus(tableId, status, totalAmount = null) {
    try {
      let query = `
        UPDATE table_sessions 
        SET status = $1, updated_at = CURRENT_TIMESTAMP
      `;
      let params = [status];
      
      if (totalAmount !== null) {
        query += `, total_amount = $${params.length + 1}`;
        params.push(totalAmount);
      }
      
      query += ` WHERE table_id = $${params.length + 1} AND status NOT IN ('completed', 'cleared') RETURNING *`;
      params.push(tableId);
      
      const result = await pool.query(query, params);
      return result.rows[0];
    } catch (error) {
      console.error('❌ Error updating session status:', error);
      throw error;
    }
  }

  // Clear table session
  static async clearSession(tableId) {
    try {
      console.log(`🧹 Clearing table session for table ${tableId}`);
      
      const query = `
        UPDATE table_sessions 
        SET status = 'cleared', session_end = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE table_id = $1 AND status NOT IN ('completed', 'cleared')
        RETURNING *
      `;
      
      const result = await pool.query(query, [tableId]);
      console.log(`✅ Table session cleared:`, result.rows[0]);
      return result.rows[0];
    } catch (error) {
      console.error('❌ Error clearing table session:', error);
      throw error;
    }
  }

  // Get session history for a table
  static async getSessionHistory(tableId, limit = 10) {
    try {
      const query = `
        SELECT 
          ts.*,
          COUNT(o.id) as order_count,
          COALESCE(SUM(tp.amount), 0) as total_paid
        FROM table_sessions ts
        LEFT JOIN orders o ON ts.id = o.table_session_id
        LEFT JOIN table_payments tp ON ts.id = tp.table_session_id AND tp.payment_status = 'completed'
        WHERE ts.table_id = $1
        GROUP BY ts.id
        ORDER BY ts.session_start DESC
        LIMIT $2
      `;
      
      const result = await pool.query(query, [tableId, limit]);
      return result.rows;
    } catch (error) {
      console.error('❌ Error getting session history:', error);
      throw error;
    }
  }
}

// Table Payment Management Class
class TablePayment {
  // Create payment record
  static async createPayment(tableSessionId, amount, paymentMethod, transactionId = null) {
    try {
      console.log(`💳 Creating payment for session ${tableSessionId}, amount: $${amount}`);
      
      const query = `
        INSERT INTO table_payments (table_session_id, amount, payment_method, transaction_id, payment_status)
        VALUES ($1, $2, $3, $4, 'pending')
        RETURNING *
      `;
      
      const result = await pool.query(query, [tableSessionId, amount, paymentMethod, transactionId]);
      console.log(`✅ Payment record created:`, result.rows[0]);
      return result.rows[0];
    } catch (error) {
      console.error('❌ Error creating payment:', error);
      throw error;
    }
  }

  // Update payment status
  static async updatePaymentStatus(paymentId, status, gatewayResponse = null) {
    try {
      let query = `
        UPDATE table_payments 
        SET payment_status = $1, updated_at = CURRENT_TIMESTAMP
      `;
      let params = [status];
      
      if (status === 'completed') {
        query += `, processed_at = CURRENT_TIMESTAMP`;
      }
      
      if (gatewayResponse) {
        query += `, gateway_response = $${params.length + 1}`;
        params.push(JSON.stringify(gatewayResponse));
      }
      
      query += ` WHERE id = $${params.length + 1} RETURNING *`;
      params.push(paymentId);
      
      const result = await pool.query(query, params);
      return result.rows[0];
    } catch (error) {
      console.error('❌ Error updating payment status:', error);
      throw error;
    }
  }

  // Get payments for a table session
  static async getSessionPayments(tableSessionId) {
    try {
      const query = `
        SELECT * FROM table_payments 
        WHERE table_session_id = $1 
        ORDER BY created_at DESC
      `;
      
      const result = await pool.query(query, [tableSessionId]);
      return result.rows;
    } catch (error) {
      console.error('❌ Error getting session payments:', error);
      throw error;
    }
  }
}

module.exports = {
  Customer,
  Order,
  Settings,
  DeliveryZone,
  TableSession,
  TablePayment
};
