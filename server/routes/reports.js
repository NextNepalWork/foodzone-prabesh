/**
 * Reports & Analytics API
 *
 * Single source of truth for Dashboard, Reports tab, and Daybook.
 * All date-filtered endpoints resolve ranges the same way so the three
 * views always agree numerically.
 *
 * Conventions
 * ─────────────
 * • All range-aware endpoints accept:   ?range=<preset>  OR  ?from=YYYY-MM-DD&to=YYYY-MM-DD
 * • Revenue / KPI endpoints use the orders table, filtered by payment_status='paid'
 *   and status <> 'cancelled', joined on created_at::date BETWEEN start AND end.
 * • Expenses / cash-flow endpoints use daybook_transactions.transaction_date.
 * • Every KPI returns { value, change } so the client can render trend pills
 *   without additional calls. change is pct vs previous equal-length period.
 */

const express = require('express');
const router = express.Router();
const { query } = require('../database/config');
const { authenticateToken } = require('../middleware/auth');

/* ─────────────── Date helpers ─────────────── */
const PRESETS = new Set([
  'today', 'yesterday', '7d', '30d', '90d',
  'month', 'lastmonth', 'year', 'all', 'custom',
]);

const iso = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
};

const addDays = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

/**
 * Resolve a range into { start, end, prevStart, prevEnd, days, preset }.
 * start/end are ISO 'YYYY-MM-DD' strings (inclusive).
 * prev* is a same-length period immediately before, for trend %-change.
 */
function resolveRange(queryObj) {
  const { range, from, to } = queryObj || {};
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let start, end;
  const preset = (from && to) ? 'custom' : (PRESETS.has(range) ? range : '30d');

  if (from && to) {
    start = new Date(from); start.setHours(0, 0, 0, 0);
    end = new Date(to);     end.setHours(0, 0, 0, 0);
  } else {
    switch (preset) {
      case 'today':
        start = today; end = today; break;
      case 'yesterday':
        start = addDays(today, -1); end = addDays(today, -1); break;
      case '7d':
        start = addDays(today, -6); end = today; break;
      case '30d':
        start = addDays(today, -29); end = today; break;
      case '90d':
        start = addDays(today, -89); end = today; break;
      case 'month':
        start = new Date(today.getFullYear(), today.getMonth(), 1); end = today; break;
      case 'lastmonth':
        start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        end   = new Date(today.getFullYear(), today.getMonth(), 0); break;
      case 'year':
        start = new Date(today.getFullYear(), 0, 1); end = today; break;
      case 'all':
        start = new Date(2020, 0, 1); end = today; break;
      default:
        start = addDays(today, -29); end = today;
    }
  }

  if (end < start) { const t = end; end = start; start = t; }

  const days = Math.max(1, Math.round((end - start) / (24 * 3600 * 1000)) + 1);
  const prevEnd   = addDays(start, -1);
  const prevStart = addDays(prevEnd, -(days - 1));

  return {
    start: iso(start), end: iso(end),
    prevStart: iso(prevStart), prevEnd: iso(prevEnd),
    days, preset,
  };
}

/** Percentage change. Returns 0 if prev is 0 (avoid Infinity). */
const pct = (cur, prev) => {
  const p = Number(prev || 0);
  const c = Number(cur || 0);
  if (p === 0) return c === 0 ? 0 : 100;
  return ((c - p) / p) * 100;
};

/** Build {value, change} KPI from current + previous row. */
const kpi = (curRow, prevRow, field) => ({
  value: Number(curRow?.[field] || 0),
  change: pct(curRow?.[field], prevRow?.[field]),
});

/** Safe CSV cell quoting. */
const csvCell = (v) => {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
};
const toCsv = (headers, rows) =>
  [headers.join(','), ...rows.map(r => r.map(csvCell).join(','))].join('\n');

/* ─────────────── Shared order filter SQL ─────────────── */
// Revenue-relevant orders only. Cancelled orders are excluded.
// Unpaid orders (payment_status != 'paid') are excluded from revenue;
// they are still included in "gross/all orders" metrics when noted.
const REV_FILTER = `payment_status = 'paid' AND (status IS NULL OR status <> 'cancelled')`;

/* =====================================================================
   GET /api/reports/summary
   The UNIFIED endpoint. Dashboard, Reports Overview, and Daybook-level
   KPIs all read from here so the three views are numerically identical.
   ===================================================================== */
