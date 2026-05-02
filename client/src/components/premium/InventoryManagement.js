import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { fetchApi } from '../../services/apiService';

/* ============================================================
   InventoryManagement — complete ingredient-level inventory UI.
   Tabs: Overview · Ingredients · Recipes · Alerts · Transactions
   ============================================================ */

const UNITS = ['kg', 'g', 'liters', 'ml', 'pieces', 'packs', 'boxes', 'bottles'];
const CATEGORY_PRESETS = [
  'vegetables', 'meat', 'seafood', 'dairy', 'grains', 'spices',
  'oils', 'beverages', 'bakery', 'frozen', 'packaging', 'other',
];

const stockTone = (status) => ({
  out_of_stock: { bg: 'bg-rose-100', text: 'text-rose-700', ring: 'ring-rose-200', label: 'Out of stock' },
  critical:     { bg: 'bg-rose-50',  text: 'text-rose-600', ring: 'ring-rose-100', label: 'Critical' },
  low:          { bg: 'bg-amber-50', text: 'text-amber-700', ring: 'ring-amber-100', label: 'Low' },
  good:         { bg: 'bg-emerald-50', text: 'text-emerald-700', ring: 'ring-emerald-100', label: 'Good' },
}[status] || { bg: 'bg-slate-50', text: 'text-slate-600', ring: 'ring-slate-100', label: status });

const priorityTone = (p) => ({
  critical: 'bg-rose-500 text-white',
  high:     'bg-orange-500 text-white',
  medium:   'bg-amber-400 text-slate-900',
  low:      'bg-sky-400 text-white',
}[p] || 'bg-slate-300 text-slate-800');

const fmtMoney = (n) => `Rs. ${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtDate = (d) => d ? new Date(d).toLocaleString() : '—';

/* --- tiny presentational atoms --------------------------------- */
const Card = ({ children, className = '' }) => (
  <div className={`bg-white rounded-2xl ring-1 ring-slate-200 shadow-sm ${className}`}>{children}</div>
);

const StatCard = ({ label, value, sub, tone = 'indigo', Icon }) => {
  const toneStyles = {
    indigo: 'from-indigo-500 to-indigo-600',
    emerald: 'from-emerald-500 to-emerald-600',
    rose: 'from-rose-500 to-rose-600',
    amber: 'from-amber-500 to-amber-600',
    violet: 'from-violet-500 to-violet-600',
    sky: 'from-sky-500 to-sky-600',
  }[tone];
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">{label}</div>
          <div className="mt-2 text-2xl font-bold text-slate-900 tabular-nums">{value}</div>
          {sub && <div className="mt-1 text-xs text-slate-500">{sub}</div>}
        </div>
        {Icon && (
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${toneStyles} flex items-center justify-center text-white shadow-md`}>
            {Icon}
          </div>
        )}
      </div>
    </Card>
  );
};

const Pill = ({ children, className = '' }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${className}`}>{children}</span>
);

const Btn = ({ variant = 'primary', className = '', children, ...rest }) => {
  const base = 'inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed';
  const v = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm',
    ghost:   'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50',
    dark:    'bg-slate-900 text-white hover:bg-slate-800',
    rose:    'bg-rose-600 text-white hover:bg-rose-700',
    emerald: 'bg-emerald-600 text-white hover:bg-emerald-700',
    amber:   'bg-amber-500 text-white hover:bg-amber-600',
  }[variant];
  return <button className={`${base} ${v} ${className}`} {...rest}>{children}</button>;
};

const Input = (props) => (
  <input
    {...props}
    className={`w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 ${props.className || ''}`}
  />
);

const Select = ({ children, ...rest }) => (
  <select
    {...rest}
    className={`w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-300 ${rest.className || ''}`}
  >
    {children}
  </select>
);

const Textarea = (props) => (
  <textarea
    {...props}
    className={`w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 ${props.className || ''}`}
  />
);

const Modal = ({ open, onClose, title, children, maxW = 'max-w-xl' }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" />
      <div
        className={`relative bg-white rounded-2xl shadow-2xl w-full ${maxW} max-h-[90vh] overflow-hidden flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 inline-flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500"
            aria-label="Close"
          >✕</button>
        </div>
        <div className="flex-1 overflow-auto">{children}</div>
      </div>
    </div>
  );
};

/* ============================================================
   Main component
   ============================================================ */
