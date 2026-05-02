import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { fetchApi } from '../services/apiService';

/* =============================================================
   Daybook — a clean, standard cash-drawer / daily ledger.
   Flow:
     1. Day starts with Opening Balance (carried from prev close).
     2. Sales post as cash_payment / card_payment / online_payment.
     3. Extra cash movements: cash_in, cash_handover, cash_returned.
     4. Expenses reduce cash in drawer.
     5. Day Close verifies:
          expected = opening + cash_sales + cash_in
                     - cash_handovers - cash_returned - expenses + adjustments
        variance = counted_cash - expected
     6. Counted cash becomes next day's opening balance.
   ============================================================= */

const todayISO = () => new Date().toISOString().split('T')[0];

const npr = (n) => `Rs. ${Number(n || 0).toLocaleString('en-IN', {
  minimumFractionDigits: 2, maximumFractionDigits: 2,
})}`;

const TX_TYPES = [
  { v: 'opening_balance', label: 'Opening Balance', icon: '🌅', tone: 'emerald',  cashImpact: 0  },
  { v: 'cash_payment',    label: 'Cash Sale',       icon: '💵', tone: 'emerald',  cashImpact: +1 },
  { v: 'card_payment',    label: 'Card Sale',       icon: '💳', tone: 'indigo',   cashImpact: 0  },
  { v: 'online_payment',  label: 'Online Sale',     icon: '📱', tone: 'violet',   cashImpact: 0  },
  { v: 'esewa_payment',   label: 'eSewa Payment',   icon: '📲', tone: 'blue',     cashImpact: 0  },
  { v: 'khalti_payment',  label: 'Khalti Payment',  icon: '💜', tone: 'purple',   cashImpact: 0  },
  { v: 'fonepay_payment', label: 'Fonepay Payment', icon: '📱', tone: 'teal',     cashImpact: 0  },
  { v: 'cash_in',         label: 'Cash In',         icon: '⬇️', tone: 'sky',      cashImpact: +1 },
  { v: 'cash_handover',   label: 'Cash Handover',   icon: '🤝', tone: 'amber',    cashImpact: -1 },
  { v: 'cash_returned',   label: 'Cash Returned',   icon: '↩️', tone: 'orange',   cashImpact: -1 },
  { v: 'expense',         label: 'Expense',         icon: '💸', tone: 'rose',     cashImpact: -1 },
  { v: 'adjustment',      label: 'Adjustment',      icon: '⚖️', tone: 'slate',    cashImpact: 0  },
  { v: 'closing_balance', label: 'Closing Balance', icon: '🏁', tone: 'slate',    cashImpact: 0  },
];
const typeMeta = (v) => TX_TYPES.find(t => t.v === v) || { label: v, icon: '📄', tone: 'slate', cashImpact: 0 };

const EXPENSE_CATEGORIES = [
  'Food Supplies', 'Packaging', 'Beverages', 'Utilities', 'Staff Salary',
  'Rent', 'Repairs & Maintenance', 'Transport', 'Marketing', 'Misc',
];

const toneBg = {
  emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  indigo:  'bg-indigo-50 text-indigo-700 ring-indigo-200',
  violet:  'bg-violet-50 text-violet-700 ring-violet-200',
  blue:    'bg-blue-50 text-blue-700 ring-blue-200',
  purple:  'bg-purple-50 text-purple-700 ring-purple-200',
  teal:    'bg-teal-50 text-teal-700 ring-teal-200',
  sky:     'bg-sky-50 text-sky-700 ring-sky-200',
  amber:   'bg-amber-50 text-amber-700 ring-amber-200',
  orange:  'bg-orange-50 text-orange-700 ring-orange-200',
  rose:    'bg-rose-50 text-rose-700 ring-rose-200',
  slate:   'bg-slate-100 text-slate-700 ring-slate-200',
};