router.get('/summary', authenticateToken, async (req, res) => {
  try {
    const r = resolveRange(req.query);

    // ── Current period ─────────────────────────────────────────────
    const curR = await query(`
      SELECT
        COUNT(*) FILTER (WHERE ${REV_FILTER})::int                                  AS paid_orders,
        COUNT(*)::int                                                               AS total_orders,
        COUNT(*) FILTER (WHERE status = 'completed')::int                           AS completed_orders,
        COUNT(*) FILTER (WHERE status = 'cancelled')::int                           AS cancelled_orders,
        COUNT(*) FILTER (WHERE status IN ('pending','preparing','ready'))::int      AS active_orders,
        COALESCE(SUM(total) FILTER (WHERE ${REV_FILTER}), 0)::numeric               AS revenue,
        COALESCE(AVG(total) FILTER (WHERE ${REV_FILTER}), 0)::numeric               AS aov,
        COALESCE(SUM(discount) FILTER (WHERE ${REV_FILTER}), 0)::numeric            AS discount,
        COALESCE(SUM(delivery_fee) FILTER (WHERE ${REV_FILTER}), 0)::numeric        AS delivery_fees,
        COALESCE(SUM(CASE WHEN order_type='dine-in' THEN total END)
                 FILTER (WHERE ${REV_FILTER}), 0)::numeric                          AS dine_in_revenue,
        COALESCE(SUM(CASE WHEN order_type='delivery' THEN total END)
                 FILTER (WHERE ${REV_FILTER}), 0)::numeric                          AS delivery_revenue,
        COUNT(DISTINCT COALESCE(customer_phone, customer_id::text))::int             AS unique_customers
      FROM orders
      WHERE created_at::date BETWEEN $1 AND $2
    `, [r.start, r.end]);

    // ── Previous equal-length period (for %-change) ──────────────
    const prvR = await query(`
      SELECT
        COUNT(*) FILTER (WHERE ${REV_FILTER})::int                                  AS paid_orders,
        COUNT(*)::int                                                               AS total_orders,
        COUNT(*) FILTER (WHERE status = 'completed')::int                           AS completed_orders,
        COALESCE(SUM(total) FILTER (WHERE ${REV_FILTER}), 0)::numeric               AS revenue,
        COALESCE(AVG(total) FILTER (WHERE ${REV_FILTER}), 0)::numeric               AS aov,
        COALESCE(SUM(discount) FILTER (WHERE ${REV_FILTER}), 0)::numeric            AS discount,
        COALESCE(SUM(delivery_fee) FILTER (WHERE ${REV_FILTER}), 0)::numeric        AS delivery_fees,
        COALESCE(SUM(CASE WHEN order_type='dine-in' THEN total END)
                 FILTER (WHERE ${REV_FILTER}), 0)::numeric                          AS dine_in_revenue,
        COALESCE(SUM(CASE WHEN order_type='delivery' THEN total END)
                 FILTER (WHERE ${REV_FILTER}), 0)::numeric                          AS delivery_revenue,
        COUNT(DISTINCT COALESCE(customer_phone, customer_id::text))::int             AS unique_customers
      FROM orders
      WHERE created_at::date BETWEEN $1 AND $2
    `, [r.prevStart, r.prevEnd]);

    const cur = curR.rows[0] || {};
    const prv = prvR.rows[0] || {};

    // ── Daily trend ─────────────────────────────────────────────
    const trendR = await query(`
      WITH days AS (
        SELECT generate_series($1::date, $2::date, '1 day')::date AS d
      )
      SELECT
        days.d::text                                                           AS bucket,
        COALESCE(COUNT(o.id) FILTER (WHERE ${REV_FILTER}), 0)::int             AS orders,
        COALESCE(SUM(o.total) FILTER (WHERE ${REV_FILTER}), 0)::numeric        AS revenue
      FROM days
      LEFT JOIN orders o ON o.created_at::date = days.d
      GROUP BY days.d
      ORDER BY days.d
    `, [r.start, r.end]);

    // ── Payment mix (orders table) ──────────────────────────────
    const payR = await query(`
      SELECT COALESCE(NULLIF(payment_method,''), 'unknown') AS method,
             COUNT(*)::int                                  AS count,
             COALESCE(SUM(total), 0)::numeric               AS amount
      FROM orders
      WHERE created_at::date BETWEEN $1 AND $2 AND ${REV_FILTER}
      GROUP BY 1
      ORDER BY amount DESC
    `, [r.start, r.end]);

    // ── Order type mix ──────────────────────────────────────────
    const typR = await query(`
      SELECT COALESCE(NULLIF(order_type,''), 'unknown') AS type,
             COUNT(*)::int                             AS count,
             COALESCE(SUM(total), 0)::numeric          AS revenue
      FROM orders
      WHERE created_at::date BETWEEN $1 AND $2 AND ${REV_FILTER}
      GROUP BY 1
      ORDER BY revenue DESC
    `, [r.start, r.end]);

    // ── Expenses from daybook ───────────────────────────────────
    const expR = await query(`
      SELECT COALESCE(SUM(amount), 0)::numeric AS total,
             COUNT(*)::int                     AS count
      FROM daybook_transactions
      WHERE transaction_type = 'expense'
        AND transaction_date BETWEEN $1 AND $2
    `, [r.start, r.end]);
    const prvExpR = await query(`
      SELECT COALESCE(SUM(amount), 0)::numeric AS total
      FROM daybook_transactions
      WHERE transaction_type = 'expense'
        AND transaction_date BETWEEN $1 AND $2
    `, [r.prevStart, r.prevEnd]);

    const revenue = Number(cur.revenue);
    const expenses = Number(expR.rows[0].total);
    const netProfit = revenue - expenses;
    const prevNetProfit = Number(prv.revenue || 0) - Number(prvExpR.rows[0].total || 0);
    const completionRate = cur.paid_orders > 0
      ? Math.round((Number(cur.completed_orders || 0) / Number(cur.paid_orders)) * 100)
      : 0;

    res.json({
      range: r,
      kpis: {
        revenue:         kpi(cur, prv, 'revenue'),
        orders:          { value: Number(cur.paid_orders || 0), change: pct(cur.paid_orders, prv.paid_orders) },
        totalOrders:     { value: Number(cur.total_orders || 0), change: pct(cur.total_orders, prv.total_orders) },
        aov:             kpi(cur, prv, 'aov'),
        uniqueCustomers: kpi(cur, prv, 'unique_customers'),
        dineInRevenue:   kpi(cur, prv, 'dine_in_revenue'),
        deliveryRevenue: kpi(cur, prv, 'delivery_revenue'),
        discount:        kpi(cur, prv, 'discount'),
        deliveryFees:    kpi(cur, prv, 'delivery_fees'),
        expenses:        { value: expenses, change: pct(expenses, prvExpR.rows[0].total) },
        netProfit:       { value: netProfit, change: pct(netProfit, prevNetProfit) },
        completionRate,
        activeOrders:    Number(cur.active_orders || 0),
        cancelledOrders: Number(cur.cancelled_orders || 0),
      },
      trend: trendR.rows,
      paymentMix: payR.rows,
      orderTypeMix: typR.rows,
    });
  } catch (error) {
    console.error('Error /reports/summary:', error);
    res.status(500).json({ error: 'Failed to fetch summary', details: error.message });
  }
});

/* =====================================================================
   GET /api/reports/overview
   Legacy shape kept for ReportsManagement.jsx OverviewPanel which
   reads { kpis.totalRevenue.{value,change}, ... }.
   Internally identical to /summary.
   ===================================================================== */
