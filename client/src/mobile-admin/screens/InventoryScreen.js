import React, { useEffect, useMemo, useState } from 'react';
import { fetchApi } from '../../services/apiService';
import Sheet from '../components/Sheet';
import useHaptics from '../hooks/useHaptics';

const STATUS_COLORS = {
  out_of_stock: '#dc2626',
  critical:     '#dc2626',
  low:          '#d97706',
  good:         '#16a34a',
};

const STATUS_LABELS = {
  out_of_stock: 'Out of stock',
  critical:     'Critical',
  low:          'Low',
  good:         'In stock',
};

const InventoryScreen = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [adjType, setAdjType] = useState('restock');
  const [adjQty, setAdjQty] = useState('');
  const [adjNotes, setAdjNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const haptics = useHaptics();

  const load = async () => {
    setLoading(true);
    try {
      const resp = await fetchApi.get('/api/inventory/ingredients');
      setItems(resp?.data || []);
    } catch (e) {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((i) => {
      if (filter !== 'all' && i.stock_status !== filter) return false;
      if (q && !(i.name || '').toLowerCase().includes(q)) return false;
      return true;
    });
  }, [items, filter, search]);

  const counts = useMemo(() => ({
    all: items.length,
    out_of_stock: items.filter((i) => i.stock_status === 'out_of_stock').length,
    critical: items.filter((i) => i.stock_status === 'critical').length,
    low: items.filter((i) => i.stock_status === 'low').length,
    good: items.filter((i) => i.stock_status === 'good').length,
  }), [items]);

  const openItem = (item) => {
    setSelected(item);
    setAdjType('restock');
    setAdjQty('');
    setAdjNotes('');
  };

  const submit = async () => {
    if (!selected) return;
    if (!adjQty || isNaN(Number(adjQty))) {
      alert('Enter a valid quantity');
      return;
    }
    setBusy(true);
    try {
      await fetchApi.post(`/api/inventory/ingredients/${selected.id}/adjust-stock`, {
        adjustment_type: adjType,
        quantity: Number(adjQty),
        notes: adjNotes || null,
      });
      haptics.success();
      setSelected(null);
      load();
    } catch (e) {
      haptics.warn();
      alert('Failed to adjust stock');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ paddingBottom: 30 }}>
      <div style={{ padding: '12px 16px 8px' }}>
        <input
          className="m-input"
          placeholder="🔍 Search ingredients"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ height: 42 }}
        />
      </div>

      <div className="m-chip-row">
        {['all', 'out_of_stock', 'critical', 'low', 'good'].map((f) => (
          <button
            key={f}
            className={`m-chip ${filter === f ? 'active' : ''}`}
            onClick={() => { haptics.tap(); setFilter(f); }}
          >
            {f === 'all' ? 'All' : STATUS_LABELS[f]} <span style={{ opacity: 0.7 }}>· {counts[f] || 0}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: '0 12px' }}>
          {[1,2,3,4].map((i) => <div key={i} className="m-skeleton" style={{ height: 70, marginBottom: 8, borderRadius: 14 }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="m-empty">
          <div className="m-empty-icon">📦</div>
          <div className="m-empty-title">No ingredients</div>
          <div className="m-empty-msg">Inventory is empty for this filter</div>
        </div>
      ) : (
        <div style={{ padding: '4px 12px' }}>
          {filtered.map((item) => (
            <button
              key={item.id}
              onClick={() => { haptics.tap(); openItem(item); }}
              className="m-card"
              style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: 12, marginBottom: 8,
                width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer',
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{item.name}</div>
                <div style={{ fontSize: 12, color: 'var(--m-text-2)', marginTop: 2 }}>
                  {item.category || 'uncategorized'} · {Number(item.current_stock).toFixed(2)} {item.unit || ''}
                </div>
              </div>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '4px 8px', borderRadius: 8,
                background: STATUS_COLORS[item.stock_status] + '22',
                color: STATUS_COLORS[item.stock_status],
              }}>
                {STATUS_LABELS[item.stock_status] || item.stock_status}
              </span>
            </button>
          ))}
        </div>
      )}

      <Sheet open={!!selected} onClose={() => setSelected(null)} title={selected?.name || ''}>
        {selected && (
          <div style={{ padding: '0 16px 16px' }}>
            <div style={{ background: 'var(--m-surface-2)', padding: 12, borderRadius: 12, marginBottom: 14 }}>
              <Row label="Current stock" value={`${Number(selected.current_stock).toFixed(2)} ${selected.unit || ''}`} />
              <Row label="Minimum" value={`${Number(selected.minimum_stock || 0).toFixed(2)}`} />
              <Row label="Reorder point" value={`${Number(selected.reorder_point || 0).toFixed(2)}`} />
              <Row label="Cost / unit" value={`Rs. ${Number(selected.cost_per_unit || 0).toFixed(2)}`} />
              {selected.supplier_name && <Row label="Supplier" value={selected.supplier_name} />}
            </div>

            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Adjust stock</div>
            <div className="m-chip-row" style={{ paddingLeft: 0 }}>
              {['restock','waste','expired','adjustment'].map((t) => (
                <button
                  key={t}
                  className={`m-chip ${adjType === t ? 'active' : ''}`}
                  onClick={() => setAdjType(t)}
                >{t}</button>
              ))}
            </div>
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 12, color: 'var(--m-text-2)', marginBottom: 4 }}>
                {adjType === 'adjustment' ? 'Set total to' : 'Quantity'} {selected.unit ? `(${selected.unit})` : ''}
              </div>
              <input className="m-input" type="number" value={adjQty} onChange={(e) => setAdjQty(e.target.value)} />
            </div>
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 12, color: 'var(--m-text-2)', marginBottom: 4 }}>Notes (optional)</div>
              <textarea className="m-input" value={adjNotes} onChange={(e) => setAdjNotes(e.target.value)}
                style={{ height: 60, padding: 10, resize: 'none' }} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="m-btn-secondary" style={{ flex: 1 }} onClick={() => setSelected(null)}>Cancel</button>
              <button className="m-btn-primary" style={{ flex: 1 }} onClick={submit} disabled={busy}>
                {busy ? 'Saving…' : 'Apply'}
              </button>
            </div>
          </div>
        )}
      </Sheet>
    </div>
  );
};

const Row = ({ label, value }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 }}>
    <span style={{ color: 'var(--m-text-2)' }}>{label}</span>
    <span style={{ fontWeight: 600 }}>{value}</span>
  </div>
);

export default InventoryScreen;