const Daybook = () => {
  const [date, setDate] = useState(todayISO());
  const [summary, setSummary] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [dayStatus, setDayStatus] = useState({ is_closed: false, has_opening: false });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null); // 'transaction' | 'opening' | 'handover' | 'close' | 'open'

  const toastTimer = useRef(null);
  const [toastMsg, setToastMsg] = useState(null);
  const toast = useCallback((msg, tone = 'success') => {
    setToastMsg({ msg, tone });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(null), 3000);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sumRes, txRes, statusRes] = await Promise.all([
        fetchApi.get(`/api/daybook/summary?date=${date}`),
        fetchApi.get(`/api/daybook/recent-transactions?date=${date}&limit=500`),
        fetchApi.get(`/api/daybook/day-status/${date}`),
      ]);
      setSummary(sumRes?.data || {});
      setTransactions(txRes?.data || []);
      setDayStatus(statusRes || { is_closed: false, has_opening: false });
    } catch (e) {
      console.error('daybook load failed', e);
      toast('Failed to load daybook', 'error');
    } finally {
      setLoading(false);
    }
  }, [date, toast]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    // Defensive dedup by id — protects the UI if the API ever returns duplicates
    // (legacy rows pre-dating the uq_daybook_one_payment_per_order index).
    const byId = new Map();
    for (const t of transactions) {
      if (t && t.id != null && !byId.has(t.id)) byId.set(t.id, t);
    }
    return Array.from(byId.values()).filter(t => {
      if (filter !== 'all' && t.transaction_type !== filter) return false;
      if (search) {
        const hay = `${t.description || ''} ${t.category || ''} ${t.order_id || ''}`.toLowerCase();
        if (!hay.includes(search.toLowerCase())) return false;
      }
      return true;
    });
  }, [transactions, filter, search]);

  // Derived metrics
  const s = summary || {};
  const n = (k) => Number(s[k] || 0);
  const totalSales = n('cash_payments') + n('card_payments') + n('online_payments') 
                   + n('esewa_payments') + n('khalti_payments') + n('fonepay_payments');
  const expected = n('opening_balance') + n('cash_payments') + n('cash_in')
                 - n('cash_handovers') - n('cash_returned') - n('expenses') + n('adjustments');

  // Actions
  const addTransaction = async (payload) => {
    setBusy('tx');
    try {
      await fetchApi.post('/api/daybook/transaction', { ...payload, date });
      toast('Transaction added', 'success');
      setModal(null);
      load();
    } catch (e) {
      toast(e.message || 'Failed', 'error');
    } finally { setBusy(null); }
  };

  const setOpening = async (value) => {
    setBusy('opening');
    try {
      await fetchApi.put('/api/daybook/opening-balance', { date, opening_balance: Number(value) });
      toast('Opening balance set', 'success');
      setModal(null);
      load();
    } catch (e) {
      toast(e.message || 'Failed', 'error');
    } finally { setBusy(null); }
  };

  const addHandover = async ({ recipient, amount, reason }) => {
    setBusy('handover');
    try {
      await fetchApi.post('/api/daybook/handover', { date, recipient, amount: Number(amount), reason });
      toast('Handover recorded', 'success');
      setModal(null);
      load();
    } catch (e) {
      toast(e.message || 'Failed', 'error');
    } finally { setBusy(null); }
  };

  const syncPayments = async () => {
    setBusy('sync');
    try {
      const r = await fetchApi.post('/api/daybook/sync-payments', { date });
      toast(`Synced ${r.synced_count || 0} payments`, 'success');
      load();
    } catch (e) {
      toast(e.message || 'Sync failed', 'error');
    } finally { setBusy(null); }
  };

  const download = async () => {
    setBusy('download');
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('staffToken');
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      const resp = await fetch(`${apiUrl}/api/daybook/download?start_date=${date}&end_date=${date}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) throw new Error('Download failed');
      const blob = await resp.blob();
      const u = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = u; a.download = `daybook_${date}.csv`;
      document.body.appendChild(a); a.click();
      URL.revokeObjectURL(u); document.body.removeChild(a);
      toast('Downloaded', 'success');
    } catch (e) {
      toast(e.message || 'Failed', 'error');
    } finally { setBusy(null); }
  };

  const closeDay = async ({ counted, notes }) => {
    setBusy('close');
    try {
      const r = await fetchApi.post('/api/daybook/close-day', {
        closing_balance: Number(counted),
        cash_count: Number(counted),
        notes,
        date,
      });
      toast(`Day closed. Variance ${npr(r?.report?.variance || 0)}`, 'success');
      setModal(null);
      load();
    } catch (e) {
      toast(e.message || 'Close failed', 'error');
    } finally { setBusy(null); }
  };

  const reopenDay = async (reason) => {
    setBusy('reopen');
    try {
      await fetchApi.post('/api/daybook/open-day', { date, reason });
      toast('Day reopened', 'success');
      setModal(null);
      load();
    } catch (e) {
      toast(e.message || 'Reopen failed', 'error');
    } finally { setBusy(null); }
  };

  const deleteTx = async (id) => {
    if (!window.confirm('Delete this transaction?')) return;
    try {
      await fetchApi.delete(`/api/daybook/transaction/${id}`);
      toast('Deleted', 'success');
      load();
    } catch (e) {
      toast(e.message || 'Delete failed', 'error');
    }
  };

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 100px)' }}>
      {/* Header */}
      <div className="flex-shrink-0 bg-white rounded-2xl ring-1 ring-slate-200 p-4 flex flex-wrap items-center gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <span>📒</span> Daybook
            <span className={`ml-2 text-[11px] px-2 py-0.5 rounded-full ring-1 font-semibold uppercase tracking-wider ${
              dayStatus.is_closed
                ? 'bg-slate-100 text-slate-600 ring-slate-200'
                : 'bg-emerald-50 text-emerald-700 ring-emerald-200'
            }`}>
              {dayStatus.is_closed ? 'Closed' : 'Open'}
            </span>
          </h2>
          <div className="text-xs text-slate-500 mt-0.5">Daily cash ledger &amp; reconciliation</div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="px-3 py-2 rounded-lg ring-1 ring-slate-200 text-sm" />
          <button onClick={() => setDate(todayISO())} className="px-3 py-2 rounded-lg ring-1 ring-slate-200 text-sm hover:bg-slate-50">Today</button>
          <button onClick={syncPayments} disabled={busy === 'sync'}
            className="px-3 py-2 rounded-lg bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 disabled:opacity-50">
            {busy === 'sync' ? 'Syncing…' : '🔄 Sync payments'}
          </button>
          <button onClick={download} disabled={busy === 'download'}
            className="px-3 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 disabled:opacity-50">
            {busy === 'download' ? '…' : '📥 Export CSV'}
          </button>
          {dayStatus.is_closed ? (
            <button onClick={() => setModal('open')}
              className="px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700">
              🔓 Reopen day
            </button>
          ) : (
            <button onClick={() => setModal('close')}
              className="px-3 py-2 rounded-lg bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700">
              🔒 Close day
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
      ) : (
        <div className="flex-1 min-h-0 mt-4 overflow-auto space-y-4 pr-1">
          {/* Cash-drawer KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            <KpiTile label="Opening" value={n('opening_balance')} tone="emerald" icon="🌅"
              action={!dayStatus.is_closed && <button onClick={() => setModal('opening')} className="text-[11px] text-emerald-700 hover:underline">Set</button>} />
            <KpiTile label="Cash sales" value={n('cash_payments')} tone="emerald" icon="💵" />
            <KpiTile label="Card sales" value={n('card_payments')} tone="indigo" icon="💳" />
            <KpiTile label="Online sales" value={n('online_payments')} tone="violet" icon="📱" />
            <KpiTile label="eSewa" value={n('esewa_payments')} tone="blue" icon="📲" />
            <KpiTile label="Khalti" value={n('khalti_payments')} tone="purple" icon="💜" />
            <KpiTile label="Fonepay" value={n('fonepay_payments')} tone="teal" icon="📱" />
          </div>
          
          {/* Additional KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-3">
            <KpiTile label="Expenses" value={n('expenses')} tone="rose" icon="💸" />
            <KpiTile label="Handovers" value={n('cash_handovers')} tone="amber" icon="🤝" />
            <KpiTile label="Cash In" value={n('cash_in')} tone="sky" icon="⬇️" />
          </div>

          {/* Summary strip */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Card>
              <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">Total sales</div>
              <div className="mt-1 text-3xl font-bold text-slate-900 tabular-nums">{npr(totalSales)}</div>
              <div className="text-xs text-slate-500 mt-1">{s.transaction_count || 0} paid transactions</div>
            </Card>
            <Card>
              <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">Expected cash in drawer</div>
              <div className="mt-1 text-3xl font-bold text-indigo-700 tabular-nums">{npr(expected)}</div>
              <div className="text-xs text-slate-500 mt-1">
                Opening + cash sales + cash-in − handovers − cash-returned − expenses ± adjustments
              </div>
            </Card>
            <Card>
              <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">
                {dayStatus.is_closed ? 'Closing balance' : 'Ready to close?'}
              </div>
              <div className="mt-1 text-3xl font-bold text-slate-900 tabular-nums">
                {dayStatus.is_closed ? npr(n('closing_balance')) : '—'}
              </div>
              {dayStatus.is_closed ? (
                <div className={`text-xs mt-1 font-semibold ${
                  Math.abs(n('closing_balance') - expected) < 0.01 ? 'text-emerald-600' : 'text-rose-600'
                }`}>
                  Variance: {npr(n('closing_balance') - expected)}
                </div>
              ) : (
                <div className="text-xs text-slate-500 mt-1">Use “Close day” to record counted cash</div>
              )}
            </Card>
          </div>

          {/* Quick actions */}
          <Card>
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-semibold text-slate-900">Quick actions</div>
            </div>
            <div className="flex flex-wrap gap-2">
              <QuickBtn onClick={() => setModal({ kind: 'transaction', preset: 'expense' })} disabled={dayStatus.is_closed}>💸 Add expense</QuickBtn>
              <QuickBtn onClick={() => setModal('handover')} disabled={dayStatus.is_closed}>🤝 Cash handover</QuickBtn>
              <QuickBtn onClick={() => setModal({ kind: 'transaction', preset: 'cash_in' })} disabled={dayStatus.is_closed}>⬇️ Cash in</QuickBtn>
              <QuickBtn onClick={() => setModal({ kind: 'transaction', preset: 'cash_returned' })} disabled={dayStatus.is_closed}>↩️ Cash returned</QuickBtn>
              <QuickBtn onClick={() => setModal({ kind: 'transaction', preset: 'adjustment' })} disabled={dayStatus.is_closed}>⚖️ Adjustment</QuickBtn>
              <QuickBtn onClick={() => setModal({ kind: 'transaction' })} disabled={dayStatus.is_closed}>➕ Custom entry</QuickBtn>
            </div>
          </Card>

          {/* Transaction log */}
          <Card>
            <div className="flex items-center gap-3 flex-wrap mb-3">
              <div className="text-sm font-semibold text-slate-900">Transaction log</div>
              <div className="ml-auto flex items-center gap-2">
                <select value={filter} onChange={e => setFilter(e.target.value)}
                  className="px-2 py-1.5 rounded-lg ring-1 ring-slate-200 text-sm">
                  <option value="all">All types</option>
                  {TX_TYPES.map(t => <option key={t.v} value={t.v}>{t.icon} {t.label}</option>)}
                </select>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search description / order #"
                  className="px-3 py-1.5 rounded-lg ring-1 ring-slate-200 text-sm w-56" />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500">
                    <th className="px-3 py-2">Time</th>
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2">Description</th>
                    <th className="px-3 py-2">Category</th>
                    <th className="px-3 py-2">Order</th>
                    <th className="px-3 py-2 text-right">Amount</th>
                    <th className="px-3 py-2 w-16"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(t => {
                    const m = typeMeta(t.transaction_type);
                    const sign = m.cashImpact < 0 ? '−' : '+';
                    const amtColor = m.cashImpact < 0 ? 'text-rose-700' : m.cashImpact > 0 ? 'text-emerald-700' : 'text-slate-700';
                    return (
                      <tr key={t.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                        <td className="px-3 py-2 whitespace-nowrap text-slate-600">
                          {new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-3 py-2">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ring-1 ${toneBg[m.tone]}`}>
                            {m.icon} {m.label}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-slate-800">{t.description || '—'}</td>
                        <td className="px-3 py-2 text-slate-600">{t.category || '—'}</td>
                        <td className="px-3 py-2">
                          {t.order_id ? (
                            <button
                              onClick={() => window.open(`/admin#order-${t.order_id}`, '_self')}
                              className="text-indigo-600 hover:text-indigo-800 hover:underline font-medium"
                            >
                              #{t.order_id}
                            </button>
                          ) : '—'}
                        </td>
                        <td className={`px-3 py-2 text-right tabular-nums font-semibold ${amtColor}`}>
                          {m.cashImpact !== 0 ? sign : ''}{npr(Math.abs(Number(t.amount) || 0)).replace('Rs. ', '')}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button onClick={() => deleteTx(t.id)}
                            className="text-xs text-rose-600 hover:text-rose-800"
                            title="Delete">✕</button>
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr><td colSpan={7} className="text-center py-10 text-sm text-slate-400">
                      No transactions {filter !== 'all' ? `of type “${typeMeta(filter).label}”` : ''} on this date
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Modals */}
      {modal === 'opening' && (
        <OpeningModal onClose={() => setModal(null)} onSave={setOpening} busy={busy === 'opening'} current={n('opening_balance')} />
      )}
      {modal === 'handover' && (
        <HandoverModal onClose={() => setModal(null)} onSave={addHandover} busy={busy === 'handover'} />
      )}
      {(modal?.kind === 'transaction' || modal === 'transaction') && (
        <TransactionModal
          onClose={() => setModal(null)}
          onSave={addTransaction}
          busy={busy === 'tx'}
          preset={modal?.preset}
        />
      )}
      {modal === 'close' && (
        <CloseDayModal expected={expected} onClose={() => setModal(null)} onSave={closeDay} busy={busy === 'close'} />
      )}
      {modal === 'open' && (
        <ReopenDayModal onClose={() => setModal(null)} onSave={reopenDay} busy={busy === 'reopen'} />
      )}

      {toastMsg && (
        <div className={`fixed bottom-4 right-4 px-4 py-2 rounded-lg shadow-lg text-sm font-semibold text-white z-50 ${
          toastMsg.tone === 'error' ? 'bg-rose-600' : 'bg-emerald-600'
        }`}>{toastMsg.msg}</div>
      )}
    </div>
  );
};