router.get('/overview', authenticateToken, async (req, res) => {
  try {
    const r = resolveRange(req.query);

    const curR = await query(`
      SELECT
        COUNT(*) FILTER (WHERE ${REV_FILTER})::int                            AS orders,
        COUNT(*) FILTER (WHERE status = 'completed')::int                     AS completed,
        COALESCE(SUM(total) FILTER (WHERE ${REV_FILTER}), 0)::numeric         AS revenue,
        COALESCE(AVG(total) FILTER (WHERE ${REV_FILTER}), 0)::numeric         AS aov,
        COALESCE(SUM(discount) FILTER (WHERE ${REV_FILTER}), 0)::numeric      AS discount,
        COALESCE(SUM(CASE WHEN order_type='dine-in' THEN total END)
                 FILTER (WHERE ${REV_FILTER}), 0)::numeric                    AS dine_in,
        COALESCE(SUM(CASE WHEN order_type='delivery' THEN total END)
                 FILTER (WHERE ${REV_FILTER}), 0)::numeric                    AS delivery,
        COUNT(DISTINCT COALESCE(customer_phone, customer_id::text))::int       AS unique_customers
      FROM orders
      WHERE created_at::date BETWEEN $1 AND $2
    `, [r.start, r.end]);

    const prvR = await query(`
      SELECT
        COUNT(*) FILTER (WHERE ${REV_FILTER})::int                            AS orders,
        COALESCE(SUM(total) FILTER (WHERE ${REV_FILTER}), 0)::numeric         AS revenue,
        COALESCE(AVG(total) FILTER (WHERE ${REV_FILTER}), 0)::numeric         AS aov,
        COALESCE(SUM(discount) FILTER (WHERE ${REV_FILTER}), 0)::numeric      AS discount,
        COALESCE(SUM(CASE WHEN order_type='dine-in' THEN total END)
                 FILTER (WHERE ${REV_FILTER}), 0)::numeric                    AS dine_in,
        COALESCE(SUM(CASE WHEN order_type='delivery' THEN total END)
                 FILTER (WHERE ${REV_FILTER}), 0)::numeric                    AS delivery,
        COUNT(DISTINCT COALESCE(customer_phone, customer_id::text))::int       AS unique_customers
      FROM orders
      WHERE created_at::date BETWEEN $1 AND $2
    `, [r.prevStart, r.prevEnd]);

    const cur = curR.rows[0] || {};
    const prv = prvR.rows[0] || {};
    const completionRate = cur.orders > 0 ? Math.round(Number(cur.completed) / Number(cur.orders) * 100) : 0;

    res.json({
      range: r,
      kpis: {
        totalRevenue:    kpi(cur, prv, 'revenue'),
        totalOrders:     kpi(cur, prv, 'orders'),
        avgOrderValue:   kpi(cur, prv, 'aov'),
        uniqueCustomers: kpi(cur, prv, 'unique_customers'),
        dineInRevenue:   { value: Number(cur.dine_in || 0),  change: pct(cur.dine_in,  prv.dine_in) },
        deliveryRevenue: { value: Number(cur.delivery || 0), change: pct(cur.delivery, prv.delivery) },
        totalDiscount:   kpi(cur, prv, 'discount'),
        completionRate,
      },
    });
  } catch (error) {
    console.error('Error /reports/overview:', error);
    res.status(500).json({ error: 'Failed to fetch overview', details: error.message });
  }
});

/* =====================================================================
   GET /api/reports/sales-trend?granularity=hour|day|week|month
   Returns { points: [{bucket, orders, revenue}] }
   ===================================================================== */
router.get('/sales-trend', authenticateToken, async (req, res) => {
  try {
    const r = resolveRange(req.query);
    const granularity = ['hour','day','week','month'].includes(req.query.granularity)
      ? req.query.granularity : 'day';

    const truncMap = { hour: 'hour', day: 'day', week: 'week', month: 'month' };
    const trunc = truncMap[granularity];

    const result = await query(`
      SELECT date_trunc($3, created_at) AS bucket,
             COUNT(*)::int                           AS orders,
             COALESCE(SUM(total), 0)::numeric        AS revenue
      FROM orders
      WHERE created_at::date BETWEEN $1 AND $2 AND ${REV_FILTER}
      GROUP BY 1
      ORDER BY 1
    `, [r.start, r.end, trunc]);

    res.json({ range: r, granularity, points: result.rows });
  } catch (error) {
    console.error('Error /reports/sales-trend:', error);
    res.status(500).json({ error: 'Failed to fetch sales trend', details: error.message });
  }
});

/* =====================================================================
   GET /api/reports/payment-mix
   Sources from the payments table if populated, otherwise orders.
   ===================================================================== */
router.get('/payment-mix', authenticateToken, async (req, res) => {
  try {
    const r = resolveRange(req.query);

    // Try payments table first
    let source = 'orders';
    let rows = [];
    try {
      const pr = await query(`
        SELECT COALESCE(NULLIF(payment_method,''), 'unknown') AS method,
               COUNT(*)::int                                  AS count,
               COALESCE(SUM(amount), 0)::numeric              AS amount
        FROM payments
        WHERE created_at::date BETWEEN $1 AND $2
          AND (payment_status = 'completed' OR payment_status = 'paid')
        GROUP BY 1
        ORDER BY amount DESC
      `, [r.start, r.end]);
      if (pr.rows.length > 0) { source = 'payments'; rows = pr.rows; }
    } catch (_) { /* payments table may not exist */ }

    if (rows.length === 0) {
      const or = await query(`
        SELECT COALESCE(NULLIF(payment_method,''), 'unknown') AS method,
               COUNT(*)::int                                  AS count,
               COALESCE(SUM(total), 0)::numeric               AS amount
        FROM orders
        WHERE created_at::date BETWEEN $1 AND $2 AND ${REV_FILTER}
        GROUP BY 1
        ORDER BY amount DESC
      `, [r.start, r.end]);
      rows = or.rows;
    }

    res.json({ range: r, source, methods: rows });
  } catch (error) {
    console.error('Error /reports/payment-mix:', error);
    res.status(500).json({ error: 'Failed to fetch payment mix', details: error.message });
  }
});

/* =====================================================================
   GET /api/reports/order-type-mix
   ===================================================================== */
router.get('/order-type-mix', authenticateToken, async (req, res) => {
  try {
    const r = resolveRange(req.query);
    const result = await query(`
      SELECT COALESCE(NULLIF(order_type,''), 'unknown') AS type,
             COUNT(*)::int                             AS count,
             COALESCE(SUM(total), 0)::numeric          AS revenue
      FROM orders
      WHERE created_at::date BETWEEN $1 AND $2 AND ${REV_FILTER}
      GROUP BY 1
      ORDER BY revenue DESC
    `, [r.start, r.end]);
    res.json({ range: r, types: result.rows });
  } catch (error) {
    console.error('Error /reports/order-type-mix:', error);
    res.status(500).json({ error: 'Failed to fetch order type mix', details: error.message });
  }
});

/* =====================================================================
   GET /api/reports/category-breakdown
   ===================================================================== */
router.get('/category-breakdown', authenticateToken, async (req, res) => {
  try {
    const r = resolveRange(req.query);
    const result = await query(`
      SELECT
        COALESCE(NULLIF(oi.menu_item_category,''), 'Uncategorized') AS category,
        COUNT(*)::int                                               AS items_sold,
        COALESCE(SUM(oi.quantity * oi.price), 0)::numeric           AS revenue
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      WHERE o.created_at::date BETWEEN $1 AND $2 AND o.${REV_FILTER}
      GROUP BY 1
      ORDER BY revenue DESC
    `, [r.start, r.end]);

    const total = result.rows.reduce((s, x) => s + Number(x.revenue || 0), 0);
    const categories = result.rows.map(row => ({
      ...row,
      share: total > 0 ? Number(row.revenue) / total : 0,
    }));
    res.json({ range: r, categories });
  } catch (error) {
    console.error('Error /reports/category-breakdown:', error);
    res.status(500).json({ error: 'Failed to fetch category breakdown', details: error.message });
  }
});