export default function InventoryManagement({ pushToast }) {
  const [tab, setTab] = useState('overview');
  const [dashboard, setDashboard] = useState(null);
  const [ingredients, setIngredients] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(false);

  // filters
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // modals
  const [editing, setEditing] = useState(null);       // ingredient for create/edit
  const [adjusting, setAdjusting] = useState(null);   // ingredient for stock-adjust
  const [recipeFor, setRecipeFor] = useState(null);   // menu item for recipe modal

  // Stable toast reference — pushToast from parent is recreated on every render,
  // so we pin it in a ref to avoid re-triggering memoized loaders in useEffect.
  const pushToastRef = useRef(pushToast);
  useEffect(() => { pushToastRef.current = pushToast; }, [pushToast]);
  const toast = useCallback((msg, tone = 'success') => pushToastRef.current?.(msg, tone), []);

  const loadDashboard = useCallback(async () => {
    try {
      const r = await fetchApi.get('/api/inventory/dashboard');
      if (r.success) setDashboard(r.data);
    } catch (e) { console.error(e); }
  }, []);

  const loadIngredients = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (category) params.set('category', category);
      if (search) params.set('search', search);
      params.set('status', 'active');
      const r = await fetchApi.get(`/api/inventory/ingredients?${params.toString()}`);
      if (r.success) setIngredients(r.data);
    } catch (e) {
      console.error(e); toast('Failed to load ingredients', 'error');
    } finally { setLoading(false); }
  }, [category, search, toast]);

  const loadAlerts = useCallback(async () => {
    try {
      const r = await fetchApi.get('/api/inventory/alerts?status=active');
      if (r.success) setAlerts(r.data);
    } catch (e) { console.error(e); }
  }, []);

  const loadTransactions = useCallback(async () => {
    try {
      const r = await fetchApi.get('/api/inventory/transactions?limit=100');
      if (r.success) setTransactions(r.data);
    } catch (e) { console.error(e); }
  }, []);

  const loadMenuItems = useCallback(async () => {
    try {
      const r = await fetchApi.get('/api/menu');
      const list = Array.isArray(r) ? r : (r?.data || r?.menu || []);
      setMenuItems(list);
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => { loadDashboard(); loadAlerts(); }, [loadDashboard, loadAlerts]);
  useEffect(() => { if (tab === 'ingredients') loadIngredients(); }, [tab, loadIngredients]);
  useEffect(() => { if (tab === 'alerts') loadAlerts(); }, [tab, loadAlerts]);
  useEffect(() => { if (tab === 'transactions') loadTransactions(); }, [tab, loadTransactions]);
  useEffect(() => { if (tab === 'recipes') loadMenuItems(); }, [tab, loadMenuItems]);

  const filteredIngredients = useMemo(() => {
    if (!statusFilter) return ingredients;
    return ingredients.filter((i) => i.stock_status === statusFilter);
  }, [ingredients, statusFilter]);

  const uniqueCategories = useMemo(() => {
    const set = new Set(ingredients.map((i) => i.category).filter(Boolean));
    return Array.from(set).sort();
  }, [ingredients]);

  /* ----- Handlers ----- */
  const saveIngredient = async (data) => {
    try {
      if (data.id) {
        const r = await fetchApi.put(`/api/inventory/ingredients/${data.id}`, data);
        if (!r.success) throw new Error(r.error || 'Update failed');
        toast('Ingredient updated');
      } else {
        const r = await fetchApi.post('/api/inventory/ingredients', data);
        if (!r.success) throw new Error(r.error || 'Create failed');
        toast('Ingredient created');
      }
      setEditing(null);
      await Promise.all([loadIngredients(), loadDashboard()]);
    } catch (e) { toast(e.message || 'Save failed', 'error'); }
  };

  const deleteIngredient = async (ing) => {
    // eslint-disable-next-line no-restricted-globals
    if (!confirm(`Delete "${ing.name}"? This cannot be undone.`)) return;
    try {
      const r = await fetchApi.delete(`/api/inventory/ingredients/${ing.id}`);
      if (!r.success) throw new Error(r.error || 'Delete failed');
      toast('Ingredient deleted');
      await Promise.all([loadIngredients(), loadDashboard()]);
    } catch (e) { toast(e.message || 'Delete failed', 'error'); }
  };

  const adjustStock = async (payload) => {
    try {
      const r = await fetchApi.post(`/api/inventory/ingredients/${adjusting.id}/adjust-stock`, payload);
      if (!r.success) throw new Error(r.error || 'Adjust failed');
      toast('Stock updated');
      setAdjusting(null);
      await Promise.all([loadIngredients(), loadDashboard(), loadAlerts()]);
    } catch (e) { toast(e.message || 'Adjust failed', 'error'); }
  };

  const acknowledgeAlert = async (id) => {
    try {
      await fetchApi.post(`/api/inventory/alerts/${id}/acknowledge`, {});
      toast('Alert acknowledged');
      await loadAlerts();
    } catch (e) { toast('Action failed', 'error'); }
  };

  const resolveAlert = async (id) => {
    try {
      await fetchApi.post(`/api/inventory/alerts/${id}/resolve`, {});
      toast('Alert resolved');
      await loadAlerts();
    } catch (e) { toast('Action failed', 'error'); }
  };

  /* ----- Render ----- */
  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 100px)' }}>
      {/* Header (fixed) */}
      <div className="flex-shrink-0 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Inventory Management</h1>
          <p className="text-sm text-slate-500 mt-0.5">Ingredient-level stock, recipes, alerts and transactions.</p>
        </div>
        <div className="flex items-center gap-2">
          <Btn variant="ghost" onClick={() => { loadDashboard(); loadAlerts(); if (tab === 'ingredients') loadIngredients(); }}>
            ↻ Refresh
          </Btn>
          <Btn onClick={() => setEditing({})}>+ New ingredient</Btn>
        </div>
      </div>

      {/* Tabs (fixed) */}
      <div className="flex-shrink-0 mt-4 flex items-center gap-1 overflow-x-auto bg-white rounded-xl ring-1 ring-slate-200 p-1 w-fit">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'ingredients', label: 'Ingredients' },
          { id: 'recipes', label: 'Recipes' },
          { id: 'alerts', label: `Alerts${alerts.length ? ` · ${alerts.length}` : ''}` },
          { id: 'transactions', label: 'Transactions' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition whitespace-nowrap ${
              tab === t.id ? 'bg-indigo-600 text-white shadow' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Panels (scroll internally) */}
      <div className="flex-1 min-h-0 mt-4 overflow-auto fz-scroll pr-1">
        {tab === 'overview'    && <Overview dashboard={dashboard} alerts={alerts} />}
        {tab === 'ingredients' && (
          <IngredientsPanel
            items={filteredIngredients}
            loading={loading}
            search={search} setSearch={setSearch}
            category={category} setCategory={setCategory}
            statusFilter={statusFilter} setStatusFilter={setStatusFilter}
            categories={uniqueCategories}
            onEdit={setEditing}
            onAdjust={setAdjusting}
            onDelete={deleteIngredient}
          />
        )}
        {tab === 'recipes'     && <RecipesPanel menuItems={menuItems} onSelect={setRecipeFor} />}
        {tab === 'alerts'      && <AlertsPanel alerts={alerts} onAck={acknowledgeAlert} onResolve={resolveAlert} />}
        {tab === 'transactions'&& <TransactionsPanel transactions={transactions} />}
      </div>

      {/* Modals */}
      {editing !== null && (
        <IngredientModal
          ingredient={editing}
          onClose={() => setEditing(null)}
          onSave={saveIngredient}
        />
      )}
      {adjusting !== null && (
        <AdjustStockModal
          ingredient={adjusting}
          onClose={() => setAdjusting(null)}
          onSave={adjustStock}
        />
      )}
      {recipeFor !== null && (
        <RecipeModal
          menuItem={recipeFor}
          onClose={() => setRecipeFor(null)}
          toast={toast}
        />
      )}
    </div>
  );
}

