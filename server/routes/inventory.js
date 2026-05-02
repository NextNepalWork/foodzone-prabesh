const express = require('express');
const router = express.Router();
const { query } = require('../database/config');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// ==================== INGREDIENTS ROUTES ====================

// Get all ingredients
router.get('/ingredients', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { category, status, search } = req.query;
    
    let queryText = `
      SELECT i.*,
        CASE 
          WHEN i.current_stock = 0 THEN 'out_of_stock'
          WHEN i.current_stock <= i.minimum_stock THEN 'critical'
          WHEN i.current_stock <= i.reorder_point THEN 'low'
          ELSE 'good'
        END as stock_status,
        (SELECT COUNT(*) FROM recipe_ingredients WHERE ingredient_id = i.id) as used_in_recipes
      FROM ingredients i
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 1;
    
    if (category) {
      queryText += ` AND i.category = $${paramCount}`;
      params.push(category);
      paramCount++;
    }
    
    if (status === 'active') {
      queryText += ` AND i.is_active = true`;
    } else if (status === 'inactive') {
      queryText += ` AND i.is_active = false`;
    }
    
    if (search) {
      queryText += ` AND (i.name ILIKE $${paramCount} OR i.supplier_name ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }
    
    queryText += ` ORDER BY i.name ASC`;
    
    const result = await query(queryText, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching ingredients:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get single ingredient
router.get('/ingredients/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await query(`
      SELECT i.*,
        CASE 
          WHEN i.current_stock = 0 THEN 'out_of_stock'
          WHEN i.current_stock <= i.minimum_stock THEN 'critical'
          WHEN i.current_stock <= i.reorder_point THEN 'low'
          ELSE 'good'
        END as stock_status
      FROM ingredients i
      WHERE i.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Ingredient not found' });
    }
    
    // Get recipes using this ingredient
    const recipes = await query(`
      SELECT ri.*, m.name as menu_item_name, m.category
      FROM recipe_ingredients ri
      JOIN menu_items m ON m.id = ri.menu_item_id
      WHERE ri.ingredient_id = $1
    `, [id]);
    
    res.json({ 
      success: true, 
      data: { 
        ...result.rows[0],
        used_in_recipes: recipes.rows
      }
    });
  } catch (error) {
    console.error('Error fetching ingredient:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create new ingredient
router.post('/ingredients', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const {
      name, category, current_stock, minimum_stock, reorder_point,
      unit, cost_per_unit, supplier_name, supplier_contact,
      expiry_date, storage_location, notes
    } = req.body;
    
    const result = await query(`
      INSERT INTO ingredients (
        name, category, current_stock, minimum_stock, reorder_point,
        unit, cost_per_unit, supplier_name, supplier_contact,
        expiry_date, storage_location, notes, last_restocked_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP)
      RETURNING *
    `, [
      name, category, current_stock || 0, minimum_stock || 10, reorder_point || 20,
      unit || 'kg', cost_per_unit || 0, supplier_name, supplier_contact,
      expiry_date, storage_location, notes
    ]);
    
    // Log transaction
    await query(`
      INSERT INTO inventory_transactions (
        transaction_type, ingredient_id, ingredient_quantity_change,
        ingredient_quantity_before, ingredient_quantity_after,
        reference_type, notes, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      'ingredient_restock', result.rows[0].id, current_stock || 0,
      0, current_stock || 0, 'manual', 'Initial stock', req.user?.username || 'admin'
    ]);
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error creating ingredient:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update ingredient
router.put('/ingredients/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name, category, minimum_stock, reorder_point, unit, cost_per_unit,
      supplier_name, supplier_contact, expiry_date, storage_location, notes, is_active
    } = req.body;
    
    const result = await query(`
      UPDATE ingredients SET
        name = COALESCE($1, name),
        category = COALESCE($2, category),
        minimum_stock = COALESCE($3, minimum_stock),
        reorder_point = COALESCE($4, reorder_point),
        unit = COALESCE($5, unit),
        cost_per_unit = COALESCE($6, cost_per_unit),
        supplier_name = COALESCE($7, supplier_name),
        supplier_contact = COALESCE($8, supplier_contact),
        expiry_date = COALESCE($9, expiry_date),
        storage_location = COALESCE($10, storage_location),
        notes = COALESCE($11, notes),
        is_active = COALESCE($12, is_active),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $13
      RETURNING *
    `, [
      name, category, minimum_stock, reorder_point, unit, cost_per_unit,
      supplier_name, supplier_contact, expiry_date, storage_location, notes, is_active, id
    ]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Ingredient not found' });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error updating ingredient:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Adjust ingredient stock (restock, waste, adjustment)
router.post('/ingredients/:id/adjust-stock', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { adjustment_type, quantity, notes } = req.body;
    
    // Get current stock
    const current = await query('SELECT current_stock FROM ingredients WHERE id = $1', [id]);
    if (current.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Ingredient not found' });
    }
    
    const currentStock = parseFloat(current.rows[0].current_stock);
    let newStock;
    let transactionType;
    
    switch (adjustment_type) {
      case 'restock':
        newStock = currentStock + parseFloat(quantity);
        transactionType = 'ingredient_restock';
        break;
      case 'waste':
        newStock = currentStock - parseFloat(quantity);
        transactionType = 'waste';
        break;
      case 'expired':
        newStock = currentStock - parseFloat(quantity);
        transactionType = 'expired';
        break;
      case 'adjustment':
        newStock = parseFloat(quantity); // Set to exact amount
        transactionType = 'adjustment';
        break;
      default:
        return res.status(400).json({ success: false, error: 'Invalid adjustment type' });
    }
    
    // Update stock
    const result = await query(`
      UPDATE ingredients 
      SET current_stock = $1, 
          last_restocked_at = CASE WHEN $3 = 'ingredient_restock' THEN CURRENT_TIMESTAMP ELSE last_restocked_at END,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `, [newStock, id, transactionType]);
    
    // Log transaction
    await query(`
      INSERT INTO inventory_transactions (
        transaction_type, ingredient_id, ingredient_quantity_change,
        ingredient_quantity_before, ingredient_quantity_after,
        reference_type, notes, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      transactionType, id, newStock - currentStock,
      currentStock, newStock, 'manual', notes, req.user?.username || 'admin'
    ]);
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error adjusting stock:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete ingredient
router.delete('/ingredients/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if ingredient is used in any recipes
    const recipes = await query('SELECT COUNT(*) as count FROM recipe_ingredients WHERE ingredient_id = $1', [id]);
    if (parseInt(recipes.rows[0].count) > 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Cannot delete ingredient that is used in recipes. Remove from recipes first.' 
      });
    }
    
    await query('DELETE FROM ingredients WHERE id = $1', [id]);
    res.json({ success: true, message: 'Ingredient deleted successfully' });
  } catch (error) {
    console.error('Error deleting ingredient:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== RECIPE INGREDIENTS ROUTES ====================

// Get recipe for a menu item
router.get('/recipes/:menuItemId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { menuItemId } = req.params;
    
    const result = await query(`
      SELECT ri.*, i.name as ingredient_name, i.unit as ingredient_unit,
             i.current_stock, i.cost_per_unit,
             (ri.quantity_required * i.cost_per_unit) as ingredient_cost
      FROM recipe_ingredients ri
      JOIN ingredients i ON i.id = ri.ingredient_id
      WHERE ri.menu_item_id = $1
      ORDER BY i.name
    `, [menuItemId]);
    
    const totalCost = result.rows.reduce((sum, row) => sum + parseFloat(row.ingredient_cost || 0), 0);
    
    res.json({ 
      success: true, 
      data: {
        ingredients: result.rows,
        total_cost: totalCost.toFixed(2)
      }
    });
  } catch (error) {
    console.error('Error fetching recipe:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Add ingredient to recipe
router.post('/recipes/:menuItemId/ingredients', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { menuItemId } = req.params;
    const { ingredient_id, quantity_required, unit, notes } = req.body;
    
    const result = await query(`
      INSERT INTO recipe_ingredients (menu_item_id, ingredient_id, quantity_required, unit, notes)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (menu_item_id, ingredient_id) 
      DO UPDATE SET quantity_required = $3, unit = $4, notes = $5, updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `, [menuItemId, ingredient_id, quantity_required, unit, notes]);
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error adding ingredient to recipe:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update recipe ingredient
router.put('/recipes/:menuItemId/ingredients/:ingredientId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { menuItemId, ingredientId } = req.params;
    const { quantity_required, unit, notes } = req.body;
    
    const result = await query(`
      UPDATE recipe_ingredients 
      SET quantity_required = COALESCE($1, quantity_required),
          unit = COALESCE($2, unit),
          notes = COALESCE($3, notes),
          updated_at = CURRENT_TIMESTAMP
      WHERE menu_item_id = $4 AND ingredient_id = $5
      RETURNING *
    `, [quantity_required, unit, notes, menuItemId, ingredientId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Recipe ingredient not found' });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error updating recipe ingredient:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Remove ingredient from recipe
router.delete('/recipes/:menuItemId/ingredients/:ingredientId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { menuItemId, ingredientId } = req.params;
    
    await query('DELETE FROM recipe_ingredients WHERE menu_item_id = $1 AND ingredient_id = $2', [menuItemId, ingredientId]);
    res.json({ success: true, message: 'Ingredient removed from recipe' });
  } catch (error) {
    console.error('Error removing ingredient from recipe:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== ALERTS ROUTES ====================

// Get all alerts
router.get('/alerts', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { status, priority, item_type } = req.query;
    
    let queryText = `
      SELECT a.*,
        i.name as ingredient_name,
        i.unit as ingredient_unit,
        m.name as menu_item_name
      FROM inventory_alerts a
      LEFT JOIN ingredients i ON i.id = a.ingredient_id
      LEFT JOIN menu_items m ON m.id = a.menu_item_id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 1;
    
    if (status) {
      queryText += ` AND a.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }
    
    if (priority) {
      queryText += ` AND a.priority = $${paramCount}`;
      params.push(priority);
      paramCount++;
    }
    
    if (item_type) {
      queryText += ` AND a.item_type = $${paramCount}`;
      params.push(item_type);
      paramCount++;
    }
    
    queryText += ` ORDER BY 
      CASE a.priority 
        WHEN 'critical' THEN 1 
        WHEN 'high' THEN 2 
        WHEN 'medium' THEN 3 
        ELSE 4 
      END,
      a.created_at DESC
    `;
    
    const result = await query(queryText, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Acknowledge alert
router.post('/alerts/:id/acknowledge', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await query(`
      UPDATE inventory_alerts 
      SET status = 'acknowledged',
          acknowledged_by = $1,
          acknowledged_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `, [req.user?.username || 'admin', id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Alert not found' });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error acknowledging alert:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Resolve alert
router.post('/alerts/:id/resolve', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await query(`
      UPDATE inventory_alerts 
      SET status = 'resolved',
          resolved_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Alert not found' });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error resolving alert:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== TRANSACTIONS/HISTORY ROUTES ====================

// Get transaction history
router.get('/transactions', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { type, start_date, end_date, limit = 100 } = req.query;
    
    let queryText = `
      SELECT t.*,
        i.name as ingredient_name,
        m.name as menu_item_name
      FROM inventory_transactions t
      LEFT JOIN ingredients i ON i.id = t.ingredient_id
      LEFT JOIN menu_items m ON m.id = t.menu_item_id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 1;
    
    if (type) {
      queryText += ` AND t.transaction_type = $${paramCount}`;
      params.push(type);
      paramCount++;
    }
    
    if (start_date) {
      queryText += ` AND t.created_at >= $${paramCount}`;
      params.push(start_date);
      paramCount++;
    }
    
    if (end_date) {
      queryText += ` AND t.created_at <= $${paramCount}`;
      params.push(end_date);
      paramCount++;
    }
    
    queryText += ` ORDER BY t.created_at DESC LIMIT $${paramCount}`;
    params.push(limit);
    
    const result = await query(queryText, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== DASHBOARD/STATS ROUTES ====================

// Get inventory dashboard stats
router.get('/dashboard', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Total ingredients
    const totalIngredients = await query('SELECT COUNT(*) as count FROM ingredients WHERE is_active = true');
    
    // Low stock count
    const lowStock = await query(`
      SELECT COUNT(*) as count FROM ingredients 
      WHERE current_stock <= reorder_point AND is_active = true
    `);
    
    // Out of stock count
    const outOfStock = await query(`
      SELECT COUNT(*) as count FROM ingredients 
      WHERE current_stock = 0 AND is_active = true
    `);
    
    // Active alerts
    const activeAlerts = await query(`
      SELECT COUNT(*) as count FROM inventory_alerts WHERE status = 'active'
    `);
    
    // Total inventory value
    const inventoryValue = await query(`
      SELECT SUM(current_stock * cost_per_unit) as total_value FROM ingredients WHERE is_active = true
    `);
    
    // Recent transactions (last 7 days)
    const recentTransactions = await query(`
      SELECT COUNT(*) as count FROM inventory_transactions 
      WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
    `);
    
    // Expiring soon (next 7 days)
    const expiringSoon = await query(`
      SELECT COUNT(*) as count FROM ingredients 
      WHERE expiry_date IS NOT NULL 
      AND expiry_date <= CURRENT_DATE + INTERVAL '7 days'
      AND expiry_date >= CURRENT_DATE
      AND is_active = true
    `);
    
    // Top 10 low stock items
    const topLowStock = await query(`
      SELECT name, current_stock, minimum_stock, reorder_point, unit,
        CASE 
          WHEN current_stock = 0 THEN 'out_of_stock'
          WHEN current_stock <= minimum_stock THEN 'critical'
          WHEN current_stock <= reorder_point THEN 'low'
          ELSE 'good'
        END as status
      FROM ingredients
      WHERE current_stock <= reorder_point AND is_active = true
      ORDER BY current_stock ASC
      LIMIT 10
    `);
    
    res.json({
      success: true,
      data: {
        total_ingredients: parseInt(totalIngredients.rows[0].count),
        low_stock_count: parseInt(lowStock.rows[0].count),
        out_of_stock_count: parseInt(outOfStock.rows[0].count),
        active_alerts: parseInt(activeAlerts.rows[0].count),
        total_inventory_value: parseFloat(inventoryValue.rows[0].total_value || 0).toFixed(2),
        recent_transactions: parseInt(recentTransactions.rows[0].count),
        expiring_soon: parseInt(expiringSoon.rows[0].count),
        top_low_stock_items: topLowStock.rows
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get ingredient categories
router.get('/categories', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await query(`
      SELECT category, COUNT(*) as count
      FROM ingredients
      WHERE is_active = true
      GROUP BY category
      ORDER BY category
    `);
    
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