/* =====================================================================
   GET /api/reports/top-items?metric=revenue|qty&limit=30
   Returns items with ABC classification.
   ===================================================================== */
router.get('/top-items', authenticateToken, async (req, res) => {
  try {
    const r = resolveRange(req.query);
    const metric = req.query.metric === 'qty' ? 'quantity_sold' : 'revenue';
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 30));

    const result = await query(`
      SELECT
        oi.menu_item_name                                       AS name,
        COALESCE(NULLIF(oi.menu_item_category,''), 'Uncategorized') AS category,
        SUM(oi.quantity)::int                                   AS quantity_sold,
        COALESCE(SUM(oi.quantity * oi.price), 0)::numeric       AS revenue,
        COALESCE(AVG(oi.price), 0)::numeric                     AS avg_price
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      WHERE o.created_at::date BETWEEN $1 AND $2 AND o.${REV_FILTER}
      GROUP BY oi.menu_item_name, oi.menu_item_category
      ORDER BY ${metric} DESC
      LIMIT $3
    `, [r.start, r.end, limit]);

    const total = result.rows.reduce((s, x) => s + Number(x.revenue || 0), 0);
    let acc = 0;
    const items = result.rows.map(row => {
      const rev = Number(row.revenue || 0);
      acc += rev;
      const shareCum = total > 0 ? acc / total : 0;
      const abc = shareCum <= 0.8 ? 'A' : shareCum <= 0.95 ? 'B' : 'C';
      return {
        ...row,
        revenue_share: total > 0 ? rev / total : 0,
        abc,
      };
    });

    res.json({ range: r, items });
  } catch (error) {
    console.error('Error /reports/top-items:', error);
    res.status(500).json({ error: 'Failed to fetch top items', details: error.message });
  }
});

/* =====================================================================
   GET /api/reports/slow-movers
   ===================================================================== */
router.get('/slow-movers', authenticateToken, async (req, res) => {
  try {
    const r = resolveRange(req.query);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));

    const result = await query(`
      SELECT mi.name,
             COALESCE(NULLIF(mi.category,''), 'Uncategorized') AS category,
             COALESCE(SUM(oi.quantity), 0)::int               AS quantity_sold,
             COALESCE(SUM(oi.quantity * oi.price), 0)::numeric AS revenue
      FROM menu_items mi
      LEFT JOIN order_items oi ON oi.menu_item_name = mi.name
      LEFT JOIN orders o       ON o.id = oi.order_id
                              AND o.created_at::date BETWEEN $1 AND $2
                              AND o.${REV_FILTER}
      WHERE COALESCE(mi.is_available, true) = true
      GROUP BY mi.id, mi.name, mi.category
      ORDER BY quantity_sold ASC, mi.name ASC
      LIMIT $3
    `, [r.start, r.end, limit]);

    res.json({ range: r, items: result.rows });
  } catch (error) {
    console.error('Error /reports/slow-movers:', error);
    res.status(500).json({ error: 'Failed to fetch slow-movers', details: error.message });
  }
});

/* =====================================================================
   GET /api/reports/hourly-load
   ===================================================================== */
router.get('/hourly-load', authenticateToken, async (req, res) => {
  try {
    const r = resolveRange(req.query);
    const result = await query(`
      SELECT EXTRACT(HOUR FROM created_at)::int AS hour,
             COUNT(*)::int                      AS orders,
             COALESCE(SUM(total), 0)::numeric   AS revenue
      FROM orders
      WHERE created_at::date BETWEEN $1 AND $2 AND ${REV_FILTER}
      GROUP BY 1
      ORDER BY 1
    `, [r.start, r.end]);
    // Fill missing hours 0..23
    const map = new Map(result.rows.map(h => [Number(h.hour), h]));
    const hours = Array.from({ length: 24 }, (_, h) => ({
      hour: h,
      orders: Number(map.get(h)?.orders || 0),
      revenue: Number(map.get(h)?.revenue || 0),
    }));
    res.json({ range: r, hours });
  } catch (error) {
    console.error('Error /reports/hourly-load:', error);
    res.status(500).json({ error: 'Failed to fetch hourly load', details: error.message });
  }
});

/* =====================================================================
   GET /api/reports/heatmap   { grid: [{dow, hour, orders, revenue}] }
   ===================================================================== */
router.get('/heatmap', authenticateToken, async (req, res) => {
  try {
    const r = resolveRange(req.query);
    const result = await query(`
      SELECT EXTRACT(DOW  FROM created_at)::int AS dow,
             EXTRACT(HOUR FROM created_at)::int AS hour,
             COUNT(*)::int                      AS orders,
             COALESCE(SUM(total), 0)::numeric   AS revenue
      FROM orders
      WHERE created_at::date BETWEEN $1 AND $2
      GROUP BY dow, hour
      ORDER BY dow, hour
    `, [r.start, r.end]);
    res.json({ range: r, grid: result.rows });
  } catch (error) {
    console.error('Error /reports/heatmap:', error);
    res.status(500).json({ error: 'Failed to fetch heatmap', details: error.message });
  }
});

/* =====================================================================
   GET /api/reports/customers
   ===================================================================== */
router.get('/customers', authenticateToken, async (req, res) => {
  try {
    const r = resolveRange(req.query);
    const limit = Math.min(500, Math.max(1, parseInt(req.query.limit, 10) || 25));

    const top = await query(`
      SELECT COALESCE(NULLIF(customer_name, ''), 'Guest') AS customer_name,
             customer_phone,
             COUNT(*)::int                                AS orders,
             COALESCE(SUM(total), 0)::numeric             AS spend,
             COALESCE(AVG(total), 0)::numeric             AS avg_order_value,
             MIN(created_at)                              AS first_order,
             MAX(created_at)                              AS last_order
      FROM orders
      WHERE created_at::date BETWEEN $1 AND $2 AND ${REV_FILTER}
      GROUP BY customer_name, customer_phone
      ORDER BY spend DESC
      LIMIT $3
    `, [r.start, r.end, limit]);

    // New vs returning: a customer is "new" if their very-first-ever order is in-range.
    const mix = await query(`
      WITH first_orders AS (
        SELECT COALESCE(customer_phone, customer_name) AS key,
               MIN(created_at::date) AS first_date
        FROM orders
        WHERE ${REV_FILTER}
        GROUP BY 1
      ),
      period AS (
        SELECT DISTINCT COALESCE(customer_phone, customer_name) AS key
        FROM orders
        WHERE created_at::date BETWEEN $1 AND $2 AND ${REV_FILTER}
      )
      SELECT
        COUNT(*) FILTER (WHERE f.first_date BETWEEN $1 AND $2)::int AS new_customers,
        COUNT(*) FILTER (WHERE f.first_date <  $1)::int             AS returning_customers
      FROM period p
      JOIN first_orders f USING (key)
    `, [r.start, r.end]);

    res.json({
      range: r,
      top: top.rows,
      mix: mix.rows[0] || { new_customers: 0, returning_customers: 0 },
    });
  } catch (error) {
    console.error('Error /reports/customers:', error);
    res.status(500).json({ error: 'Failed to fetch customers', details: error.message });
  }
});