/* ============================================================
   Overview panel
   ============================================================ */
function Overview({ dashboard, alerts }) {
  if (!dashboard) {
    return (
      <Card className="p-10 text-center text-slate-500">Loading dashboard…</Card>
    );
  }
  const d = dashboard;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Ingredients" value={d.total_ingredients} tone="indigo" Icon={'📦'} />
        <StatCard label="Low stock"   value={d.low_stock_count}   tone="amber"  sub={`${d.out_of_stock_count} out of stock`} Icon={'⚠️'} />
        <StatCard label="Inventory value" value={fmtMoney(d.total_inventory_value)} tone="emerald" Icon={'💰'} />
        <StatCard label="Active alerts" value={d.active_alerts} tone="rose" sub={`${d.recent_transactions} tx in 7d`} Icon={'🔔'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-900">Top low-stock items</h3>
            <Pill className="bg-amber-50 text-amber-700 ring-1 ring-amber-100">Needs reorder</Pill>
          </div>
          {d.top_low_stock_items?.length ? (
            <div className="divide-y divide-slate-100">
              {d.top_low_stock_items.map((i, idx) => {
                const tone = stockTone(i.status);
                return (
                  <div key={idx} className="py-2.5 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-slate-900">{i.name}</div>
                      <div className="text-xs text-slate-500">
                        {i.current_stock} {i.unit} · reorder at {i.reorder_point}
                      </div>
                    </div>
                    <Pill className={`${tone.bg} ${tone.text} ring-1 ${tone.ring}`}>{tone.label}</Pill>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-8 text-center text-slate-400 text-sm">All stocks are healthy ✨</div>
          )}
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-900">Recent alerts</h3>
            <Pill className="bg-rose-50 text-rose-700 ring-1 ring-rose-100">{alerts.length} active</Pill>
          </div>
          {alerts.length ? (
            <div className="divide-y divide-slate-100 max-h-64 overflow-auto">
              {alerts.slice(0, 8).map((a) => (
                <div key={a.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-900 truncate">
                      {a.ingredient_name || a.menu_item_name || 'Item'}
                    </div>
                    <div className="text-xs text-slate-500">
                      {a.alert_type.replace('_', ' ')} · stock {a.current_stock} / threshold {a.threshold_value}
                    </div>
                  </div>
                  <Pill className={priorityTone(a.priority)}>{a.priority}</Pill>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-slate-400 text-sm">No active alerts 🎉</div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Expiring soon (7d)" value={d.expiring_soon} tone="violet" Icon={'⏳'} />
        <StatCard label="Out of stock" value={d.out_of_stock_count} tone="rose" Icon={'🚫'} />
        <StatCard label="Low stock"   value={d.low_stock_count} tone="amber" Icon={'📉'} />
        <StatCard label="Tx (7 days)" value={d.recent_transactions} tone="sky" Icon={'📝'} />
      </div>
    </div>
  );
}

/* ============================================================
   Ingredients panel — list, filter, edit, adjust, delete
   ============================================================ */
function IngredientsPanel({
  items, loading,
  search, setSearch, category, setCategory,
  statusFilter, setStatusFilter, categories,
  onEdit, onAdjust, onDelete,
}) {
  return (
    <Card className="overflow-hidden">
      <div className="bg-white p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center gap-2">
        <div className="flex-1">
          <Input
            placeholder="Search by name or supplier…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">All categories</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All statuses</option>
            <option value="good">Good</option>
            <option value="low">Low</option>
            <option value="critical">Critical</option>
            <option value="out_of_stock">Out of stock</option>
          </Select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600 sticky top-0 z-10">
            <tr>
              <th className="text-left px-4 py-3 font-semibold">Name</th>
              <th className="text-left px-4 py-3 font-semibold">Category</th>
              <th className="text-right px-4 py-3 font-semibold">Stock</th>
              <th className="text-right px-4 py-3 font-semibold">Min / Reorder</th>
              <th className="text-right px-4 py-3 font-semibold">Cost/unit</th>
              <th className="text-left px-4 py-3 font-semibold">Supplier</th>
              <th className="text-left px-4 py-3 font-semibold">Status</th>
              <th className="text-right px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && (
              <tr><td colSpan={8} className="py-10 text-center text-slate-400">Loading…</td></tr>
            )}
            {!loading && items.length === 0 && (
              <tr><td colSpan={8} className="py-10 text-center text-slate-400">
                No ingredients found. Click “New ingredient” to add one.
              </td></tr>
            )}
            {!loading && items.map((i) => {
              const tone = stockTone(i.stock_status);
              return (
                <tr key={i.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5">
                    <div className="font-medium text-slate-900">{i.name}</div>
                    {i.storage_location && (
                      <div className="text-xs text-slate-500">📍 {i.storage_location}</div>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-slate-600">{i.category || '—'}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    <span className="font-semibold text-slate-900">{Number(i.current_stock).toFixed(2)}</span>
                    <span className="text-slate-500 ml-1">{i.unit}</span>
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">
                    {i.minimum_stock} / {i.reorder_point}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">
                    {fmtMoney(i.cost_per_unit)}
                  </td>
                  <td className="px-4 py-2.5 text-slate-600">
                    {i.supplier_name || '—'}
                    {i.supplier_contact && <div className="text-xs text-slate-400">{i.supplier_contact}</div>}
                  </td>
                  <td className="px-4 py-2.5">
                    <Pill className={`${tone.bg} ${tone.text} ring-1 ${tone.ring}`}>{tone.label}</Pill>
                  </td>
                  <td className="px-4 py-2.5 text-right whitespace-nowrap">
                    <button onClick={() => onAdjust(i)} className="text-indigo-600 hover:text-indigo-800 font-medium mr-3">Adjust</button>
                    <button onClick={() => onEdit(i)} className="text-slate-600 hover:text-slate-900 font-medium mr-3">Edit</button>
                    <button onClick={() => onDelete(i)} className="text-rose-600 hover:text-rose-800 font-medium">Delete</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

/* ============================================================
   Alerts panel
   ============================================================ */
function AlertsPanel({ alerts, onAck, onResolve }) {
  if (!alerts.length) {
    return <Card className="p-10 text-center text-slate-400">No active alerts. All inventory healthy ✅</Card>;
  }
  return (
    <div className="space-y-2">
      {alerts.map((a) => (
        <Card key={a.id} className="p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Pill className={priorityTone(a.priority)}>{a.priority}</Pill>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-slate-900 truncate">
                {a.ingredient_name || a.menu_item_name || 'Item'} — {a.alert_type.replace('_', ' ')}
              </div>
              <div className="text-xs text-slate-500">
                Stock {a.current_stock} {a.ingredient_unit || ''} · threshold {a.threshold_value} · {fmtDate(a.created_at)}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Btn variant="ghost" onClick={() => onAck(a.id)}>Acknowledge</Btn>
            <Btn variant="emerald" onClick={() => onResolve(a.id)}>Resolve</Btn>
          </div>
        </Card>
      ))}
    </div>
  );
}

/* ============================================================
   Transactions panel
   ============================================================ */
function TransactionsPanel({ transactions }) {
  if (!transactions.length) {
    return <Card className="p-10 text-center text-slate-400">No transactions yet.</Card>;
  }
  const txTone = (t) => ({
    ingredient_restock: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    product_restock:    'bg-emerald-50 text-emerald-700 ring-emerald-100',
    ingredient_usage:   'bg-sky-50 text-sky-700 ring-sky-100',
    sale:               'bg-sky-50 text-sky-700 ring-sky-100',
    adjustment:         'bg-violet-50 text-violet-700 ring-violet-100',
    waste:              'bg-rose-50 text-rose-700 ring-rose-100',
    expired:            'bg-rose-50 text-rose-700 ring-rose-100',
  }[t] || 'bg-slate-50 text-slate-700 ring-slate-100');

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600 sticky top-0 z-10">
            <tr>
              <th className="text-left px-4 py-2.5 font-semibold">When</th>
              <th className="text-left px-4 py-2.5 font-semibold">Type</th>
              <th className="text-left px-4 py-2.5 font-semibold">Item</th>
              <th className="text-right px-4 py-2.5 font-semibold">Change</th>
              <th className="text-right px-4 py-2.5 font-semibold">After</th>
              <th className="text-left px-4 py-2.5 font-semibold">Ref</th>
              <th className="text-left px-4 py-2.5 font-semibold">By</th>
              <th className="text-left px-4 py-2.5 font-semibold">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {transactions.map((t) => {
              const qty = t.ingredient_quantity_change ?? t.product_quantity_change;
              const after = t.ingredient_quantity_after ?? t.product_quantity_after;
              return (
                <tr key={t.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">{fmtDate(t.created_at)}</td>
                  <td className="px-4 py-2.5">
                    <Pill className={`ring-1 ${txTone(t.transaction_type)}`}>{t.transaction_type.replace(/_/g, ' ')}</Pill>
                  </td>
                  <td className="px-4 py-2.5 text-slate-900 font-medium">{t.ingredient_name || t.menu_item_name || '—'}</td>
                  <td className={`px-4 py-2.5 text-right tabular-nums font-medium ${Number(qty) < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {qty == null ? '—' : (Number(qty) > 0 ? '+' : '') + Number(qty).toFixed(2)}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">{after == null ? '—' : Number(after).toFixed(2)}</td>
                  <td className="px-4 py-2.5 text-slate-500">
                    {t.reference_type}{t.reference_id ? ` #${t.reference_id}` : ''}
                  </td>
                  <td className="px-4 py-2.5 text-slate-500">{t.created_by || '—'}</td>
                  <td className="px-4 py-2.5 text-slate-500 max-w-[260px] truncate">{t.notes || '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

/* ============================================================
   Recipes panel — list menu items, open recipe editor
   ============================================================ */
function RecipesPanel({ menuItems, onSelect }) {
  const [q, setQ] = useState('');
  const filtered = useMemo(() => {
    const s = q.toLowerCase();
    if (!s) return menuItems;
    return menuItems.filter((m) =>
      (m.name || '').toLowerCase().includes(s) ||
      (m.category || '').toLowerCase().includes(s)
    );
  }, [menuItems, q]);

  return (
    <Card className="overflow-hidden">
      <div className="sticky top-0 z-10 bg-white p-4 border-b border-slate-200">
        <Input
          placeholder="Search menu items to edit recipe…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4">
        {filtered.map((m) => (
          <button
            key={m.id}
            onClick={() => onSelect(m)}
            className="text-left bg-white ring-1 ring-slate-200 rounded-xl p-3 hover:ring-indigo-300 hover:shadow-md transition"
          >
            <div className="text-xs text-slate-500 uppercase tracking-wide">{m.category || 'menu'}</div>
            <div className="text-sm font-semibold text-slate-900 mt-1">{m.name}</div>
            <div className="text-xs text-slate-500 mt-1">{fmtMoney(m.price)}</div>
            <div className="mt-2 text-xs font-medium text-indigo-600">Edit recipe →</div>
          </button>
        ))}
        {!filtered.length && (
          <div className="col-span-full py-10 text-center text-slate-400">No menu items found.</div>
        )}
      </div>
    </Card>
  );
}

/* ============================================================
   Ingredient create/edit modal
   ============================================================ */
function IngredientModal({ ingredient, onClose, onSave }) {
  const editMode = !!ingredient?.id;
  const [form, setForm] = useState({
    name: ingredient?.name || '',
    category: ingredient?.category || 'vegetables',
    current_stock: ingredient?.current_stock ?? 0,
    minimum_stock: ingredient?.minimum_stock ?? 10,
    reorder_point: ingredient?.reorder_point ?? 20,
    unit: ingredient?.unit || 'kg',
    cost_per_unit: ingredient?.cost_per_unit ?? 0,
    supplier_name: ingredient?.supplier_name || '',
    supplier_contact: ingredient?.supplier_contact || '',
    expiry_date: ingredient?.expiry_date ? String(ingredient.expiry_date).slice(0, 10) : '',
    storage_location: ingredient?.storage_location || '',
    notes: ingredient?.notes || '',
  });

  const change = (k) => (e) => setForm((s) => ({ ...s, [k]: e.target.value }));

  const submit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    const payload = {
      ...form,
      current_stock: Number(form.current_stock),
      minimum_stock: Number(form.minimum_stock),
      reorder_point: Number(form.reorder_point),
      cost_per_unit: Number(form.cost_per_unit),
      expiry_date: form.expiry_date || null,
    };
    if (editMode) {
      payload.id = ingredient.id;
      delete payload.current_stock; // stock changes go via adjust-stock
    }
    onSave(payload);
  };

  return (
    <Modal open onClose={onClose} title={editMode ? `Edit ${ingredient.name}` : 'New ingredient'} maxW="max-w-2xl">
      <form onSubmit={submit} className="p-5 grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="Name *">
          <Input required value={form.name} onChange={change('name')} />
        </Field>
        <Field label="Category">
          <Select value={form.category} onChange={change('category')}>
            {CATEGORY_PRESETS.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
        </Field>
        {!editMode && (
          <Field label="Opening stock">
            <Input type="number" step="0.01" value={form.current_stock} onChange={change('current_stock')} />
          </Field>
        )}
        <Field label="Unit">
          <Select value={form.unit} onChange={change('unit')}>
            {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
          </Select>
        </Field>
        <Field label="Minimum stock">
          <Input type="number" step="0.01" value={form.minimum_stock} onChange={change('minimum_stock')} />
        </Field>
        <Field label="Reorder point">
          <Input type="number" step="0.01" value={form.reorder_point} onChange={change('reorder_point')} />
        </Field>
        <Field label="Cost per unit (Rs.)">
          <Input type="number" step="0.01" value={form.cost_per_unit} onChange={change('cost_per_unit')} />
        </Field>
        <Field label="Expiry date">
          <Input type="date" value={form.expiry_date} onChange={change('expiry_date')} />
        </Field>
        <Field label="Supplier name">
          <Input value={form.supplier_name} onChange={change('supplier_name')} />
        </Field>
        <Field label="Supplier contact">
          <Input value={form.supplier_contact} onChange={change('supplier_contact')} />
        </Field>
        <Field label="Storage location" className="md:col-span-2">
          <Input value={form.storage_location} onChange={change('storage_location')} placeholder="e.g., Dry storage shelf B3" />
        </Field>
        <Field label="Notes" className="md:col-span-2">
          <Textarea rows={2} value={form.notes} onChange={change('notes')} />
        </Field>

        <div className="md:col-span-2 flex justify-end gap-2 pt-2 border-t border-slate-100 mt-2">
          <Btn type="button" variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn type="submit">{editMode ? 'Save changes' : 'Create ingredient'}</Btn>
        </div>
      </form>
    </Modal>
  );
}

const Field = ({ label, children, className = '' }) => (
  <label className={`block ${className}`}>
    <div className="text-xs font-medium text-slate-600 mb-1">{label}</div>
    {children}
  </label>
);

/* ============================================================
   Stock adjust modal
   ============================================================ */
function AdjustStockModal({ ingredient, onClose, onSave }) {
  const [type, setType] = useState('restock');
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');

  const submit = (e) => {
    e.preventDefault();
    const q = Number(quantity);
    if (!q && type !== 'adjustment') return;
    onSave({ adjustment_type: type, quantity: q, notes });
  };

  return (
    <Modal open onClose={onClose} title={`Adjust stock — ${ingredient.name}`} maxW="max-w-md">
      <form onSubmit={submit} className="p-5 space-y-3">
        <div className="text-sm text-slate-600 bg-slate-50 ring-1 ring-slate-200 rounded-lg p-3">
          Current stock: <span className="font-semibold text-slate-900">{Number(ingredient.current_stock).toFixed(2)} {ingredient.unit}</span>
        </div>

        <Field label="Adjustment type">
          <Select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="restock">Restock (+ add)</option>
            <option value="waste">Waste (− deduct)</option>
            <option value="expired">Expired (− deduct)</option>
            <option value="adjustment">Set exact amount</option>
          </Select>
        </Field>

        <Field label={type === 'adjustment' ? 'New total quantity' : 'Quantity'}>
          <Input type="number" step="0.01" required value={quantity} onChange={(e) => setQuantity(e.target.value)} />
        </Field>

        <Field label="Notes">
          <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Reason, invoice #, batch, etc." />
        </Field>

        <div className="flex justify-end gap-2 pt-2">
          <Btn type="button" variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn type="submit" variant={type === 'waste' || type === 'expired' ? 'rose' : 'primary'}>Apply</Btn>
        </div>
      </form>
    </Modal>
  );
}

/* ============================================================
   Recipe modal — attach ingredients to a menu item
   ============================================================ */
function RecipeModal({ menuItem, onClose, toast }) {
  const [rows, setRows] = useState([]);
  const [totalCost, setTotalCost] = useState(0);
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newRow, setNewRow] = useState({ ingredient_id: '', quantity_required: '', unit: '', notes: '' });

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [recipe, ing] = await Promise.all([
        fetchApi.get(`/api/inventory/recipes/${menuItem.id}`),
        fetchApi.get('/api/inventory/ingredients?status=active'),
      ]);
      if (recipe.success) {
        setRows(recipe.data.ingredients || []);
        setTotalCost(recipe.data.total_cost || 0);
      }
      if (ing.success) setIngredients(ing.data);
    } catch (e) { toast('Failed to load recipe', 'error'); }
    finally { setLoading(false); }
  }, [menuItem.id, toast]);

  useEffect(() => { load(); }, [load]);

  const addIngredient = async (e) => {
    e.preventDefault();
    if (!newRow.ingredient_id || !newRow.quantity_required) return;
    try {
      const unit = newRow.unit ||
        ingredients.find((x) => x.id === Number(newRow.ingredient_id))?.unit || 'kg';
      const r = await fetchApi.post(`/api/inventory/recipes/${menuItem.id}/ingredients`, {
        ingredient_id: Number(newRow.ingredient_id),
        quantity_required: Number(newRow.quantity_required),
        unit,
        notes: newRow.notes,
      });
      if (!r.success) throw new Error(r.error || 'Failed');
      setNewRow({ ingredient_id: '', quantity_required: '', unit: '', notes: '' });
      toast('Ingredient added to recipe');
      await load();
    } catch (e2) { toast(e2.message || 'Failed', 'error'); }
  };

  const updateRow = async (row, patch) => {
    try {
      await fetchApi.put(
        `/api/inventory/recipes/${menuItem.id}/ingredients/${row.ingredient_id}`,
        patch
      );
      await load();
    } catch (e) { toast('Update failed', 'error'); }
  };

  const removeRow = async (row) => {
    // eslint-disable-next-line no-restricted-globals
    if (!confirm(`Remove "${row.ingredient_name}" from recipe?`)) return;
    try {
      await fetchApi.delete(`/api/inventory/recipes/${menuItem.id}/ingredients/${row.ingredient_id}`);
      toast('Removed');
      await load();
    } catch (e) { toast('Remove failed', 'error'); }
  };

  const existingIds = new Set(rows.map((r) => r.ingredient_id));
  const selectable = ingredients.filter((i) => !existingIds.has(i.id));

  return (
    <Modal open onClose={onClose} title={`Recipe — ${menuItem.name}`} maxW="max-w-3xl">
      <div className="p-5 space-y-4">
        <div className="flex items-center justify-between bg-gradient-to-br from-indigo-50 to-violet-50 ring-1 ring-indigo-100 rounded-xl p-4">
          <div>
            <div className="text-xs text-indigo-600 font-semibold uppercase tracking-wide">Total ingredient cost</div>
            <div className="text-2xl font-bold text-slate-900 mt-0.5">{fmtMoney(totalCost)}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-500">Selling price</div>
            <div className="text-lg font-semibold text-slate-900">{fmtMoney(menuItem.price)}</div>
            <div className="text-xs text-emerald-600 font-medium">
              margin: {fmtMoney(Number(menuItem.price || 0) - Number(totalCost || 0))}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="py-10 text-center text-slate-400">Loading…</div>
        ) : (
          <div className="rounded-xl ring-1 ring-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left px-3 py-2 font-semibold">Ingredient</th>
                  <th className="text-right px-3 py-2 font-semibold">Qty / serving</th>
                  <th className="text-left px-3 py-2 font-semibold">Unit</th>
                  <th className="text-right px-3 py-2 font-semibold">Stock</th>
                  <th className="text-right px-3 py-2 font-semibold">Line cost</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="px-3 py-2 text-slate-900 font-medium">{r.ingredient_name}</td>
                    <td className="px-3 py-2 text-right">
                      <input
                        type="number" step="0.01"
                        defaultValue={r.quantity_required}
                        onBlur={(e) => {
                          const v = Number(e.target.value);
                          if (v && v !== Number(r.quantity_required)) updateRow(r, { quantity_required: v });
                        }}
                        className="w-24 px-2 py-1 text-right border border-slate-200 rounded-md tabular-nums"
                      />
                    </td>
                    <td className="px-3 py-2 text-slate-600">{r.unit}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-600">
                      {Number(r.current_stock).toFixed(2)} {r.ingredient_unit}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-900 font-medium">
                      {fmtMoney(r.ingredient_cost)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button onClick={() => removeRow(r)} className="text-rose-600 hover:text-rose-800 text-xs font-medium">Remove</button>
                    </td>
                  </tr>
                ))}
                {!rows.length && (
                  <tr><td colSpan={6} className="py-8 text-center text-slate-400">No ingredients linked yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <form onSubmit={addIngredient} className="grid grid-cols-1 md:grid-cols-6 gap-2 bg-slate-50 ring-1 ring-slate-200 rounded-xl p-3">
          <div className="md:col-span-2">
            <Select
              value={newRow.ingredient_id}
              onChange={(e) => setNewRow((s) => ({ ...s, ingredient_id: e.target.value }))}
              required
            >
              <option value="">+ Add ingredient…</option>
              {selectable.map((i) => (
                <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>
              ))}
            </Select>
          </div>
          <Input
            type="number" step="0.01" placeholder="Qty"
            value={newRow.quantity_required}
            onChange={(e) => setNewRow((s) => ({ ...s, quantity_required: e.target.value }))}
            required
          />
          <Select
            value={newRow.unit}
            onChange={(e) => setNewRow((s) => ({ ...s, unit: e.target.value }))}
          >
            <option value="">unit…</option>
            {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
          </Select>
          <Input
            placeholder="Notes"
            value={newRow.notes}
            onChange={(e) => setNewRow((s) => ({ ...s, notes: e.target.value }))}
          />
          <Btn type="submit">Add</Btn>
        </form>

        <div className="flex justify-end">
          <Btn variant="ghost" onClick={onClose}>Close</Btn>
        </div>
      </div>
    </Modal>
  );
}
