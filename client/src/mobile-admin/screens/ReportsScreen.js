import React, { useEffect, useMemo, useState } from 'react';
import { fetchApi } from '../../services/apiService';
import KPICard from '../components/KPICard';
import useHaptics from '../hooks/useHaptics';

const RANGES = [
  { id: 'today', label: 'Today' },
  { id: '7d',    label: '7 days' },
  { id: '30d',   label: '30 days' },
  { id: 'month', label: 'This Month' },
  { id: 'year',  label: 'Year' },
];

const ReportsScreen = () => {
  const [range, setRange] = useState('today');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [topItems, setTopItems] = useState([]);
  const haptics = useHaptics();

  const load = async () => {
    setLoading(true);
    try {
      const [summary, top] = await Promise.allSettled([
        fetchApi.get(`/api/reports/summary?range=${range}`),
        fetchApi.get(`/api/reports/top-items?range=${range}&limit=5`),
      ]);
      if (summary.status === 'fulfilled') {
        setData(summary.value || null);
      } else {
        setData(null);
      }
      if (top.status === 'fulfilled') {
        const v = top.value;
        setTopItems(Array.isArray(v) ? v : (v?.items || v?.data || []));
      } else {
        setTopItems([]);
      }
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [range]);

  const kpis = data?.kpis || {};
  const trend = useMemo(() => data?.trend || [], [data]);
  const paymentMix = data?.paymentMix || [];

  const chart = useMemo(() => {
    if (!trend.length) return null;
    const max = Math.max(...trend.map((t) => Number(t.revenue || 0)), 1);
    return trend.map((t) => ({ ...t, h: (Number(t.revenue || 0) / max) * 100 }));
  }, [trend]);

  const fmt = (v) => {
    const n = Number(v?.value ?? v ?? 0);
    return `Rs. ${n.toFixed(0)}`;
  };
  const cnt = (v) => Number(v?.value ?? v ?? 0);

  return (
    <div style={{ paddingBottom: 30 }}>
      <div style={{ padding: '14px 16px 4px' }}>
        <div style={{ fontSize: 22, fontWeight: 800 }}>Reports</div>
        <div style={{ fontSize: 13, color: 'var(--m-text-2)' }}>Performance overview</div>
      </div>

      <div className="m-chip-row">
        {RANGES.map((r) => (
          <button
            key={r.id}
            className={`m-chip ${range === r.id ? 'active' : ''}`}
            onClick={() => { haptics.tap(); setRange(r.id); }}
          >{r.label}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: '0 12px' }}>
          <div className="m-kpi-grid">
            {[1,2,3,4].map((i) => <div key={i} className="m-skeleton" style={{ height: 86, borderRadius: 14 }} />)}
          </div>
          <div className="m-skeleton" style={{ height: 160, margin: 12, borderRadius: 14 }} />
        </div>
      ) : !data ? (
        <div className="m-empty">
          <div className="m-empty-icon">📊</div>
          <div className="m-empty-title">No report data</div>
          <div className="m-empty-msg">Try a different range or check connection</div>
        </div>
      ) : (
        <>
          <div className="m-section-label">Key metrics</div>
          <div className="m-kpi-grid">
            <KPICard label="Revenue" value={fmt(kpis.revenue)} sub={pct(kpis.revenue?.change)} />
            <KPICard label="Orders" value={cnt(kpis.orders)} sub={pct(kpis.orders?.change)} />
            <KPICard label="Avg. Order" value={fmt(kpis.aov)} />
            <KPICard label="Customers" value={cnt(kpis.uniqueCustomers)} />
            <KPICard label="Net Profit" value={fmt(kpis.netProfit)} sub={pct(kpis.netProfit?.change)} />
            <KPICard label="Expenses" value={fmt(kpis.expenses)} />
          </div>

          {chart && (
            <div className="m-card" style={{ margin: 12, padding: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--m-text-2)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Revenue Trend
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 120 }}>
                {chart.map((t, i) => (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                    <div style={{
                      width: '100%', height: `${Math.max(t.h, 2)}%`,
                      background: 'linear-gradient(180deg, var(--m-brand), var(--m-brand-2))',
                      borderRadius: '4px 4px 0 0', minHeight: 2,
                    }} title={`${t.bucket}: Rs. ${Number(t.revenue).toFixed(0)}`} />
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 11, color: 'var(--m-text-2)', marginTop: 6, textAlign: 'center' }}>
                {chart.length} day{chart.length !== 1 ? 's' : ''} · max Rs. {Math.max(...trend.map((t) => Number(t.revenue || 0))).toFixed(0)}
              </div>
            </div>
          )}

          {paymentMix.length > 0 && (
            <div className="m-card" style={{ margin: 12, padding: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--m-text-2)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Payment Mix
              </div>
              {paymentMix.map((p) => (
                <div key={p.method} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13 }}>
                  <span>{p.method}</span>
                  <span style={{ fontWeight: 600 }}>Rs. {Number(p.amount).toFixed(0)} <span style={{ color: 'var(--m-text-2)', fontSize: 11 }}>· {p.count}</span></span>
                </div>
              ))}
            </div>
          )}

          {topItems.length > 0 && (
            <div className="m-card" style={{ margin: 12, padding: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--m-text-2)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Top Items
              </div>
              {topItems.map((it, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13 }}>
                  <span>{i+1}. {it.name || it.item_name}</span>
                  <span style={{ fontWeight: 600 }}>{it.quantity_sold || it.qty || it.count || it.quantity || 0} sold</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

const pct = (v) => {
  if (v === undefined || v === null) return undefined;
  const n = Number(v);
  if (!isFinite(n)) return undefined;
  return `${n >= 0 ? '+' : ''}${n.toFixed(1)}% vs prev`;
};

export default ReportsScreen;