/* =====================================================================
   GET /api/reports/table-performance
   ===================================================================== */
router.get('/table-performance', authenticateToken, async (req, res) => {
  try {
    const r = resolveRange(req.query);
    const result = await query(`
      SELECT table_id,
             COUNT(*)::int                     AS orders,
             COALESCE(SUM(total), 0)::numeric  AS revenue,
             COALESCE(AVG(total), 0)::numeric  AS avg_ticket
      FROM orders
      WHERE order_type = 'dine-in'
        AND table_id IS NOT NULL
        AND created_at::date BETWEEN $1 AND $2
        AND ${REV_FILTER}
      GROUP BY table_id
      ORDER BY revenue DESC
    `, [r.start, r.end]);
    res.json({ range: r, tables: result.rows });
  } catch (error) {
    console.error('Error /reports/table-performance:', error);
    res.status(500).json({ error: 'Failed to fetch table performance', details: error.message });
  }
});

/* =====================================================================
   GET /api/reports/discounts
   Returns a single totals object (client expects discounted_orders,
   total_discount, total_delivery_fee).
   ===================================================================== */
router.get('/discounts', authenticateToken, async (req, res) => {
  try {
    const r = resolveRange(req.query);
    const result = await query(`
      SELECT COUNT(*) FILTER (WHERE COALESCE(discount, 0) > 0)::int AS discounted_orders,
             COALESCE(SUM(discount), 0)::numeric                    AS total_discount,
             COALESCE(SUM(delivery_fee), 0)::numeric                AS total_delivery_fee
      FROM orders
      WHERE created_at::date BETWEEN $1 AND $2 AND ${REV_FILTER}
    `, [r.start, r.end]);
    res.json({ range: r, ...(result.rows[0] || {}) });
  } catch (error) {
    console.error('Error /reports/discounts:', error);
    res.status(500).json({ error: 'Failed to fetch discounts', details: error.message });
  }
});

/* =====================================================================
   GET /api/reports/staff-activity
   Returns { enabled, transactions: [{transaction_type, count, amount}] }
   ===================================================================== */
router.get('/staff-activity', authenticateToken, async (req, res) => {
  try {
    const r = resolveRange(req.query);
    const result = await query(`
      SELECT transaction_type,
             COUNT(*)::int                     AS count,
             COALESCE(SUM(amount), 0)::numeric AS amount
      FROM daybook_transactions
      WHERE transaction_date BETWEEN $1 AND $2
      GROUP BY transaction_type
      ORDER BY amount DESC
    `, [r.start, r.end]);
    res.json({ range: r, enabled: true, transactions: result.rows });
  } catch (error) {
    console.error('Error /reports/staff-activity:', error);
    res.json({ range: null, enabled: false, transactions: [] });
  }
});

/* =====================================================================
   GET /api/reports/inventory-valuation
   ===================================================================== */
router.get('/inventory-valuation', authenticateToken, async (req, res) => {
  try {
    const ingredients = await query(`
      SELECT id, name, unit,
             COALESCE(NULLIF(category,''), 'Uncategorized') AS category,
             COALESCE(current_stock, 0)::numeric            AS current_stock,
             COALESCE(cost_per_unit, 0)::numeric            AS unit_cost,
             COALESCE(reorder_point, 0)::numeric            AS reorder_point,
             (COALESCE(current_stock, 0) * COALESCE(cost_per_unit, 0))::numeric AS value
      FROM ingredients
      WHERE COALESCE(is_active, true) = true
      ORDER BY value DESC
    `);

    const rows = ingredients.rows;
    const total_value = rows.reduce((s, i) => s + Number(i.value || 0), 0);

    const criticalRows = rows.filter(i =>
      Number(i.reorder_point) > 0 && Number(i.current_stock) <= Number(i.reorder_point)
    );
    const outRows = rows.filter(i => Number(i.current_stock) <= 0);
    const lowRows = rows.filter(i =>
      Number(i.reorder_point) > 0 &&
      Number(i.current_stock) > Number(i.reorder_point) &&
      Number(i.current_stock) < Number(i.reorder_point) * 1.25
    );

    const byCatMap = new Map();
    rows.forEach(i => {
      const c = byCatMap.get(i.category) || { category: i.category, value: 0, count: 0 };
      c.value += Number(i.value || 0);
      c.count += 1;
      byCatMap.set(i.category, c);
    });

    res.json({
      enabled: true,
      summary: {
        total_value,
        ingredient_count: rows.length,
        critical_count: criticalRows.length,
        low_count: lowRows.length,
        out_count: outRows.length,
      },
      by_category: [...byCatMap.values()].sort((a, b) => b.value - a.value),
      critical: criticalRows.slice(0, 30),
    });
  } catch (error) {
    console.error('Error /reports/inventory-valuation:', error);
    // Ingredient table may not exist — surface disabled
    res.json({ enabled: false, summary: {}, by_category: [], critical: [] });
  }
});

/* =====================================================================
   GET /api/reports/profit-loss?cogs_ratio=0.35
   Returns the rich shape the PnlPanel expects.
   COGS source priority: 1) expenses with kind='raw' 2) recipe×ingredient 3) ratio
   ===================================================================== */
