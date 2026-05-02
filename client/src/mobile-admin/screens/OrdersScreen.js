import React, { useEffect, useMemo, useState } from 'react';
import { apiService } from '../../services/apiService';
import OrderCard from '../components/OrderCard';
import useHaptics from '../hooks/useHaptics';

const FILTERS = [
  { id: 'active',     label: 'Active' },
  { id: 'pending',    label: 'Pending' },
  { id: 'preparing',  label: 'Preparing' },
  { id: 'ready',      label: 'Ready' },
  { id: 'completed',  label: 'Completed' },
  { id: 'all',        label: 'All' },
];

const OrdersScreen = ({ onOpenOrder, liveOrders }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('active');
  const haptics = useHaptics();

  const load = async (isRefresh) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const resp = await apiService.getOrders();
      const list = resp?.data || resp || [];
      setOrders(Array.isArray(list) ? list : list.orders || []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(false); }, []);

  // Merge incoming live orders from socket
  useEffect(() => {
    if (!liveOrders || !liveOrders.length) return;
    setOrders((prev) => {
      const byId = new Map(prev.map((o) => [o.id || o._id, o]));
      liveOrders.forEach((o) => byId.set(o.id || o._id, o));
      return Array.from(byId.values()).sort((a, b) => {
        const ad = new Date(a.createdAt || a.created_at || 0).getTime();
        const bd = new Date(b.createdAt || b.created_at || 0).getTime();
        return bd - ad;
      });
    });
  }, [liveOrders]);

  const filtered = useMemo(() => {
    if (filter === 'all') return orders;
    if (filter === 'active') {
      return orders.filter((o) => ['pending', 'preparing', 'ready'].includes((o.status || '').toLowerCase()));
    }
    return orders.filter((o) => (o.status || '').toLowerCase() === filter);
  }, [orders, filter]);

  return (
    <div style={{ paddingBottom: 20 }}>
      <div className="m-chip-row" style={{ position: 'sticky', top: 0, background: 'var(--m-bg)', zIndex: 2 }}>
        {FILTERS.map((f) => {
          const active = filter === f.id;
          const count = f.id === 'all'
            ? orders.length
            : f.id === 'active'
              ? orders.filter((o) => ['pending', 'preparing', 'ready'].includes((o.status || '').toLowerCase())).length
              : orders.filter((o) => (o.status || '').toLowerCase() === f.id).length;
          return (
            <button
              key={f.id}
              className={`m-chip ${active ? 'active' : ''}`}
              onClick={() => { haptics.tap(); setFilter(f.id); }}
            >
              {f.label} {count > 0 && <span style={{ opacity: 0.7 }}>· {count}</span>}
            </button>
          );
        })}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0 16px 4px' }}>
        <button
          onClick={() => { haptics.tap(); load(true); }}
          style={{ background: 'transparent', border: 'none', color: 'var(--m-brand)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
        >
          {refreshing ? '⟳ Refreshing…' : '↻ Refresh'}
        </button>
      </div>

      {loading ? (
        <div style={{ padding: '0 12px' }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="m-skeleton" style={{ height: 90, marginBottom: 10, borderRadius: 14 }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="m-empty">
          <div className="m-empty-icon">🎉</div>
          <div className="m-empty-title">No {filter === 'active' ? 'active' : filter} orders</div>
          <div className="m-empty-msg">You're all caught up here</div>
        </div>
      ) : (
        filtered.map((o) => (
          <OrderCard key={o.id || o._id} order={o} onClick={() => onOpenOrder && onOpenOrder(o)} />
        ))
      )}
    </div>
  );
};

export default OrdersScreen;
