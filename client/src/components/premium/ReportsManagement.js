import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { fetchApi } from '../../services/apiService';
import { getApiUrl } from '../../config/api';

/* ============================================================
   ReportsManagement — advanced analytics & reporting suite.
   Tabs: Overview · Sales · Products · Customers · Operations · Inventory · Exports
   ============================================================ */

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

const fmtNPR = (n) => `Rs. ${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const fmtNPR2 = (n) => `Rs. ${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtNum = (n) => Number(n || 0).toLocaleString();
const fmtPct = (n, digits = 1) => `${Number(n || 0).toFixed(digits)}%`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString() : '—';
const fmtDateTime = (d) => d ? new Date(d).toLocaleString() : '—';

const isoDate = (d) => {
  const y = d.getFullYear(); const m = String(d.getMonth() + 1).padStart(2, '0'); const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
};

/* ============================================================
   Presentational atoms
   ============================================================ */
const Card = ({ children, className = '' }) => (
  <div className={`bg-white rounded-2xl ring-1 ring-slate-200 shadow-sm ${className}`}>{children}</div>
);

const SectionTitle = ({ title, sub, right }) => (
  <div className="flex items-end justify-between mb-3">
    <div>
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
    </div>
    {right}
  </div>
);

const Badge = ({ tone = 'slate', children }) => {
  const tones = {
    slate: 'bg-slate-100 text-slate-700',
    indigo: 'bg-indigo-100 text-indigo-700',
    emerald: 'bg-emerald-100 text-emerald-700',
    rose: 'bg-rose-100 text-rose-700',
    amber: 'bg-amber-100 text-amber-700',
    violet: 'bg-violet-100 text-violet-700',
    sky: 'bg-sky-100 text-sky-700',
  };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium ${tones[tone] || tones.slate}`}>{children}</span>;
};

const TrendPill = ({ value }) => {
  const v = Number(value || 0);
  const up = v >= 0;
  const color = up ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50';
  const arrow = up ? '▲' : '▼';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium ${color}`}>
      <span>{arrow}</span>
      <span className="tabular-nums">{Math.abs(v).toFixed(1)}%</span>
    </span>
  );
};

const Spinner = ({ size = 'md' }) => {
  const s = size === 'sm' ? 'w-3 h-3 border' : 'w-5 h-5 border-2';
  return <span className={`${s} rounded-full border-slate-300 border-t-indigo-500 animate-spin inline-block`} />;
};

/* ============================================================
   KPI Card with trend + optional sparkline
   ============================================================ */
const KpiCard = ({ label, value, change, tone = 'indigo', format = (v) => v, sparkline }) => {
  const toneStyles = {
    indigo: 'from-indigo-500 to-indigo-600',
    emerald: 'from-emerald-500 to-emerald-600',
    rose: 'from-rose-500 to-rose-600',
    amber: 'from-amber-500 to-amber-600',
    violet: 'from-violet-500 to-violet-600',
    sky: 'from-sky-500 to-sky-600',
  }[tone];
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">{label}</div>
          <div className="mt-1.5 text-2xl font-bold text-slate-900 tabular-nums truncate">{format(value)}</div>
          {change !== undefined && <div className="mt-1.5"><TrendPill value={change} /></div>}
        </div>
        <div className={`w-2 h-12 rounded-full bg-gradient-to-b ${toneStyles} opacity-80`} />
      </div>
      {sparkline && <div className="mt-3 -mb-1"><Sparkline points={sparkline} tone={tone} /></div>}
    </Card>
  );
};

/* ============================================================
   Charts — pure SVG, zero dependencies
   ============================================================ */