router.get('/profit-loss', authenticateToken, async (req, res) => {
  try {
    const r = resolveRange(req.query);
    const cogsRatio = Math.min(0.9, Math.max(0, Number(req.query.cogs_ratio) || 0.35));

    const revR = await query(`
      SELECT COUNT(*)::int                            AS orders,
             COALESCE(SUM(total), 0)::numeric         AS gross,
             COALESCE(SUM(discount), 0)::numeric      AS discounts,
             COALESCE(SUM(delivery_fee), 0)::numeric  AS delivery_fees
      FROM orders
      WHERE created_at::date BETWEEN $1 AND $2 AND ${REV_FILTER}
    `, [r.start, r.end]);

    const prevRevR = await query(`
      SELECT COALESCE(SUM(total), 0)::numeric AS gross
      FROM orders
      WHERE created_at::date BETWEEN $1 AND $2 AND ${REV_FILTER}
    `, [r.prevStart, r.prevEnd]);

    const expR = await query(`
      SELECT COALESCE(NULLIF(lower(category),''), 'other') AS category,
             COUNT(*)::int                                 AS count,
             COALESCE(SUM(amount), 0)::numeric             AS amount
      FROM daybook_transactions
      WHERE transaction_type = 'expense'
        AND transaction_date BETWEEN $1 AND $2
      GROUP BY 1
      ORDER BY amount DESC
    `, [r.start, r.end]);

    // Categorize expenses into operating "kinds"
    const kindOf = (cat) => {
      const c = (cat || '').toLowerCase();
      if (/salary|payroll|wage|staff/.test(c)) return 'payroll';
      if (/rent|lease/.test(c))                 return 'rent';
      if (/utilit|electric|water|gas|internet/.test(c)) return 'utilities';
      if (/market|ads|promo/.test(c))           return 'marketing';
      if (/tax|licen|govt/.test(c))             return 'tax';
      if (/supplies|packag|food|beverage|ingredient|raw/.test(c)) return 'raw';
      if (/operat|maintain|repair|transport|fuel/.test(c)) return 'operating';
      return 'other';
    };

    const byKind = { payroll: 0, rent: 0, utilities: 0, marketing: 0, tax: 0, operating: 0, raw: 0, other: 0 };
    const byCategory = expR.rows.map(row => {
      const kind = kindOf(row.category);
      byKind[kind] = (byKind[kind] || 0) + Number(row.amount || 0);
      return { ...row, kind };
    });

    const rawExpenses = byKind.raw || 0;
    const gross = Number(revR.rows[0].gross);
    const discounts = Number(revR.rows[0].discounts);
    const deliveryFees = Number(revR.rows[0].delivery_fees);

    // COGS
    let cogsAmount, cogsSource;
    if (rawExpenses > 0) {
      cogsAmount = rawExpenses;
      cogsSource = 'expenses';
    } else {
      // fallback: try recipe×ingredient if tables exist; else ratio
      try {
        const recR = await query(`
          SELECT COALESCE(SUM(
            oi.quantity * ri.quantity * COALESCE(ing.cost_per_unit, 0)
          ), 0)::numeric AS cogs
          FROM order_items oi
          JOIN orders o            ON o.id = oi.order_id
          JOIN menu_items mi       ON mi.name = oi.menu_item_name
          JOIN recipe_ingredients ri ON ri.menu_item_id = mi.id
          JOIN ingredients ing     ON ing.id = ri.ingredient_id
          WHERE o.created_at::date BETWEEN $1 AND $2 AND o.${REV_FILTER}
        `, [r.start, r.end]);
        const recipe = Number(recR.rows[0]?.cogs || 0);
        if (recipe > 0) {
          cogsAmount = recipe; cogsSource = 'ingredients';
        } else {
          cogsAmount = gross * cogsRatio; cogsSource = 'ratio';
        }
      } catch (_) {
        cogsAmount = gross * cogsRatio; cogsSource = 'ratio';
      }
    }

    const opex = Object.entries(byKind).filter(([k]) => k !== 'raw').reduce((s, [, v]) => s + Number(v || 0), 0);
    const grossProfit = gross - cogsAmount;
    const netProfit = grossProfit - opex;
    const grossMargin = gross > 0 ? (grossProfit / gross) * 100 : 0;
    const netMargin   = gross > 0 ? (netProfit / gross) * 100 : 0;

    res.json({
      range: r,
      revenue: {
        gross,
        discounts,
        delivery_fees: deliveryFees,
        orders: Number(revR.rows[0].orders || 0),
        change: pct(gross, prevRevR.rows[0]?.gross),
      },
      cogs: { amount: cogsAmount, source: cogsSource, ratio: cogsRatio },
      gross_profit: { amount: grossProfit, margin: grossMargin },
      expenses: { total: opex + (byKind.raw || 0), opex, by_kind: byKind, by_category: byCategory },
      net_profit: { amount: netProfit, margin: netMargin },
    });
  } catch (error) {
    console.error('Error /reports/profit-loss:', error);
    res.status(500).json({ error: 'Failed to fetch profit-loss', details: error.message });
  }
});

/* =====================================================================
   GET /api/reports/profit-loss-trend
   ===================================================================== */
router.get('/profit-loss-trend', authenticateToken, async (req, res) => {
  try {
    const r = resolveRange(req.query);
    const cogsRatio = Math.min(0.9, Math.max(0, Number(req.query.cogs_ratio) || 0.35));
    const result = await query(`
      WITH days AS (
        SELECT generate_series($1::date, $2::date, '1 day')::date AS d
      ),
      rev AS (
        SELECT DATE(created_at) AS d,
               COALESCE(SUM(total), 0)::numeric AS revenue
        FROM orders
        WHERE created_at::date BETWEEN $1 AND $2 AND ${REV_FILTER}
        GROUP BY 1
      ),
      exp AS (
        SELECT transaction_date AS d,
               COALESCE(SUM(amount), 0)::numeric AS expenses
        FROM daybook_transactions
        WHERE transaction_type = 'expense' AND transaction_date BETWEEN $1 AND $2
        GROUP BY 1
      )
      SELECT days.d::text                   AS date,
             COALESCE(rev.revenue, 0)       AS revenue,
             COALESCE(exp.expenses, 0)      AS expenses,
             (COALESCE(rev.revenue, 0) * $3)::numeric AS cogs_est,
             (COALESCE(rev.revenue, 0) - COALESCE(exp.expenses, 0) - COALESCE(rev.revenue, 0) * $3)::numeric AS profit
      FROM days
      LEFT JOIN rev ON rev.d = days.d
      LEFT JOIN exp ON exp.d = days.d
      ORDER BY days.d
    `, [r.start, r.end, cogsRatio]);

    res.json({ range: r, points: result.rows });
  } catch (error) {
    console.error('Error /reports/profit-loss-trend:', error);
    res.status(500).json({ error: 'Failed to fetch profit-loss trend', details: error.message });
  }
});

/* =====================================================================
   Expense CRUD  (daybook_transactions where transaction_type='expense')
   ===================================================================== */