/* -------- small helpers -------- */

const Card = ({ children }) => (
  <div className="bg-white rounded-2xl ring-1 ring-slate-200 p-4">{children}</div>
);

const KpiTile = ({ label, value, tone, icon, action }) => (
  <div className="bg-white rounded-2xl ring-1 ring-slate-200 p-4">
    <div className="flex items-center justify-between">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ring-1 ${toneBg[tone]}`}>{icon}</div>
      {action}
    </div>
    <div className="mt-2 text-[11px] uppercase tracking-wider font-semibold text-slate-500">{label}</div>
    <div className="text-xl font-bold text-slate-900 tabular-nums mt-0.5">{npr(value)}</div>
  </div>
);

const QuickBtn = ({ children, ...rest }) => (
  <button {...rest}
    className="px-3 py-2 rounded-lg ring-1 ring-slate-200 text-sm font-medium hover:bg-slate-50 disabled:opacity-50">
    {children}
  </button>
);

const ModalShell = ({ title, onClose, children, footer }) => (
  <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
    <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <div className="text-sm font-semibold text-slate-900">{title}</div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-700">✕</button>
      </div>
      <div className="px-5 py-4 space-y-3">{children}</div>
      <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-end gap-2">{footer}</div>
    </div>
  </div>
);

const FieldRow = ({ label, children }) => (
  <div>
    <label className="block text-[11px] uppercase tracking-wider font-semibold text-slate-500 mb-1">{label}</label>
    {children}
  </div>
);

const inp = 'w-full px-3 py-2 rounded-lg ring-1 ring-slate-200 text-sm focus:ring-indigo-400 focus:outline-none';

const OpeningModal = ({ onClose, onSave, busy, current }) => {
  const [value, setValue] = useState(current || '');
  return (
    <ModalShell title="Set opening balance" onClose={onClose} footer={
      <>
        <button onClick={onClose} className="px-3 py-2 rounded-lg ring-1 ring-slate-200 text-sm">Cancel</button>
        <button disabled={busy} onClick={() => onSave(value)}
          className="px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50">
          {busy ? 'Saving…' : 'Save'}
        </button>
      </>
    }>
      <FieldRow label="Opening cash (Rs.)">
        <input autoFocus type="number" step="0.01" value={value}
          onChange={e => setValue(e.target.value)} className={inp} />
      </FieldRow>
      <p className="text-xs text-slate-500">This replaces any existing opening balance for the selected date.</p>
    </ModalShell>
  );
};

const HandoverModal = ({ onClose, onSave, busy }) => {
  const [form, setForm] = useState({ recipient: '', amount: '', reason: '' });
  return (
    <ModalShell title="Record cash handover" onClose={onClose} footer={
      <>
        <button onClick={onClose} className="px-3 py-2 rounded-lg ring-1 ring-slate-200 text-sm">Cancel</button>
        <button disabled={busy || !form.recipient || !form.amount} onClick={() => onSave(form)}
          className="px-3 py-2 rounded-lg bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 disabled:opacity-50">
          {busy ? 'Saving…' : 'Record'}
        </button>
      </>
    }>
      <FieldRow label="Recipient">
        <input autoFocus value={form.recipient} onChange={e => setForm(f => ({ ...f, recipient: e.target.value }))} className={inp} placeholder="e.g. Owner / Bank deposit" />
      </FieldRow>
      <FieldRow label="Amount (Rs.)">
        <input type="number" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} className={inp} />
      </FieldRow>
      <FieldRow label="Reason (optional)">
        <input value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} className={inp} />
      </FieldRow>
    </ModalShell>
  );
};

const TransactionModal = ({ onClose, onSave, busy, preset }) => {
  const [form, setForm] = useState({
    transaction_type: preset || 'expense',
    amount: '',
    description: '',
    category: preset === 'expense' ? '' : 'other',
    payment_method: '',
    reference: '',
    order_id: '',
  });
  const showCategory = form.transaction_type === 'expense';
  return (
    <ModalShell title="Add transaction" onClose={onClose} footer={
      <>
        <button onClick={onClose} className="px-3 py-2 rounded-lg ring-1 ring-slate-200 text-sm">Cancel</button>
        <button disabled={busy || !form.transaction_type || !form.amount}
          onClick={() => onSave({ ...form, amount: Number(form.amount) })}
          className="px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50">
          {busy ? 'Saving…' : 'Add'}
        </button>
      </>
    }>
      <FieldRow label="Type">
        <select value={form.transaction_type} onChange={e => setForm(f => ({ ...f, transaction_type: e.target.value }))}
          className={inp}>
          {TX_TYPES.filter(t => !['opening_balance', 'closing_balance', 'cash_payment', 'card_payment', 'online_payment'].includes(t.v))
            .map(t => <option key={t.v} value={t.v}>{t.icon} {t.label}</option>)}
        </select>
      </FieldRow>
      <FieldRow label="Amount (Rs.)">
        <input autoFocus type="number" step="0.01" value={form.amount}
          onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} className={inp} />
      </FieldRow>
      {showCategory && (
        <FieldRow label="Category">
          <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className={inp}>
            <option value="">Select category…</option>
            {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </FieldRow>
      )}
      <FieldRow label="Description">
        <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className={inp} />
      </FieldRow>
      <FieldRow label="Reference (optional)">
        <input value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} className={inp} placeholder="Invoice / voucher #" />
      </FieldRow>
    </ModalShell>
  );
};

const CloseDayModal = ({ expected, onClose, onSave, busy }) => {
  const [counted, setCounted] = useState('');
  const [notes, setNotes] = useState('');
  const variance = Number(counted || 0) - Number(expected || 0);
  return (
    <ModalShell title="Close day" onClose={onClose} footer={
      <>
        <button onClick={onClose} className="px-3 py-2 rounded-lg ring-1 ring-slate-200 text-sm">Cancel</button>
        <button disabled={busy || counted === ''} onClick={() => onSave({ counted, notes })}
          className="px-3 py-2 rounded-lg bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700 disabled:opacity-50">
          {busy ? 'Closing…' : 'Close day'}
        </button>
      </>
    }>
      <div className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
        <span className="text-xs text-slate-500 uppercase font-semibold tracking-wider">Expected</span>
        <span className="tabular-nums font-bold text-slate-900">{npr(expected)}</span>
      </div>
      <FieldRow label="Counted cash (Rs.)">
        <input autoFocus type="number" step="0.01" value={counted}
          onChange={e => setCounted(e.target.value)} className={inp} />
      </FieldRow>
      {counted !== '' && (
        <div className={`text-sm font-semibold px-3 py-2 rounded-lg ${
          Math.abs(variance) < 0.01 ? 'bg-emerald-50 text-emerald-700'
          : variance > 0 ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'
        }`}>
          Variance: {npr(variance)} {variance > 0 ? '(over)' : variance < 0 ? '(short)' : '(balanced)'}
        </div>
      )}
      <FieldRow label="Notes (optional)">
        <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} className={inp} />
      </FieldRow>
      <p className="text-xs text-slate-500">
        On close, the counted amount becomes tomorrow&rsquo;s opening balance automatically.
      </p>
    </ModalShell>
  );
};

const ReopenDayModal = ({ onClose, onSave, busy }) => {
  const [reason, setReason] = useState('');
  return (
    <ModalShell title="Reopen day" onClose={onClose} footer={
      <>
        <button onClick={onClose} className="px-3 py-2 rounded-lg ring-1 ring-slate-200 text-sm">Cancel</button>
        <button disabled={busy} onClick={() => onSave(reason)}
          className="px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50">
          {busy ? 'Reopening…' : 'Reopen'}
        </button>
      </>
    }>
      <p className="text-xs text-slate-500">
        This removes the closing record so you can post more transactions. The next-day opening balance
        that was carried forward will also be cleared.
      </p>
      <FieldRow label="Reason">
        <input autoFocus value={reason} onChange={e => setReason(e.target.value)} className={inp} placeholder="e.g. Missed cash entry" />
      </FieldRow>
    </ModalShell>
  );
};

export default Daybook;