const Sparkline = ({ points, tone = 'indigo' }) => {
  if (!points || points.length === 0) return <div className="h-8" />;
  const w = 180, h = 32, pad = 2;
  const xs = points.map((_, i) => (i / Math.max(1, points.length - 1)) * (w - pad * 2) + pad);
  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
  const ys = points.map(v => h - pad - ((v - min) / Math.max(1, max - min)) * (h - pad * 2));
  const d = xs.map((x, i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${ys[i].toFixed(1)}`).join(' ');
  const area = `${d} L ${xs[xs.length - 1].toFixed(1)} ${h} L ${xs[0].toFixed(1)} ${h} Z`;
  const color = {
    indigo: '#6366f1', emerald: '#10b981', rose: '#f43f5e',
    amber: '#f59e0b', violet: '#8b5cf6', sky: '#0ea5e9',
  }[tone] || '#6366f1';
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none">
      <path d={area} fill={color} opacity="0.12" />
      <path d={d} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

const LineChart = ({ series, labels, height = 240, currency = false }) => {
  if (!series || series.length === 0 || !series[0].data || series[0].data.length === 0) {
    return <div className="h-60 flex items-center justify-center text-sm text-slate-400">No data in range</div>;
  }
  const w = 760;
  const h = height;
  const padL = 48, padR = 16, padT = 12, padB = 28;
  const n = series[0].data.length;
  const all = series.flatMap(s => s.data);
  const max = Math.max(...all, 1);
  const min = Math.min(0, ...all);
  const x = (i) => padL + (i / Math.max(1, n - 1)) * (w - padL - padR);
  const y = (v) => h - padB - ((v - min) / Math.max(1, max - min)) * (h - padT - padB);

  const colors = ['#6366f1', '#10b981', '#f59e0b', '#f43f5e', '#0ea5e9'];
  const ticks = 4;
  const tickVals = Array.from({ length: ticks + 1 }, (_, i) => min + (i * (max - min)) / ticks);

  const fmtTick = (v) => currency
    ? (v >= 1000 ? `${Math.round(v / 100) / 10}k` : Math.round(v))
    : (Number.isInteger(v) ? v : v.toFixed(1));

  const labelEvery = Math.max(1, Math.floor(n / 8));

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h}>
        {tickVals.map((v, i) => (
          <g key={i}>
            <line x1={padL} x2={w - padR} y1={y(v)} y2={y(v)} stroke="#e2e8f0" strokeDasharray="3 3" />
            <text x={padL - 6} y={y(v) + 4} fontSize="10" textAnchor="end" fill="#94a3b8">{fmtTick(v)}</text>
          </g>
        ))}
        {labels && labels.map((l, i) => (
          i % labelEvery === 0 ? (
            <text key={i} x={x(i)} y={h - 8} fontSize="10" textAnchor="middle" fill="#94a3b8">{l}</text>
          ) : null
        ))}
        {series.map((s, si) => {
          const color = s.color || colors[si % colors.length];
          const d = s.data.map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(v)}`).join(' ');
          const areaD = `${d} L ${x(s.data.length - 1)} ${y(min)} L ${x(0)} ${y(min)} Z`;
          return (
            <g key={si}>
              {s.fill !== false && <path d={areaD} fill={color} opacity="0.10" />}
              <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
              {s.data.map((v, i) => (
                <circle key={i} cx={x(i)} cy={y(v)} r="2" fill={color} />
              ))}
            </g>
          );
        })}
      </svg>
      {series.length > 1 && (
        <div className="flex items-center gap-4 mt-1 text-xs">
          {series.map((s, i) => (
            <span key={i} className="flex items-center gap-1.5 text-slate-600">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ background: s.color || colors[i % colors.length] }} />
              {s.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

const BarChart = ({ data, height = 240, currency = false, color = '#6366f1' }) => {
  if (!data || data.length === 0) return <div className="h-60 flex items-center justify-center text-sm text-slate-400">No data</div>;
  const w = 760;
  const h = height;
  const padL = 48, padR = 12, padT = 10, padB = 36;
  const max = Math.max(...data.map(d => d.value), 1);
  const bw = (w - padL - padR) / data.length;
  const y = (v) => h - padB - (v / max) * (h - padT - padB);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h}>
      {[0, 0.25, 0.5, 0.75, 1].map((p, i) => (
        <g key={i}>
          <line x1={padL} x2={w - padR} y1={padT + p * (h - padT - padB)} y2={padT + p * (h - padT - padB)}
            stroke="#e2e8f0" strokeDasharray="3 3" />
          <text x={padL - 6} y={padT + p * (h - padT - padB) + 4} fontSize="10" textAnchor="end" fill="#94a3b8">
            {currency ? (max * (1 - p) >= 1000 ? `${Math.round(max * (1 - p) / 100) / 10}k` : Math.round(max * (1 - p))) : Math.round(max * (1 - p))}
          </text>
        </g>
      ))}
      {data.map((d, i) => {
        const height_ = (h - padT - padB) - (y(d.value) - padT);
        return (
          <g key={i}>
            <rect x={padL + i * bw + 4} y={y(d.value)} width={Math.max(2, bw - 8)} height={Math.max(0, height_)}
              fill={d.color || color} rx="3" />
            <text x={padL + i * bw + bw / 2} y={h - 18} fontSize="10" textAnchor="middle" fill="#64748b">{d.label}</text>
            <text x={padL + i * bw + bw / 2} y={h - 6} fontSize="9" textAnchor="middle" fill="#94a3b8">
              {currency ? fmtNPR(d.value) : fmtNum(d.value)}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

const HorizontalBars = ({ data, max, currency = false, color = '#6366f1' }) => {
  if (!data || data.length === 0) return <div className="text-sm text-slate-400 py-4 text-center">No data</div>;
  const m = max ?? Math.max(...data.map(d => d.value), 1);
  return (
    <div className="space-y-2">
      {data.map((d, i) => {
        const pct = (d.value / m) * 100;
        return (
          <div key={i} className="flex items-center gap-3">
            <div className="w-36 truncate text-xs text-slate-700" title={d.label}>{d.label}</div>
            <div className="flex-1 h-6 bg-slate-100 rounded-md overflow-hidden relative">
              <div className="h-full rounded-md transition-all"
                style={{ width: `${pct}%`, background: d.color || color }} />
              {d.badge && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-slate-600">
                  {d.badge}
                </span>
              )}
            </div>
            <div className="w-28 text-right text-xs font-semibold text-slate-800 tabular-nums">
              {currency ? fmtNPR(d.value) : fmtNum(d.value)}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const Donut = ({ slices, size = 170, thickness = 28 }) => {
  const total = slices.reduce((s, v) => s + v.value, 0) || 1;
  const cx = size / 2, cy = size / 2;
  const r = (size - thickness) / 2;
  const colors = ['#6366f1', '#10b981', '#f59e0b', '#f43f5e', '#0ea5e9', '#8b5cf6', '#ec4899', '#14b8a6'];
  let acc = 0;
  const arcs = slices.map((s, i) => {
    const frac = s.value / total;
    const start = acc * Math.PI * 2 - Math.PI / 2;
    acc += frac;
    const end = acc * Math.PI * 2 - Math.PI / 2;
    const x1 = cx + r * Math.cos(start), y1 = cy + r * Math.sin(start);
    const x2 = cx + r * Math.cos(end), y2 = cy + r * Math.sin(end);
    const large = frac > 0.5 ? 1 : 0;
    const color = s.color || colors[i % colors.length];
    return { d: `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`, color };
  });
  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth={thickness} />
        {arcs.map((a, i) => (
          <path key={i} d={a.d} fill="none" stroke={a.color} strokeWidth={thickness} strokeLinecap="butt" />
        ))}
        <text x={cx} y={cy - 4} textAnchor="middle" fontSize="11" fill="#64748b">Total</text>
        <text x={cx} y={cy + 14} textAnchor="middle" fontSize="14" fontWeight="700" fill="#0f172a">
          {fmtNum(total)}
        </text>
      </svg>
      <div className="flex-1 space-y-1.5">
        {slices.map((s, i) => (
          <div key={i} className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-slate-700 truncate">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ background: s.color || colors[i % colors.length] }} />
              {s.label}
            </span>
            <span className="tabular-nums text-slate-600">
              {fmtNum(s.value)} · {((s.value / total) * 100).toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

const Heatmap = ({ grid, valueKey = 'orders' }) => {
  const max = Math.max(...grid.map(c => c[valueKey] || 0), 1);
  const cell = (v) => {
    if (v === 0) return '#f1f5f9';
    const t = v / max;
    const hue = 240; // indigo base
    const light = 96 - t * 50;
    return `hsl(${hue}, 75%, ${light}%)`;
  };
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[680px]">
        <div className="grid grid-cols-[40px_repeat(24,minmax(20px,1fr))] gap-[2px] text-[9px] text-slate-500">
          <div />
          {HOURS.map(h => <div key={h} className="text-center">{h}</div>)}
        </div>
        {DAYS.map((d, di) => (
          <div key={di} className="grid grid-cols-[40px_repeat(24,minmax(20px,1fr))] gap-[2px] mt-[2px] items-center">
            <div className="text-[10px] text-slate-600 font-medium">{d}</div>
            {HOURS.map(h => {
              const c = grid.find(g => g.dow === di && g.hour === h) || { orders: 0, revenue: 0 };
              const v = c[valueKey] || 0;
              return (
                <div key={h}
                  className="h-5 rounded-sm"
                  style={{ background: cell(v) }}
                  title={`${d} ${h}:00 — orders: ${c.orders}, revenue: ${fmtNPR(c.revenue)}`}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 mt-3 text-[10px] text-slate-500">
        <span>Less</span>
        {[0.1, 0.3, 0.5, 0.7, 0.9].map((t, i) => (
          <span key={i} className="w-5 h-3 rounded-sm" style={{ background: `hsl(240, 75%, ${96 - t * 50}%)` }} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
};

/* ============================================================
   Date range picker
   ============================================================ */
const PRESETS = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: '7d', label: 'Last 7 days' },
  { id: '30d', label: 'Last 30 days' },
  { id: 'month', label: 'This month' },
  { id: 'lastmonth', label: 'Last month' },
  { id: 'year', label: 'Year to date' },
  { id: 'all', label: 'All time' },
];

const DateRangePicker = ({ range, onChange }) => {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState({ from: '', to: '' });
  const wrapRef = useRef(null);

  useEffect(() => {
    const onClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const currentLabel = useMemo(() => {
    if (range.from && range.to) return `${range.from} → ${range.to}`;
    const p = PRESETS.find(p => p.id === range.preset);
    return p ? p.label : 'Today';
  }, [range]);

  return (
    <div className="relative" ref={wrapRef}>
      <button
        onClick={() => setOpen(o => !o)}
        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white ring-1 ring-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
        {currentLabel}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-[320px] bg-white rounded-xl ring-1 ring-slate-200 shadow-lg p-3 z-30">
          <div className="grid grid-cols-2 gap-1.5 mb-3">
            {PRESETS.map(p => (
              <button key={p.id}
                onClick={() => { onChange({ preset: p.id, from: '', to: '' }); setOpen(false); }}
                className={`text-left px-3 py-2 rounded-md text-xs font-medium transition
                  ${range.preset === p.id && !range.from ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200' : 'hover:bg-slate-50 text-slate-700'}`}>
                {p.label}
              </button>
            ))}
          </div>
          <div className="border-t border-slate-100 pt-3">
            <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 mb-2">Custom range</div>
            <div className="flex items-center gap-2">
              <input type="date" value={custom.from} onChange={e => setCustom(s => ({ ...s, from: e.target.value }))}
                className="flex-1 px-2 py-1.5 rounded-md ring-1 ring-slate-200 text-xs" />
              <span className="text-xs text-slate-400">→</span>
              <input type="date" value={custom.to} onChange={e => setCustom(s => ({ ...s, to: e.target.value }))}
                className="flex-1 px-2 py-1.5 rounded-md ring-1 ring-slate-200 text-xs" />
            </div>
            <button
              disabled={!custom.from || !custom.to}
              onClick={() => { onChange({ preset: 'custom', from: custom.from, to: custom.to }); setOpen(false); }}
              className="mt-2 w-full px-3 py-1.5 rounded-md bg-slate-900 text-white text-xs font-medium disabled:opacity-40">
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

/* ============================================================
   Main component
   ============================================================ */
const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'sales', label: 'Sales' },
  { id: 'pnl', label: 'Profit & Loss' },
  { id: 'expenses', label: 'Expenses' },
  { id: 'products', label: 'Products' },
  { id: 'customers', label: 'Customers' },
  { id: 'operations', label: 'Operations' },
  { id: 'inventory', label: 'Inventory' },
  { id: 'orders', label: 'Order History' },
  { id: 'exports', label: 'Exports' },
];

const buildQuery = (range, extra = {}) => {
  const p = new URLSearchParams();
  if (range.from && range.to) { p.set('from', range.from); p.set('to', range.to); }
  else p.set('range', range.preset || 'today');
  Object.entries(extra).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') p.set(k, v); });
  return p.toString();
};

const ReportsManagement = ({ pushToast }) => {
  const pushToastRef = useRef(pushToast);
  useEffect(() => { pushToastRef.current = pushToast; }, [pushToast]);
  const toast = useCallback((msg, tone = 'success') => pushToastRef.current?.(msg, tone), []);

  const [tab, setTab] = useState('overview');
  const [range, setRange] = useState({ preset: '30d', from: '', to: '' });
  const [refreshTick, setRefreshTick] = useState(0);

  const refresh = useCallback(() => setRefreshTick(t => t + 1), []);

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 100px)' }}>
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Reports & analytics</h2>
          <p className="text-sm text-slate-500 mt-0.5">Advanced insights into sales, customers, products, and operations.</p>
        </div>
        <div className="flex items-center gap-2">
          <DateRangePicker range={range} onChange={setRange} />
          <button onClick={refresh}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white ring-1 ring-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex-shrink-0 mt-4 border-b border-slate-200 overflow-x-auto">
        <div className="flex items-center gap-1 min-w-max">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px
                ${tab === t.id ? 'border-indigo-500 text-indigo-700' : 'border-transparent text-slate-600 hover:text-slate-900'}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 mt-4 overflow-auto fz-scroll pr-1">
        {tab === 'overview' && <OverviewPanel range={range} refreshTick={refreshTick} toast={toast} />}
        {tab === 'sales' && <SalesPanel range={range} refreshTick={refreshTick} toast={toast} />}
        {tab === 'pnl' && <PnlPanel range={range} refreshTick={refreshTick} toast={toast} />}
        {tab === 'expenses' && <ExpensesPanel range={range} refreshTick={refreshTick} refresh={refresh} toast={toast} />}
        {tab === 'products' && <ProductsPanel range={range} refreshTick={refreshTick} toast={toast} />}
        {tab === 'customers' && <CustomersPanel range={range} refreshTick={refreshTick} toast={toast} />}
        {tab === 'operations' && <OperationsPanel range={range} refreshTick={refreshTick} toast={toast} />}
        {tab === 'inventory' && <InventoryPanel range={range} refreshTick={refreshTick} toast={toast} />}
        {tab === 'orders' && <OrderHistoryPanel range={range} refreshTick={refreshTick} toast={toast} />}
        {tab === 'exports' && <ExportsPanel range={range} toast={toast} />}
      </div>
    </div>
  );
};

/* ============================================================
   Data fetching hook (stable)
   ============================================================ */
const useReport = (endpoint, deps) => {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  useEffect(() => {
    let cancelled = false;
    setState(s => ({ ...s, loading: true, error: null }));
    fetchApi.get(endpoint)
      .then(data => { if (!cancelled) setState({ data, loading: false, error: null }); })
      .catch(err => { if (!cancelled) setState({ data: null, loading: false, error: err.message || 'Error' }); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return state;
};

/* ============================================================
   Overview panel
   ============================================================ */
const OverviewPanel = ({ range, refreshTick }) => {
  const qs = useMemo(() => buildQuery(range), [range]);
  const { data: ov, loading } = useReport(`/api/reports/overview?${qs}`, [qs, refreshTick]);
  const { data: trend } = useReport(`/api/reports/sales-trend?${qs}&granularity=day`, [qs, refreshTick]);
  const { data: cat } = useReport(`/api/reports/category-breakdown?${qs}`, [qs, refreshTick]);
  const { data: pay } = useReport(`/api/reports/payment-mix?${qs}`, [qs, refreshTick]);
  const { data: typ } = useReport(`/api/reports/order-type-mix?${qs}`, [qs, refreshTick]);

  if (loading && !ov) return <LoadingState />;
  const k = ov?.kpis || {};
  const spark = (trend?.points || []).map(p => Number(p.revenue || 0));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Total revenue" value={k.totalRevenue?.value} change={k.totalRevenue?.change} tone="emerald" format={fmtNPR} sparkline={spark} />
        <KpiCard label="Orders" value={k.totalOrders?.value} change={k.totalOrders?.change} tone="indigo" format={fmtNum} />
        <KpiCard label="Avg order value" value={k.avgOrderValue?.value} change={k.avgOrderValue?.change} tone="violet" format={fmtNPR} />
        <KpiCard label="Unique customers" value={k.uniqueCustomers?.value} change={k.uniqueCustomers?.change} tone="sky" format={fmtNum} />
        <KpiCard label="Dine-in revenue" value={k.dineInRevenue?.value} change={k.dineInRevenue?.change} tone="amber" format={fmtNPR} />
        <KpiCard label="Delivery revenue" value={k.deliveryRevenue?.value} change={k.deliveryRevenue?.change} tone="rose" format={fmtNPR} />
        <KpiCard label="Discount given" value={k.totalDiscount?.value} change={k.totalDiscount?.change} tone="rose" format={fmtNPR} />
        <KpiCard label="Completion rate" value={k.completionRate} tone="emerald" format={v => `${v || 0}%`} />
      </div>

      <Card className="p-5">
        <SectionTitle title="Revenue trend" sub="Daily revenue across the selected period" />
        <LineChart
          series={[{ label: 'Revenue', data: (trend?.points || []).map(p => Number(p.revenue || 0)), color: '#6366f1' }]}
          labels={(trend?.points || []).map(p => new Date(p.bucket).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }))}
          currency
        />
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-5">
          <SectionTitle title="Category mix" sub="Revenue share by category" />
          <Donut slices={(cat?.categories || []).slice(0, 7).map(c => ({ label: c.category, value: Number(c.revenue || 0) }))} />
        </Card>
        <Card className="p-5">
          <SectionTitle title="Payment methods" sub={pay?.source ? `Source: ${pay.source}` : ''} />
          <Donut slices={(pay?.methods || []).map(m => ({ label: m.method, value: Number(m.amount || 0) }))} />
        </Card>
        <Card className="p-5">
          <SectionTitle title="Order type mix" sub="Dine-in vs delivery" />
          <Donut slices={(typ?.types || []).map(t => ({ label: t.type, value: Number(t.revenue || 0) }))} />
        </Card>
      </div>
    </div>
  );
};

/* ============================================================
   Sales panel
   ============================================================ */
const SalesPanel = ({ range, refreshTick }) => {
  const [granularity, setGranularity] = useState('day');
  const qs = useMemo(() => buildQuery(range, { granularity }), [range, granularity]);
  const { data: trend, loading } = useReport(`/api/reports/sales-trend?${qs}`, [qs, refreshTick]);
  const { data: hourly } = useReport(`/api/reports/hourly-load?${buildQuery(range)}`, [range, refreshTick]);
  const { data: heat } = useReport(`/api/reports/heatmap?${buildQuery(range)}`, [range, refreshTick]);
  const { data: typ } = useReport(`/api/reports/order-type-mix?${buildQuery(range)}`, [range, refreshTick]);

  if (loading && !trend) return <LoadingState />;
  const points = trend?.points || [];
  const labels = points.map(p => {
    const d = new Date(p.bucket);
    if (granularity === 'hour') return d.toLocaleTimeString(undefined, { hour: '2-digit' });
    if (granularity === 'month') return d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
    if (granularity === 'week') return `W${Math.ceil(d.getDate() / 7)} ${d.toLocaleDateString(undefined, { month: 'short' })}`;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  });

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <SectionTitle
          title="Sales over time"
          sub="Revenue and orders trend, side-by-side"
          right={
            <div className="inline-flex rounded-lg bg-slate-100 p-0.5">
              {['hour', 'day', 'week', 'month'].map(g => (
                <button key={g} onClick={() => setGranularity(g)}
                  className={`px-3 py-1 rounded-md text-xs font-medium capitalize ${granularity === g ? 'bg-white shadow text-slate-900' : 'text-slate-600'}`}>
                  {g}
                </button>
              ))}
            </div>
          }
        />
        <LineChart
          series={[
            { label: 'Revenue', data: points.map(p => Number(p.revenue || 0)), color: '#6366f1' },
            { label: 'Orders (×100)', data: points.map(p => Number(p.orders || 0) * 100), color: '#f59e0b', fill: false },
          ]}
          labels={labels}
          currency
          height={280}
        />
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <SectionTitle title="Hourly load" sub="Average activity by hour of day" />
          <BarChart
            data={(hourly?.hours || []).map(h => ({ label: `${h.hour}`, value: h.orders }))}
            height={220}
          />
        </Card>
        <Card className="p-5">
          <SectionTitle title="Dine-in vs delivery" sub="Revenue by channel" />
          <BarChart
            data={(typ?.types || []).map(t => ({ label: t.type, value: Number(t.revenue || 0), color: t.type === 'dine-in' ? '#8b5cf6' : '#f59e0b' }))}
            currency
            height={220}
          />
        </Card>
      </div>

      <Card className="p-5">
        <SectionTitle title="Peak hours heatmap" sub="Orders by day of week × hour of day" />
        <Heatmap grid={heat?.grid || []} valueKey="orders" />
      </Card>
    </div>
  );
};

/* ============================================================
   Products panel
   ============================================================ */
const ProductsPanel = ({ range, refreshTick }) => {
  const [metric, setMetric] = useState('revenue');
  const qsTop = useMemo(() => buildQuery(range, { metric, limit: 30 }), [range, metric]);
  const { data: top, loading } = useReport(`/api/reports/top-items?${qsTop}`, [qsTop, refreshTick]);
  const { data: slow } = useReport(`/api/reports/slow-movers?${buildQuery(range)}`, [range, refreshTick]);
  const { data: cat } = useReport(`/api/reports/category-breakdown?${buildQuery(range)}`, [range, refreshTick]);

  if (loading && !top) return <LoadingState />;
  const items = top?.items || [];
  const abc = { A: 0, B: 0, C: 0 };
  items.forEach(i => abc[i.abc] = (abc[i.abc] || 0) + 1);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Unique items sold" value={items.length} tone="indigo" format={fmtNum} />
        <KpiCard label="Revenue from top 30" value={items.reduce((s, i) => s + Number(i.revenue || 0), 0)} tone="emerald" format={fmtNPR} />
        <KpiCard label="A-class items (80%)" value={abc.A} tone="violet" format={fmtNum} />
        <KpiCard label="C-class items (tail)" value={abc.C} tone="rose" format={fmtNum} />
      </div>

      <Card className="p-5">
        <SectionTitle
          title="Top performing items"
          sub="Ranked with ABC analysis (A = top 80% of revenue)"
          right={
            <div className="inline-flex rounded-lg bg-slate-100 p-0.5">
              {[['revenue', 'By revenue'], ['qty', 'By qty']].map(([id, label]) => (
                <button key={id} onClick={() => setMetric(id)}
                  className={`px-3 py-1 rounded-md text-xs font-medium ${metric === id ? 'bg-white shadow text-slate-900' : 'text-slate-600'}`}>
                  {label}
                </button>
              ))}
            </div>
          }
        />
        <div className="overflow-x-auto -mx-2">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500">
                <th className="px-3 py-2">#</th>
                <th className="px-3 py-2">Item</th>
                <th className="px-3 py-2">Category</th>
                <th className="px-3 py-2 text-right">Qty sold</th>
                <th className="px-3 py-2 text-right">Revenue</th>
                <th className="px-3 py-2 text-right">Avg price</th>
                <th className="px-3 py-2 text-right">Share</th>
                <th className="px-3 py-2">ABC</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i, idx) => (
                <tr key={idx} className="border-t border-slate-100 hover:bg-slate-50/50">
                  <td className="px-3 py-2 text-slate-500 tabular-nums">{idx + 1}</td>
                  <td className="px-3 py-2 font-medium text-slate-900">{i.name}</td>
                  <td className="px-3 py-2 text-slate-600">{i.category || '—'}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmtNum(i.quantity_sold)}</td>
                  <td className="px-3 py-2 text-right tabular-nums font-semibold">{fmtNPR(i.revenue)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-600">{fmtNPR(i.avg_price)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-600">{fmtPct(i.revenue_share * 100)}</td>
                  <td className="px-3 py-2"><Badge tone={i.abc === 'A' ? 'emerald' : i.abc === 'B' ? 'amber' : 'rose'}>{i.abc}</Badge></td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={8} className="text-center py-8 text-sm text-slate-400">No sales in range</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <SectionTitle title="Category breakdown" sub="Revenue share by category" />
          <HorizontalBars
            data={(cat?.categories || []).slice(0, 10).map(c => ({
              label: c.category,
              value: Number(c.revenue || 0),
              badge: `${(Number(c.share || 0) * 100).toFixed(1)}%`,
            }))}
            currency
          />
        </Card>
        <Card className="p-5">
          <SectionTitle title="Slow movers" sub="Available items with least sales in range" />
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500">
                  <th className="px-2 py-2">Item</th>
                  <th className="px-2 py-2">Category</th>
                  <th className="px-2 py-2 text-right">Qty</th>
                  <th className="px-2 py-2 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {(slow?.items || []).slice(0, 15).map((s, i) => (
                  <tr key={i} className="border-t border-slate-100">
                    <td className="px-2 py-1.5 font-medium text-slate-900">{s.name}</td>
                    <td className="px-2 py-1.5 text-slate-600">{s.category || '—'}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{fmtNum(s.quantity_sold)}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{fmtNPR(s.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
};

/* ============================================================
   Customers panel
   ============================================================ */
const CustomersPanel = ({ range, refreshTick }) => {
  const qs = useMemo(() => buildQuery(range, { limit: 25 }), [range]);
  const { data, loading } = useReport(`/api/reports/customers?${qs}`, [qs, refreshTick]);
  if (loading && !data) return <LoadingState />;
  const top = data?.top || [];
  const mix = data?.mix || { new_customers: 0, returning_customers: 0 };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Customers in range" value={top.length} tone="indigo" format={fmtNum} />
        <KpiCard label="New customers" value={mix.new_customers} tone="emerald" format={fmtNum} />
        <KpiCard label="Returning" value={mix.returning_customers} tone="violet" format={fmtNum} />
        <KpiCard label="Top spender" value={top[0]?.spend || 0} tone="amber" format={fmtNPR} />
      </div>

      <Card className="p-5">
        <SectionTitle title="Top customers" sub="Ranked by spend in selected range" />
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500">
                <th className="px-3 py-2">#</th>
                <th className="px-3 py-2">Customer</th>
                <th className="px-3 py-2">Phone</th>
                <th className="px-3 py-2 text-right">Orders</th>
                <th className="px-3 py-2 text-right">Spend</th>
                <th className="px-3 py-2 text-right">AOV</th>
                <th className="px-3 py-2">First order</th>
                <th className="px-3 py-2">Last order</th>
              </tr>
            </thead>
            <tbody>
              {top.map((c, i) => (
                <tr key={i} className="border-t border-slate-100 hover:bg-slate-50/50">
                  <td className="px-3 py-2 text-slate-500 tabular-nums">{i + 1}</td>
                  <td className="px-3 py-2 font-medium text-slate-900">{c.customer_name || 'Guest'}</td>
                  <td className="px-3 py-2 text-slate-600">{c.customer_phone || '—'}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmtNum(c.orders)}</td>
                  <td className="px-3 py-2 text-right tabular-nums font-semibold">{fmtNPR(c.spend)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-600">{fmtNPR(c.avg_order_value)}</td>
                  <td className="px-3 py-2 text-xs text-slate-500">{fmtDate(c.first_order)}</td>
                  <td className="px-3 py-2 text-xs text-slate-500">{fmtDate(c.last_order)}</td>
                </tr>
              ))}
              {top.length === 0 && <tr><td colSpan={8} className="text-center py-8 text-sm text-slate-400">No customer data</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="p-5">
        <SectionTitle title="New vs returning" sub="Based on first-ever order date" />
        <Donut slices={[
          { label: 'New', value: mix.new_customers, color: '#10b981' },
          { label: 'Returning', value: mix.returning_customers, color: '#6366f1' },
        ]} />
      </Card>
    </div>
  );
};

/* ============================================================
   Operations panel
   ============================================================ */
const OperationsPanel = ({ range, refreshTick }) => {
  const qs = useMemo(() => buildQuery(range), [range]);
  const { data: heat } = useReport(`/api/reports/heatmap?${qs}`, [qs, refreshTick]);
  const { data: tbl, loading } = useReport(`/api/reports/table-performance?${qs}`, [qs, refreshTick]);
  const { data: disc } = useReport(`/api/reports/discounts?${qs}`, [qs, refreshTick]);
  const { data: staff } = useReport(`/api/reports/staff-activity?${qs}`, [qs, refreshTick]);

  if (loading && !tbl) return <LoadingState />;
  const tables = tbl?.tables || [];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Active tables" value={tables.length} tone="indigo" format={fmtNum} />
        <KpiCard label="Discounted orders" value={disc?.discounted_orders || 0} tone="rose" format={fmtNum} />
        <KpiCard label="Total discount" value={disc?.total_discount || 0} tone="amber" format={fmtNPR} />
        <KpiCard label="Total delivery fees" value={disc?.total_delivery_fee || 0} tone="violet" format={fmtNPR} />
      </div>

      <Card className="p-5">
        <SectionTitle title="Peak staffing heatmap" sub="Plan shifts by observing busiest day-hour cells" />
        <Heatmap grid={heat?.grid || []} valueKey="orders" />
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <SectionTitle title="Table performance" sub="Revenue and activity per dine-in table" />
          <HorizontalBars
            data={tables.slice(0, 15).map(t => ({
              label: `Table ${t.table_id}`,
              value: Number(t.revenue || 0),
              badge: `${t.orders} orders`,
            }))}
            currency
          />
        </Card>

        <Card className="p-5">
          <SectionTitle title="Cashier activity" sub={staff?.enabled ? 'Based on daybook transactions' : 'Daybook not initialized'} />
          {staff?.enabled ? (
            <HorizontalBars
              data={(staff.transactions || []).map(t => ({
                label: String(t.transaction_type).replace(/_/g, ' '),
                value: Number(t.amount || 0),
                badge: `${t.count}×`,
              }))}
              currency
            />
          ) : (
            <div className="text-center text-sm text-slate-400 py-8">
              No staff transaction data available
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

/* ============================================================
   Inventory panel
   ============================================================ */
const InventoryPanel = ({ refreshTick }) => {
  const { data, loading } = useReport('/api/reports/inventory-valuation', [refreshTick]);
  if (loading && !data) return <LoadingState />;
  if (!data?.enabled) {
    return (
      <Card className="p-10 text-center">
        <p className="text-sm text-slate-500">Inventory module is not initialized yet.</p>
      </Card>
    );
  }

  const s = data.summary || {};
  const cats = data.by_category || [];
  const crit = data.critical || [];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Total stock value" value={Number(s.total_value || 0)} tone="emerald" format={fmtNPR} />
        <KpiCard label="Active ingredients" value={Number(s.ingredient_count || 0)} tone="indigo" format={fmtNum} />
        <KpiCard label="Critical / low" value={Number(s.critical_count || 0) + Number(s.low_count || 0)} tone="amber" format={fmtNum} />
        <KpiCard label="Out of stock" value={Number(s.out_count || 0)} tone="rose" format={fmtNum} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <SectionTitle title="Stock value by category" />
          <HorizontalBars
            data={cats.map(c => ({ label: c.category, value: Number(c.value || 0), badge: `${c.count} items` }))}
            currency
          />
        </Card>

        <Card className="p-5">
          <SectionTitle title="Critical ingredients" sub="At or below reorder point — restock soon" />
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500">
                  <th className="px-2 py-2">Item</th>
                  <th className="px-2 py-2 text-right">Stock</th>
                  <th className="px-2 py-2 text-right">Reorder</th>
                  <th className="px-2 py-2 text-right">Value</th>
                </tr>
              </thead>
              <tbody>
                {crit.map(c => (
                  <tr key={c.id} className="border-t border-slate-100">
                    <td className="px-2 py-1.5 font-medium text-slate-900">{c.name}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{Number(c.current_stock)} {c.unit}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums text-slate-600">{Number(c.reorder_point)} {c.unit}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{fmtNPR(c.value)}</td>
                  </tr>
                ))}
                {crit.length === 0 && (
                  <tr><td colSpan={4} className="text-center py-6 text-sm text-slate-400">All stock healthy</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
};

/* ============================================================
   Order History panel
   ============================================================ */
const OrderHistoryPanel = ({ range, refreshTick, toast }) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  
  const qs = useMemo(() => buildQuery(range, { 
    search, 
    status: statusFilter !== 'all' ? statusFilter : undefined,
    payment_status: paymentFilter !== 'all' ? paymentFilter : undefined,
    order_type: typeFilter !== 'all' ? typeFilter : undefined
  }), [range, search, statusFilter, paymentFilter, typeFilter]);
  
  const { data, loading } = useReport(`/api/orders?${qs}`, [qs, refreshTick]);
  
  const orders = data?.orders || [];
  const total = orders.reduce((sum, o) => sum + Number(o.total || 0), 0);

  const exportToCSV = () => {
    if (orders.length === 0) {
      toast('No orders to export', 'error');
      return;
    }
    
    const headers = ['Order #', 'Date/Time', 'Customer', 'Phone', 'Table', 'Type', 'Items', 'Amount', 'Status', 'Payment Status', 'Payment Method'];
    const rows = orders.map(o => [
      o.order_number || o.id,
      fmtDateTime(o.created_at),
      o.customer_name || 'Guest',
      o.customer_phone || '—',
      o.table_id ? `Table ${o.table_id}` : '—',
      o.order_type || 'dine-in',
      (o.items || []).map(i => `${i.name} (${i.quantity})`).join('; '),
      o.total,
      o.status || 'pending',
      o.payment_status || 'pending',
      o.payment_method || '—'
    ]);
    
    const csv = [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const r = range.from && range.to ? `${range.from}_${range.to}` : (range.preset || 'today');
    a.download = `order_history_${r}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast('Order history exported', 'success');
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Total orders" value={orders.length} tone="indigo" format={fmtNum} />
        <KpiCard label="Total revenue" value={total} tone="emerald" format={fmtNPR} />
        <KpiCard label="Completed" value={orders.filter(o => o.status === 'completed').length} tone="violet" format={fmtNum} />
        <KpiCard label="Paid" value={orders.filter(o => o.payment_status === 'paid').length} tone="sky" format={fmtNum} />
      </div>

      <Card className="p-5">
        <SectionTitle 
          title="Order history" 
          sub={`${orders.length} order${orders.length === 1 ? '' : 's'} in selected range`}
          right={
            <button onClick={exportToCSV}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 text-white text-xs font-medium hover:bg-slate-800">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Export CSV
            </button>
          }
        />
        
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
          <Field label="Search">
            <input 
              type="text" 
              placeholder="Order #, customer, phone..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full px-3 py-2 rounded-lg ring-1 ring-slate-200 text-sm" 
            />
          </Field>
          <Field label="Status">
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-lg ring-1 ring-slate-200 text-sm bg-white">
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="preparing">Preparing</option>
              <option value="ready">Ready</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </Field>
          <Field label="Payment">
            <select value={paymentFilter} onChange={e => setPaymentFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-lg ring-1 ring-slate-200 text-sm bg-white">
              <option value="all">All payments</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="failed">Failed</option>
            </select>
          </Field>
          <Field label="Type">
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-lg ring-1 ring-slate-200 text-sm bg-white">
              <option value="all">All types</option>
              <option value="dine-in">Dine-in</option>
              <option value="delivery">Delivery</option>
              <option value="takeaway">Takeaway</option>
            </select>
          </Field>
        </div>

        {loading && !orders.length ? <LoadingState /> : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500">
                  <th className="px-3 py-2">Order #</th>
                  <th className="px-3 py-2">Date/Time</th>
                  <th className="px-3 py-2">Customer</th>
                  <th className="px-3 py-2">Phone</th>
                  <th className="px-3 py-2">Table</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Items</th>
                  <th className="px-3 py-2 text-right">Amount</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Payment</th>
                  <th className="px-3 py-2">Method</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o, i) => (
                  <tr key={i} className="border-t border-slate-100 hover:bg-slate-50/50">
                    <td className="px-3 py-2 font-medium text-slate-900 tabular-nums">#{o.order_number || o.id}</td>
                    <td className="px-3 py-2 text-xs text-slate-600">{fmtDateTime(o.created_at)}</td>
                    <td className="px-3 py-2 text-slate-700">{o.customer_name || 'Guest'}</td>
                    <td className="px-3 py-2 text-slate-600">{o.customer_phone || '—'}</td>
                    <td className="px-3 py-2 text-slate-600">{o.table_id ? `Table ${o.table_id}` : '—'}</td>
                    <td className="px-3 py-2">
                      <Badge tone={o.order_type === 'delivery' ? 'amber' : o.order_type === 'takeaway' ? 'violet' : 'slate'}>
                        {o.order_type || 'dine-in'}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-slate-600">
                      {(o.items || []).length} item{(o.items || []).length === 1 ? '' : 's'}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums font-semibold">{fmtNPR(o.total)}</td>
                    <td className="px-3 py-2">
                      <Badge tone={
                        o.status === 'completed' ? 'emerald' :
                        o.status === 'ready' ? 'sky' :
                        o.status === 'preparing' ? 'amber' :
                        o.status === 'cancelled' ? 'rose' : 'slate'
                      }>
                        {o.status || 'pending'}
                      </Badge>
                    </td>
                    <td className="px-3 py-2">
                      <Badge tone={o.payment_status === 'paid' ? 'emerald' : o.payment_status === 'failed' ? 'rose' : 'amber'}>
                        {o.payment_status || 'pending'}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-slate-600 capitalize">{o.payment_method || '—'}</td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr><td colSpan={11} className="text-center py-8 text-sm text-slate-400">No orders found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

/* ============================================================
   Exports panel
   ============================================================ */
const ExportsPanel = ({ range, toast }) => {
  const [busy, setBusy] = useState(null);

  const download = async (type) => {
    setBusy(type);
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('staffToken');
      const url = getApiUrl(`/api/reports/export?${buildQuery(range, { type })}`);
      const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (!res.ok) throw new Error(`Export failed: ${res.status}`);
      const blob = await res.blob();
      const urlObj = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = urlObj;
      const r = range.from && range.to ? `${range.from}_${range.to}` : (range.preset || 'today');
      a.download = `foodzone_${type}_${r}.csv`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(urlObj);
      toast(`${type} exported`, 'success');
    } catch (e) {
      toast(e.message || 'Export failed', 'error');
    } finally {
      setBusy(null);
    }
  };

  const Tile = ({ type, title, desc }) => (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-slate-900">{title}</h3>
          <p className="text-xs text-slate-500 mt-1">{desc}</p>
        </div>
        <button onClick={() => download(type)} disabled={busy === type}
          className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 text-white text-xs font-medium hover:bg-slate-800 disabled:opacity-50">
          {busy === type ? <Spinner size="sm" /> : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>}
          Download CSV
        </button>
      </div>
    </Card>
  );

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <p className="text-xs text-slate-600">
          Exports respect the date range you selected at the top. Use these CSVs for accounting, reconciliation, or BI tools.
        </p>
      </Card>
      <Tile type="orders" title="Orders export" desc="All orders with customer, totals, discount, delivery, and payment status" />
      <Tile type="items" title="Line items export" desc="Every order line item (useful for product mix analysis in Excel / BI)" />
      <Tile type="payments" title="Payments export" desc="Payment transactions — sourced from payments table if present, else from orders" />
    </div>
  );
};

/* ============================================================
   Profit & Loss panel
   ============================================================ */
const PnlPanel = ({ range, refreshTick }) => {
  const [cogsRatio, setCogsRatio] = useState(0.35);
  const qs = useMemo(() => buildQuery(range, { cogs_ratio: cogsRatio }), [range, cogsRatio]);
  const { data, loading } = useReport(`/api/reports/profit-loss?${qs}`, [qs, refreshTick]);
  const { data: trend } = useReport(`/api/reports/profit-loss-trend?${qs}`, [qs, refreshTick]);

  if (loading && !data) return <LoadingState />;
  if (!data) return <LoadingState />;

  const r = data.revenue || {};
  const c = data.cogs || {};
  const gp = data.gross_profit || {};
  const ex = data.expenses || { by_kind: {}, by_category: [] };
  const np = data.net_profit || {};
  const byKind = ex.by_kind || {};

  const points = (trend?.points) || [];
  const labels = points.map(p => new Date(p.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }));

  const profitTone = (np.amount >= 0) ? 'emerald' : 'rose';

  return (
    <div className="space-y-4">
      {/* Top KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KpiCard label="Gross revenue" value={r.gross} change={r.change} tone="emerald" format={fmtNPR} />
        <KpiCard label="Est. COGS" value={c.amount} tone="amber" format={fmtNPR} />
        <KpiCard label="Gross profit" value={gp.amount} tone="indigo" format={fmtNPR} />
        <KpiCard label="Operating expenses" value={ex.opex} tone="rose" format={fmtNPR} />
        <KpiCard label="Net profit" value={np.amount} tone={profitTone} format={fmtNPR} />
      </div>

      {/* Margins */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">Gross margin</div>
          <div className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">{fmtPct(gp.margin)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">Net margin</div>
          <div className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">{fmtPct(np.margin)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">Orders in period</div>
          <div className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">{fmtNum(r.orders)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">Profit / order</div>
          <div className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">
            {fmtNPR(r.orders ? np.amount / r.orders : 0)}
          </div>
        </Card>
      </div>

      {/* COGS controls */}
      <Card className="p-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="text-sm font-semibold text-slate-900">COGS method</div>
            <div className="text-xs text-slate-500 mt-0.5">
              Source: <Badge tone={c.source === 'expenses' ? 'emerald' : c.source === 'ingredients' ? 'indigo' : 'amber'}>{c.source}</Badge>
              {c.source === 'ratio' && ' · adjust ratio below when no recorded COGS / recipes'}
              {c.source === 'ingredients' && ' · computed from recipes × ingredient costs'}
              {c.source === 'expenses' && ' · using recorded “ingredient / raw materials” style expenses'}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-xs text-slate-600">Fallback COGS ratio:</label>
            <input type="range" min="0.15" max="0.65" step="0.01" value={cogsRatio}
              onChange={e => setCogsRatio(Number(e.target.value))} className="w-40" />
            <span className="text-sm font-semibold tabular-nums w-12">{(cogsRatio * 100).toFixed(0)}%</span>
          </div>
        </div>
      </Card>

      {/* P&L statement table */}
      <Card className="p-5">
        <SectionTitle title="Profit & Loss statement" sub="Based on recorded orders and expenses in the selected range" />
        <div className="space-y-1 text-sm">
          <PnlRow label="Gross revenue" value={r.gross} bold />
          <PnlRow label="Less: discounts given" value={-Number(r.discounts || 0)} muted />
          <PnlRow label="Add: delivery fees" value={Number(r.delivery_fees || 0)} muted />
          <PnlRow label="Less: cost of goods sold" value={-Number(c.amount || 0)} />
          <div className="h-px bg-slate-200 my-2" />
          <PnlRow label="Gross profit" value={gp.amount} bold tone={gp.amount >= 0 ? 'emerald' : 'rose'} />
          <div className="pt-3 text-[11px] uppercase tracking-wider font-semibold text-slate-500">Operating expenses</div>
          <PnlRow label="Payroll" value={-(byKind.payroll || 0)} />
          <PnlRow label="Rent" value={-(byKind.rent || 0)} />
          <PnlRow label="Utilities" value={-(byKind.utilities || 0)} />
          <PnlRow label="Marketing" value={-(byKind.marketing || 0)} />
          <PnlRow label="Tax & licenses" value={-(byKind.tax || 0)} />
          <PnlRow label="Other operating" value={-(byKind.operating || 0)} />
          <PnlRow label="Misc / other" value={-(byKind.other || 0)} />
          <PnlRow label="Total operating expenses" value={-Number(ex.opex || 0)} bold />
          <div className="h-px bg-slate-300 my-2" />
          <PnlRow label="Net profit" value={np.amount} bold tone={np.amount >= 0 ? 'emerald' : 'rose'} />
        </div>
      </Card>

      {/* Trend chart */}
      <Card className="p-5">
        <SectionTitle title="Daily revenue vs expenses vs profit" sub="Profit = revenue − COGS − expenses (day-level)" />
        <LineChart
          series={[
            { label: 'Revenue', data: points.map(p => Number(p.revenue || 0)), color: '#10b981' },
            { label: 'Expenses', data: points.map(p => Number(p.expenses || 0) + Number(p.cogs_est || 0)), color: '#f43f5e' },
            { label: 'Profit', data: points.map(p => Number(p.profit || 0)), color: '#6366f1' },
          ]}
          labels={labels}
          currency
          height={280}
        />
      </Card>

      {/* Expenses breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <SectionTitle title="Expenses by category" sub="Recorded in the selected period" />
          <HorizontalBars
            data={(ex.by_category || []).map(c => ({
              label: c.category,
              value: Number(c.amount || 0),
              badge: c.kind,
            }))}
            currency
          />
        </Card>
        <Card className="p-5">
          <SectionTitle title="Expenses by kind" />
          <Donut slices={Object.entries(byKind)
            .filter(([, v]) => v > 0)
            .map(([k, v]) => ({ label: k, value: Number(v) }))} />
        </Card>
      </div>
    </div>
  );
};

const PnlRow = ({ label, value, bold, muted, tone }) => {
  const v = Number(value || 0);
  const color = tone === 'emerald' ? 'text-emerald-700'
    : tone === 'rose' ? 'text-rose-700'
    : muted ? 'text-slate-500' : 'text-slate-800';
  return (
    <div className={`flex items-center justify-between py-1 ${bold ? 'font-semibold' : ''} ${color}`}>
      <span>{label}</span>
      <span className="tabular-nums">{fmtNPR2(v)}</span>
    </div>
  );
};

/* ============================================================
   Expenses panel — CRUD
   ============================================================ */
const ExpensesPanel = ({ range, refreshTick, refresh, toast }) => {
  const qs = useMemo(() => buildQuery(range), [range]);
  const { data, loading } = useReport(`/api/reports/expenses?${qs}`, [qs, refreshTick]);
  const { data: catData } = useReport('/api/reports/expense-categories', [refreshTick]);
  const [form, setForm] = useState({
    expense_date: isoDate(new Date()),
    category: '',
    amount: '',
    vendor: '',
    payment_method: 'cash',
    description: '',
    reference_number: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const categories = catData?.categories || [];
  const expenses = data?.expenses || [];

  const resetForm = () => {
    setForm({
      expense_date: isoDate(new Date()),
      category: categories[0]?.name || '',
      amount: '', vendor: '', payment_method: 'cash',
      description: '', reference_number: '', notes: '',
    });
    setEditingId(null);
  };

  useEffect(() => {
    if (!form.category && categories.length) setForm(f => ({ ...f, category: categories[0].name }));
  }, [categories, form.category]);

  const save = async () => {
    if (!form.category || !form.amount) {
      toast('Category and amount are required', 'error');
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await fetchApi.put(`/api/reports/expenses/${editingId}`, { ...form, amount: Number(form.amount) });
        toast('Expense updated', 'success');
      } else {
        await fetchApi.post('/api/reports/expenses', { ...form, amount: Number(form.amount) });
        toast('Expense added', 'success');
      }
      resetForm();
      refresh();
    } catch (e) {
      toast(e.message || 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const editRow = (e) => {
    setEditingId(e.id);
    setForm({
      expense_date: (e.expense_date || '').split('T')[0] || isoDate(new Date()),
      category: e.category || '',
      amount: String(e.amount || ''),
      vendor: e.vendor || '',
      payment_method: e.payment_method || 'cash',
      description: e.description || '',
      reference_number: e.reference_number || '',
      notes: e.notes || '',
    });
  };

  const removeRow = async (id) => {
    if (!window.confirm('Delete this expense?')) return;
    try {
      await fetchApi.delete(`/api/reports/expenses/${id}`);
      toast('Deleted', 'success');
      refresh();
    } catch (e) {
      toast(e.message || 'Delete failed', 'error');
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Expenses in range" value={data?.total || 0} tone="rose" format={fmtNPR} />
        <KpiCard label="Entries" value={data?.count || 0} tone="indigo" format={fmtNum} />
        <KpiCard label="Avg per entry" value={data?.count ? (data.total / data.count) : 0} tone="amber" format={fmtNPR} />
        <KpiCard label="Categories" value={categories.length} tone="violet" format={fmtNum} />
      </div>

      <Card className="p-5">
        <SectionTitle
          title={editingId ? 'Edit expense' : 'Record an expense'}
          sub="All expenses flow into the Profit & Loss report automatically"
          right={editingId ? (
            <button onClick={resetForm} className="text-xs text-slate-600 hover:text-slate-900">Cancel edit</button>
          ) : null}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <Field label="Date">
            <input type="date" value={form.expense_date}
              onChange={e => setForm(f => ({ ...f, expense_date: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg ring-1 ring-slate-200 text-sm" />
          </Field>
          <Field label="Category">
            <select value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg ring-1 ring-slate-200 text-sm bg-white">
              {categories.map(c => (
                <option key={c.name} value={c.name}>{c.name} · {c.kind}</option>
              ))}
              <option value="__custom__">— Custom —</option>
            </select>
            {form.category === '__custom__' && (
              <input placeholder="Custom category name" autoFocus
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="mt-2 w-full px-3 py-2 rounded-lg ring-1 ring-slate-200 text-sm" />
            )}
          </Field>
          <Field label="Amount (Rs.)">
            <input type="number" step="0.01" value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg ring-1 ring-slate-200 text-sm" />
          </Field>
          <Field label="Payment method">
            <select value={form.payment_method}
              onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg ring-1 ring-slate-200 text-sm bg-white">
              {['cash', 'bank', 'card', 'digital', 'other'].map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </Field>
          <Field label="Vendor">
            <input value={form.vendor}
              onChange={e => setForm(f => ({ ...f, vendor: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg ring-1 ring-slate-200 text-sm" />
          </Field>
          <Field label="Reference #">
            <input value={form.reference_number}
              onChange={e => setForm(f => ({ ...f, reference_number: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg ring-1 ring-slate-200 text-sm" />
          </Field>
          <Field label="Description" className="md:col-span-2">
            <input value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg ring-1 ring-slate-200 text-sm" />
          </Field>
        </div>
        <div className="mt-4 flex items-center justify-end gap-2">
          <button disabled={saving} onClick={save}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50">
            {saving ? 'Saving…' : (editingId ? 'Update expense' : 'Add expense')}
          </button>
        </div>
      </Card>

      <Card className="p-5">
        <SectionTitle title="Expenses log" sub={`${expenses.length} entr${expenses.length === 1 ? 'y' : 'ies'} in range`} />
        {loading && !expenses.length ? <LoadingState /> : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500">
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Category</th>
                  <th className="px-3 py-2">Description</th>
                  <th className="px-3 py-2">Vendor</th>
                  <th className="px-3 py-2">Pay</th>
                  <th className="px-3 py-2 text-right">Amount</th>
                  <th className="px-3 py-2 w-24"></th>
                </tr>
              </thead>
              <tbody>
                {expenses.map(e => (
                  <tr key={e.id} className="border-t border-slate-100 hover:bg-slate-50/50">
                    <td className="px-3 py-2 whitespace-nowrap">{fmtDate(e.expense_date)}</td>
                    <td className="px-3 py-2"><Badge tone="slate">{e.category}</Badge></td>
                    <td className="px-3 py-2 text-slate-700">{e.description || '—'}</td>
                    <td className="px-3 py-2 text-slate-600">{e.vendor || '—'}</td>
                    <td className="px-3 py-2 text-slate-500">{e.payment_method || '—'}</td>
                    <td className="px-3 py-2 text-right tabular-nums font-semibold">{fmtNPR2(e.amount)}</td>
                    <td className="px-3 py-2 text-right">
                      <button onClick={() => editRow(e)} className="text-xs text-indigo-600 hover:text-indigo-700 mr-2">Edit</button>
                      <button onClick={() => removeRow(e.id)} className="text-xs text-rose-600 hover:text-rose-700">Delete</button>
                    </td>
                  </tr>
                ))}
                {expenses.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-8 text-sm text-slate-400">No expenses recorded in this range</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

const Field = ({ label, children, className = '' }) => (
  <div className={className}>
    <label className="block text-[11px] uppercase tracking-wider font-semibold text-slate-500 mb-1">{label}</label>
    {children}
  </div>
);

/* ============================================================
   Loading state
   ============================================================ */
const LoadingState = () => (
  <div className="flex items-center justify-center py-20">
    <div className="flex items-center gap-3 text-slate-500 text-sm">
      <Spinner /> Loading report…
    </div>
  </div>
);

export default ReportsManagement;