router.get('/expenses', authenticateToken, async (req, res) => {
  try {
    const r = resolveRange(req.query);
    const result = await query(`
      SELECT id,
             transaction_date AS expense_date,
             category,
             description,
             amount,
             payment_method,
             reference   AS reference_number,
             created_by,
             created_at
      FROM daybook_transactions
      WHERE transaction_type = 'expense'
        AND transaction_date BETWEEN $1 AND $2
      ORDER BY transaction_date DESC, id DESC
    `, [r.start, r.end]);

    const total = result.rows.reduce((s, e) => s + Number(e.amount || 0), 0);
    res.json({ range: r, count: result.rows.length, total, expenses: result.rows });
  } catch (error) {
    console.error('Error /reports/expenses:', error);
    res.json({ count: 0, total: 0, expenses: [] });
  }
});

router.get('/expense-categories', authenticateToken, async (req, res) => {
  try {
    // Union of canonical categories + whatever has been used in the ledger
    const usedR = await query(`
      SELECT DISTINCT category
      FROM daybook_transactions
      WHERE transaction_type = 'expense' AND category IS NOT NULL AND category <> ''
    `);
    const used = new Set(usedR.rows.map(x => x.category));

    const canonical = [
      { name: 'Food Supplies',         kind: 'raw' },
      { name: 'Packaging',             kind: 'raw' },
      { name: 'Beverages',             kind: 'raw' },
      { name: 'Utilities',             kind: 'utilities' },
      { name: 'Staff Salary',          kind: 'payroll' },
      { name: 'Rent',                  kind: 'rent' },
      { name: 'Repairs & Maintenance', kind: 'operating' },
      { name: 'Transport',             kind: 'operating' },
      { name: 'Marketing',             kind: 'marketing' },
      { name: 'Tax & Licenses',        kind: 'tax' },
      { name: 'Misc',                  kind: 'other' },
    ];
    canonical.forEach(c => used.delete(c.name));
    const extra = [...used].map(name => ({ name, kind: 'other' }));

    res.json({ categories: [...canonical, ...extra] });
  } catch (error) {
    console.error('Error /reports/expense-categories:', error);
    res.json({ categories: [] });
  }
});

router.post('/expenses', authenticateToken, async (req, res) => {
  try {
    const {
      expense_date, category, description, amount,
      payment_method, reference_number, notes,
    } = req.body || {};
    if (!category || !amount) {
      return res.status(400).json({ error: 'category and amount are required' });
    }
    const txDate = expense_date || new Date().toISOString().split('T')[0];
    const fullDescription = notes ? `${description || ''}${description ? ' - ' : ''}${notes}` : (description || null);

    const result = await query(`
      INSERT INTO daybook_transactions
        (transaction_date, transaction_type, category, amount, description, payment_method, reference, created_by, created_at)
      VALUES ($1, 'expense', $2, $3, $4, $5, $6, $7, NOW())
      RETURNING *
    `, [
      txDate, category, Number(amount), fullDescription,
      payment_method || null, reference_number || null,
      req.user?.username || null,
    ]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error creating expense:', error);
    res.status(500).json({ error: 'Failed to create expense', details: error.message });
  }
});

router.put('/expenses/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      expense_date, category, description, amount,
      payment_method, reference_number, notes,
    } = req.body || {};
    const fullDescription = notes ? `${description || ''}${description ? ' - ' : ''}${notes}` : (description || null);

    const result = await query(`
      UPDATE daybook_transactions
      SET transaction_date = COALESCE($1, transaction_date),
          category         = COALESCE($2, category),
          amount           = COALESCE($3, amount),
          description      = COALESCE($4, description),
          payment_method   = COALESCE($5, payment_method),
          reference        = COALESCE($6, reference),
          updated_at       = NOW()
      WHERE id = $7 AND transaction_type = 'expense'
      RETURNING *
    `, [
      expense_date || null,
      category || null,
      amount ? Number(amount) : null,
      fullDescription,
      payment_method || null,
      reference_number || null,
      id,
    ]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Expense not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating expense:', error);
    res.status(500).json({ error: 'Failed to update expense', details: error.message });
  }
});

