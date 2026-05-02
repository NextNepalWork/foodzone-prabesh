import React, { useEffect, useMemo, useState } from 'react';
import { apiService } from '../../services/apiService';
import Sheet from '../components/Sheet';
import useHaptics from '../hooks/useHaptics';

const CustomersScreen = () => {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('spent');
  const [selected, setSelected] = useState(null);
  const haptics = useHaptics();

  const load = async () => {
    setLoading(true);
    try {
      const resp = await apiService.getCustomers();
      const data = resp?.data || resp || [];
      setList(Array.isArray(data) ? data : []);
    } catch (e) {
      setList([]);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let arr = list;
    if (q) {
      arr = arr.filter((c) =>
        (c.name || '').toLowerCase().includes(q) ||
        (c.phone || '').toLowerCase().includes(q)
      );
    }
    return arr.slice().sort((a, b) => {
      if (sortBy === 'spent')  return Number(b.total_spent || 0) - Number(a.total_spent || 0);
      if (sortBy === 'orders') return Number(b.total_orders || b.actual_order_count || 0) - Number(a.total_orders || a.actual_order_count || 0);
      if (sortBy === 'recent') return new Date(b.last_order_date || b.created_at || 0) - new Date(a.last_order_date || a.created_at || 0);
      return (a.name || '').localeCompare(b.name || '');
    });
  }, [list, search, sortBy]);

  const totals = useMemo(() => ({
    count: list.length,
    revenue: list.reduce((s, c) => s + Number(c.total_spent || 0), 0),
    orders: list.reduce((s, c) => s + Number(c.total_orders || c.actual_order_count || 0), 0),
  }), [list]);

  return (
    <div style={{ paddingBottom: 30 }}>
      <div style={{ padding: '14px 16px 4px' }}>
        <div style={{ fontSize: 22, fontWeight: 800 }}>Customers</div>
        <div style={{ fontSize: 13, color: 'var(--m-text-2)' }}>
          {totals.count} total · Rs. {totals.revenue.toFixed(0)} revenue
        </div>
      </div>

      <div style={{ padding: '8px 16px' }}>
        <input
          className="m-input"
          placeholder="🔍 Search by name or phone"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ height: 42 }}
        />
      </div>

      <div className="m-chip-row">
        {[
          ['spent','💰 Top spenders'],
          ['orders','🛒 Most orders'],
          ['recent','🕒 Recent'],
          ['name','🔤 Name'],
        ].map(([k, label]) => (
          <button
            key={k}
            className={`m-chip ${sortBy === k ? 'active' : ''}`}
            onClick={() => { haptics.tap(); setSortBy(k); }}
          >{label}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: '0 12px' }}>
          {[1,2,3,4,5].map((i) => <div key={i} className="m-skeleton" style={{ height: 70, marginBottom: 8, borderRadius: 14 }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="m-empty">
          <div className="m-empty-icon">👥</div>
          <div className="m-empty-title">No customers</div>
          <div className="m-empty-msg">Customers from orders will appear here</div>
        </div>
      ) : (
        <div style={{ padding: '4px 12px' }}>
          {filtered.map((c) => {
            const orderCount = c.total_orders || c.actual_order_count || 0;
            return (
              <button
                key={c.id || c.phone}
                onClick={() => { haptics.tap(); setSelected(c); }}
                className="m-card"
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: 12, marginBottom: 8,
                  width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer',
                }}
              >
                <div style={{
                  width: 42, height: 42, borderRadius: 21, background: 'var(--m-brand)', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800,
                }}>
                  {(c.name || '?').charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {c.name || 'Unknown'}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--m-text-2)', marginTop: 2 }}>
                    {c.phone || '—'} · {orderCount} order{orderCount !== 1 ? 's' : ''}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 800, fontSize: 14 }}>Rs. {Number(c.total_spent || 0).toFixed(0)}</div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <Sheet open={!!selected} onClose={() => setSelected(null)} title={selected?.name || 'Customer'}>
        {selected && (
          <div style={{ padding: '0 16px 16px' }}>
            <div style={{ background: 'var(--m-surface-2)', padding: 14, borderRadius: 12, marginBottom: 10 }}>
              <Row label="Phone" value={selected.phone || '—'} />
              <Row label="Total orders" value={selected.total_orders || selected.actual_order_count || 0} />
              <Row label="Total spent" value={`Rs. ${Number(selected.total_spent || 0).toFixed(0)}`} />
              <Row label="Avg. order" value={`Rs. ${Number(selected.average_order_value || 0).toFixed(0)}`} />
              {selected.last_order_date && (
                <Row label="Last order" value={new Date(selected.last_order_date).toLocaleDateString()} />
              )}
              {selected.created_at && (
                <Row label="Customer since" value={new Date(selected.created_at).toLocaleDateString()} />
              )}
            </div>
            {selected.phone && (
              <a
                href={`tel:${selected.phone}`}
                className="m-btn-primary"
                style={{ display: 'block', textAlign: 'center', textDecoration: 'none', lineHeight: '44px' }}
              >📞 Call {selected.phone}</a>
            )}
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

export default CustomersScreen;
