import React, { useEffect, useMemo, useState } from 'react';
import { apiService } from '../../services/apiService';
import KPICard from '../components/KPICard';
import OrderCard from '../components/OrderCard';

const DashboardScreen = ({ onOpenOrder, onGoToOrders, onGoToTables }) => {
  const [orders, setOrders] = useState([]);
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    try {
      const [o, t] = await Promise.allSettled([
        apiService.getOrders(),
        apiService.getTableStatuses(),
      ]);
      if (o.status === 'fulfilled') {
        const list = o.value?.data || o.value || [];
        setOrders(Array.isArray(list) ? list : list.orders || []);
      }
      if (t.status === 'fulfilled') {
        const list = t.value?.data || t.value || [];
        setTables(Array.isArray(list) ? list : list.tables || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const kpis = useMemo(() => {
    const today = new Date().toDateString();
    const todayOrders = orders.filter((o) => {
      const d = new Date(o.createdAt || o.created_at || o.timestamp || 0);
      return d.toDateString() === today;
    });
    const revenue = todayOrders
      .filter((o) => (o.status || '').toLowerCase() === 'completed')
      .reduce((s, o) => s + Number(o.totalAmount || o.total || 0), 0);
    const pending = orders.filter((o) => ['pending', 'preparing', 'ready'].includes((o.status || '').toLowerCase())).length;
    const occupied = tables.filter((t) => (t.status || '').toLowerCase() !== 'empty').length;
    return {
      todayCount: todayOrders.length,
      revenue,
      pending,
      occupied,
      totalTables: tables.length || 25,
    };
  }, [orders, tables]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const recent = orders.slice(0, 5);

  return (
    <div style={{ paddingBottom: 20 }}>
      <div className="m-hero">
        <div className="m-hero-greet">{greeting} 👋</div>
        <div className="m-hero-name">Food Zone Admin</div>
        <div className="m-hero-sub">
          {kpis.pending > 0 ? `${kpis.pending} active order${kpis.pending !== 1 ? 's' : ''} need attention` : 'All caught up!'}
        </div>
      </div>

      <div className="m-section-label">Today</div>
      <div className="m-kpi-grid">
        <KPICard label="Orders" value={kpis.todayCount} loading={loading} />
        <KPICard label="Revenue" value={`Rs. ${kpis.revenue.toFixed(0)}`} loading={loading} />
        <KPICard
          label="Pending"
          value={kpis.pending}
          sub={kpis.pending > 0 ? 'needs action' : 'clear'}
          trend={kpis.pending > 0 ? 'down' : 'up'}
          loading={loading}
        />
        <KPICard
          label="Tables"
          value={`${kpis.occupied}/${kpis.totalTables}`}
          sub={kpis.occupied > 0 ? 'occupied' : 'all free'}
          loading={loading}
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 20px 8px' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--m-text-2)', textTransform: 'uppercase', letterSpacing: 0.6 }}>
          Recent Orders
        </div>
        <button
          onClick={onGoToOrders}
          style={{ background: 'transparent', border: 'none', color: 'var(--m-brand)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
        >
          View all →
        </button>
      </div>

      {loading ? (
        <div style={{ padding: '0 12px' }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="m-skeleton" style={{ height: 90, marginBottom: 10, borderRadius: 14 }} />
          ))}
        </div>
      ) : recent.length === 0 ? (
        <div className="m-empty">
          <div className="m-empty-icon">📭</div>
          <div className="m-empty-title">No orders yet</div>
          <div className="m-empty-msg">New orders will show up here live</div>
        </div>
      ) : (
        recent.map((o) => (
          <OrderCard key={o.id || o._id} order={o} onClick={() => onOpenOrder && onOpenOrder(o)} />
        ))
      )}

      <div style={{ padding: '8px 12px' }}>
        <button className="m-btn-secondary" style={{ width: '100%' }} onClick={onGoToTables}>
          🪑 Manage Tables
        </button>
      </div>
    </div>
  );
};

export default DashboardScreen;