router.delete('/expenses/:id', authenticateToken, async (req, res) => {
  try {
    const result = await query(`
      DELETE FROM daybook_transactions
      WHERE id = $1 AND transaction_type = 'expense'
      RETURNING id
    `, [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Expense not found' });
    }
    res.json({ success: true, id: result.rows[0].id });
  } catch (error) {
    console.error('Error deleting expense:', error);
    res.status(500).json({ error: 'Failed to delete expense', details: error.message });
  }
});

/* =====================================================================
   GET /api/reports/data-check — quick health probe
   ===================================================================== */
router.get('/data-check', authenticateToken, async (req, res) => {
  try {
    const result = await query(`
      SELECT
        COUNT(*)::int                                                     AS total_orders,
        COUNT(*) FILTER (WHERE payment_status = 'paid')::int              AS paid_orders,
        COUNT(*) FILTER (WHERE payment_status = 'pending')::int           AS pending_orders,
        COALESCE(SUM(total) FILTER (WHERE payment_status = 'paid'), 0)::numeric AS total_revenue,
        MIN(created_at::date) AS earliest,
        MAX(created_at::date) AS latest
      FROM orders
    `);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error /reports/data-check:', error);
    res.status(500).json({ error: 'Failed to check data' });
  }
});

/* =====================================================================
   GET /api/reports/export?type=orders|items|payments|expenses|sales|summary
   Respects the date range. Returns text/csv.
   ===================================================================== */
router.get('/export', authenticateToken, async (req, res) => {
  try {
    const r = resolveRange(req.query);
    const type = req.query.type || 'orders';
    let headers, rows, filename;

    switch (type) {
      case 'orders': {
        const result = await query(`
          SELECT o.id, o.order_number, o.created_at,
                 COALESCE(o.customer_name,'Guest') AS customer_name,
                 o.customer_phone, o.table_id, o.order_type,
                 o.subtotal, o.discount, o.delivery_fee, o.total,
                 o.status, o.payment_status, o.payment_method
          FROM orders o
          WHERE o.created_at::date BETWEEN $1 AND $2
          ORDER BY o.created_at DESC
        `, [r.start, r.end]);
        headers = ['Order #','Date','Customer','Phone','Table','Type','Subtotal','Discount','Delivery fee','Total','Status','Payment status','Payment method'];
        rows = result.rows.map(o => [
          o.order_number || o.id,
          new Date(o.created_at).toISOString(),
          o.customer_name, o.customer_phone || '', o.table_id || '',
          o.order_type || '', o.subtotal, o.discount, o.delivery_fee, o.total,
          o.status, o.payment_status, o.payment_method,
        ]);
        filename = `orders_${r.start}_${r.end}.csv`;
        break;
      }
      case 'items': {
        const result = await query(`
          SELECT o.id AS order_id, o.order_number, o.created_at, o.customer_name,
                 oi.menu_item_name, oi.menu_item_category, oi.price,
                 oi.quantity, oi.subtotal, o.order_type
          FROM order_items oi
          JOIN orders o ON o.id = oi.order_id
          WHERE o.created_at::date BETWEEN $1 AND $2
          ORDER BY o.created_at DESC, oi.id
        `, [r.start, r.end]);
        headers = ['Order #','Date','Customer','Item','Category','Unit price','Qty','Subtotal','Order type'];
        rows = result.rows.map(i => [
          i.order_number || i.order_id, new Date(i.created_at).toISOString(),
          i.customer_name || '', i.menu_item_name, i.menu_item_category || '',
          i.price, i.quantity, i.subtotal, i.order_type || '',
        ]);
        filename = `order_items_${r.start}_${r.end}.csv`;
        break;
      }
      case 'payments': {
        // Prefer payments table; fallback to orders
        let result;
        try {
          result = await query(`
            SELECT p.id, p.order_id, p.amount, p.payment_method, p.payment_status,
                   p.transaction_id, p.created_at, o.order_number, o.customer_name
            FROM payments p
            LEFT JOIN orders o ON o.id = p.order_id
            WHERE p.created_at::date BETWEEN $1 AND $2
            ORDER BY p.created_at DESC
          `, [r.start, r.end]);
          if (result.rows.length === 0) throw new Error('empty');
          headers = ['Payment id','Order #','Customer','Amount','Method','Status','Transaction id','Date'];
          rows = result.rows.map(p => [
            p.id, p.order_number || p.order_id, p.customer_name || '',
            p.amount, p.payment_method, p.payment_status, p.transaction_id || '',
            new Date(p.created_at).toISOString(),
          ]);
        } catch (_) {
          const or = await query(`
            SELECT id, order_number, customer_name, total, payment_method, payment_status, created_at
            FROM orders
            WHERE created_at::date BETWEEN $1 AND $2 AND ${REV_FILTER}
            ORDER BY created_at DESC
          `, [r.start, r.end]);
          headers = ['Payment id','Order #','Customer','Amount','Method','Status','Transaction id','Date'];
          rows = or.rows.map(o => [
            '', o.order_number || o.id, o.customer_name || '',
            o.total, o.payment_method, o.payment_status, '',
            new Date(o.created_at).toISOString(),
          ]);
        }
        filename = `payments_${r.start}_${r.end}.csv`;
        break;
      }
      case 'expenses': {
        const result = await query(`
          SELECT id, transaction_date, category, description, amount,
                 payment_method, reference, created_by, created_at
          FROM daybook_transactions
          WHERE transaction_type = 'expense'
            AND transaction_date BETWEEN $1 AND $2
          ORDER BY transaction_date DESC
        `, [r.start, r.end]);
        headers = ['ID','Date','Category','Description','Amount','Payment method','Reference','Created by','Created at'];
        rows = result.rows.map(e => [
          e.id, e.transaction_date, e.category, e.description, e.amount,
          e.payment_method, e.reference, e.created_by,
          e.created_at ? new Date(e.created_at).toISOString() : '',
        ]);
        filename = `expenses_${r.start}_${r.end}.csv`;
        break;
      }
      case 'sales': {
        const result = await query(`
          WITH days AS (
            SELECT generate_series($1::date, $2::date, '1 day')::date AS d
          )
          SELECT days.d::text AS date,
                 COALESCE(COUNT(o.id) FILTER (WHERE o.${REV_FILTER}), 0)::int AS orders,
                 COALESCE(SUM(o.total) FILTER (WHERE o.${REV_FILTER}), 0)::numeric AS revenue,
                 COALESCE(AVG(o.total) FILTER (WHERE o.${REV_FILTER}), 0)::numeric AS aov
          FROM days
          LEFT JOIN orders o ON o.created_at::date = days.d
          GROUP BY days.d
          ORDER BY days.d
        `, [r.start, r.end]);
        headers = ['Date','Orders','Revenue','Avg order value'];
        rows = result.rows.map(d => [d.date, d.orders, d.revenue, d.aov]);
        filename = `sales_${r.start}_${r.end}.csv`;
        break;
      }
      case 'summary': {
        const sumR = await query(`
          SELECT
            COUNT(*) FILTER (WHERE ${REV_FILTER})::int                    AS paid_orders,
            COUNT(*)::int                                                 AS total_orders,
            COALESCE(SUM(total) FILTER (WHERE ${REV_FILTER}), 0)::numeric AS revenue,
            COALESCE(AVG(total) FILTER (WHERE ${REV_FILTER}), 0)::numeric AS aov,
            COALESCE(SUM(discount) FILTER (WHERE ${REV_FILTER}), 0)::numeric AS discount,
            COALESCE(SUM(delivery_fee) FILTER (WHERE ${REV_FILTER}), 0)::numeric AS delivery_fees
          FROM orders
          WHERE created_at::date BETWEEN $1 AND $2
        `, [r.start, r.end]);
        const expSumR = await query(`
          SELECT COALESCE(SUM(amount), 0)::numeric AS total
          FROM daybook_transactions
          WHERE transaction_type='expense' AND transaction_date BETWEEN $1 AND $2
        `, [r.start, r.end]);
        const s = sumR.rows[0];
        const exp = Number(expSumR.rows[0].total || 0);
        const net = Number(s.revenue) - exp;
        headers = ['Metric','Value'];
        rows = [
          ['Period',               `${r.start} → ${r.end}`],
          ['Paid orders',          s.paid_orders],
          ['Total orders',         s.total_orders],
          ['Revenue',              s.revenue],
          ['Avg order value',      s.aov],
          ['Discount given',       s.discount],
          ['Delivery fees earned', s.delivery_fees],
          ['Expenses',             exp],
          ['Net profit',           net],
        ];
        filename = `summary_${r.start}_${r.end}.csv`;
        break;
      }
      default:
        return res.status(400).json({ error: `Invalid export type: ${type}` });
    }

    const csv = toCsv(headers, rows);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (error) {
    console.error('Error /reports/export:', error);
    res.status(500).json({ error: 'Failed to export data', details: error.message });
  }
});

module.exports = router;
