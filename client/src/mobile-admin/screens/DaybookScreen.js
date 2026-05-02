import React, { useEffect, useMemo, useState } from 'react';
import { fetchApi } from '../../services/apiService';
import Sheet from '../components/Sheet';
import useHaptics from '../hooks/useHaptics';

const today = () => new Date().toISOString().split('T')[0];

const TX_TYPES = [
  { id: 'cash_payment',    label: 'Cash sale',     positive: true },
  { id: 'card_payment',    label: 'Card sale',     positive: true },
  { id: 'online_payment',  label: 'Online sale',   positive: true },
  { id: 'esewa_payment',   label: 'eSewa',         positive: true },
  { id: 'khalti_payment',  label: 'Khalti',        positive: true },
  { id: 'fonepay_payment', label: 'Fonepay',       positive: true },
  { id: 'cash_in',         label: 'Cash in',       positive: true },
  { id: 'expense',         label: 'Expense',       positive: false },
  { id: 'cash_handover',   label: 'Cash handover', positive: false },
  { id: 'cash_returned',   label: 'Cash returned', positive: false },
  { id: 'adjustment',      label: 'Adjustment',    positive: true },
  { id: 'opening_balance', label: 'Opening balance', positive: true },
];

const formatTime = (d) => {
  if (!d) return '';
  return new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const DaybookScreen = () => {
  const [date, setDate] = useState(today());
  const [summary, setSummary] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [draft, setDraft] = useState({ transaction_type: 'expense', amount: '', description: '', category: '' });
  const [busy, setBusy] = useState(false);
  const haptics = useHaptics();

  const load = async () => {
    setLoading(true);
    try {
      const [sumRes, txRes] = await Promise.allSettled([
        fetchApi.get(`/api/daybook/summary?date=${date}`),
        fetchApi.get(`/api/daybook/recent-transactions?date=${date}&limit=100`),
      ]);
      setSummary(sumRes.status === 'fulfilled' ? (sumRes.value?.data || null) : null);
      setTransactions(txRes.status === 'fulfilled' ? (txRes.value?.data || []) : []);
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [date]);

  const f = (k) => Number(summary?.[k] || 0);

  const submit = async () => {
    if (!draft.transaction_type || !draft.amount) { alert('Type and amount required'); return; }
    setBusy(true);
    try {
      await fetchApi.post('/api/daybook/transaction', {
        ...draft,
        amount: Number(draft.amount),
        date,
      });
      haptics.success();
      setShowAdd(false);
      setDraft({ transaction_type: 'expense', amount: '', description: '', category: '' });
      load();
    } catch (e) {
      haptics.warn();
      alert('Failed to add transaction');
    } finally {
      setBusy(false);
    }
  };

  const removeTx = async (tx) => {
    if (!window.confirm('Delete this transaction?')) return;
    try {
      await fetchApi.delete(`/api/daybook/transaction/${tx.id}`);
      haptics.success();
      load();
    } catch (e) {
      haptics.warn();
      alert('Failed to delete');
    }
  };

  const grouped = useMemo(() => {
    const m = {};
    TX_TYPES.forEach((t) => { m[t.id] = { ...t, items: [] }; });
    transactions.forEach((tx) => {
      if (!m[tx.transaction_type]) {
        m[tx.transaction_type] = { id: tx.transaction_type, label: tx.transaction_type, positive: true, items: [] };
      }
      m[tx.transaction_type].items.push(tx);
    });
    return m;
  }, [transactions]);

  return (
    <div style={{ paddingBottom: 100 }}>
      <div style={{ padding: '14px 16px 4px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800 }}>Daybook</div>
            <div style={{ fontSize: 13, color: 'var(--m-text-2)' }}>Cash drawer ledger</div>
          </div>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="m-input"
            style={{ width: 150, height: 36, fontSize: 13 }}
          />
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '0 12px' }}>
          <div className="m-skeleton" style={{ height: 130, margin: 12, borderRadius: 14 }} />
          {[1,2,3].map((i) => <div key={i} className="m-skeleton" style={{ height: 60, marginBottom: 8, borderRadius: 12 }} />)}
        </div>
      ) : (
        <>
          <div className="m-card" style={{ margin: 12, padding: 16, background: 'linear-gradient(135deg, #1e293b, #0f172a)', color: '#fff' }}>
            <div style={{ fontSize: 12, opacity: 0.7, textTransform: 'uppercase', letterSpacing: 0.5 }}>Cash drawer</div>
            <div style={{ fontSize: 32, fontWeight: 800, marginTop: 4 }}>
              Rs. {Number(summary?.expected_closing || 0).toFixed(0)}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 14 }}>
              <Stat label="Opening" v={f('opening_balance')} />
              <Stat label="Cash sales" v={f('cash_payments')} />
              <Stat label="Cash in" v={f('cash_in')} />
              <Stat label="Expenses" v={f('expenses')} negative />
              <Stat label="Handover" v={f('cash_handovers')} negative />
              <Stat label="Returned" v={f('cash_returned')} negative />
            </div>
          </div>

          <div className="m-card" style={{ margin: 12, padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--m-text-2)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Total sales
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 13 }}>
              <Row label="Cash"    value={f('cash_payments')} />
              <Row label="Card"    value={f('card_payments')} />
              <Row label="Online"  value={f('online_payments')} />
              <Row label="eSewa"   value={f('esewa_payments')} />
              <Row label="Khalti"  value={f('khalti_payments')} />
              <Row label="Fonepay" value={f('fonepay_payments')} />
            </div>
            <div style={{ borderTop: '1px solid var(--m-border)', marginTop: 8, paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
              <span>Total</span>
              <span>Rs. {Number(summary?.total_sales || 0).toFixed(0)}</span>
            </div>
          </div>

          <div className="m-section-label" style={{ paddingTop: 4 }}>Transactions ({transactions.length})</div>
          {transactions.length === 0 ? (
            <div className="m-empty" style={{ padding: 30 }}>
              <div className="m-empty-icon">📒</div>
              <div className="m-empty-msg">No transactions for this day</div>
            </div>
          ) : (
            <div style={{ padding: '4px 12px' }}>
              {transactions.map((tx) => {
                const meta = grouped[tx.transaction_type] || { label: tx.transaction_type, positive: true };
                return (
                  <div key={tx.id} className="m-card" style={{ padding: 12, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{meta.label}</div>
                      <div style={{ fontSize: 12, color: 'var(--m-text-2)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {tx.description || tx.category || '—'} · {formatTime(tx.created_at)}
                      </div>
                    </div>
                    <div style={{
                      fontWeight: 800, fontSize: 14,
                      color: meta.positive ? 'var(--m-green)' : 'var(--m-red)',
                    }}>
                      {meta.positive ? '+' : '−'} Rs. {Number(tx.amount).toFixed(0)}
                    </div>
                    <button
                      onClick={() => removeTx(tx)}
                      style={{ background: 'transparent', border: 'none', color: 'var(--m-text-2)', cursor: 'pointer', fontSize: 18, padding: 4 }}
                      aria-label="delete"
                    >×</button>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      <button
        onClick={() => { haptics.tap(); setShowAdd(true); }}
        style={{
          position: 'fixed', right: 20, bottom: 'calc(var(--tabbar-h) + var(--sa-bottom) + 20px)',
          width: 56, height: 56, borderRadius: 28, border: 'none',
          background: 'var(--m-brand)', color: '#fff', fontSize: 28,
          boxShadow: '0 6px 20px rgba(225,29,72,0.4)', cursor: 'pointer', zIndex: 5,
        }}
      >+</button>

      <Sheet open={showAdd} onClose={() => setShowAdd(false)} title="Add Transaction">
        <div style={{ padding: '0 16px 16px' }}>
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 12, color: 'var(--m-text-2)', marginBottom: 4 }}>Type</div>
            <select
              className="m-input"
              value={draft.transaction_type}
              onChange={(e) => setDraft({ ...draft, transaction_type: e.target.value })}
              style={{ height: 42 }}
            >
              {TX_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 12, color: 'var(--m-text-2)', marginBottom: 4 }}>Amount (Rs)</div>
            <input className="m-input" type="number" value={draft.amount} onChange={(e) => setDraft({ ...draft, amount: e.target.value })} />
          </div>
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 12, color: 'var(--m-text-2)', marginBottom: 4 }}>Category</div>
            <input className="m-input" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} placeholder="e.g. groceries, rent" />
          </div>
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 12, color: 'var(--m-text-2)', marginBottom: 4 }}>Description</div>
            <textarea className="m-input" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              style={{ height: 60, padding: 10, resize: 'none' }} />
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
            <button className="m-btn-secondary" style={{ flex: 1 }} onClick={() => setShowAdd(false)}>Cancel</button>
            <button className="m-btn-primary" style={{ flex: 1 }} onClick={submit} disabled={busy}>
              {busy ? 'Adding…' : 'Add'}
            </button>
          </div>
        </div>
      </Sheet>
    </div>
  );
};

const Stat = ({ label, v, negative }) => (
  <div>
    <div style={{ fontSize: 11, opacity: 0.7 }}>{label}</div>
    <div style={{ fontSize: 14, fontWeight: 700 }}>
      {negative ? '−' : ''}Rs. {Number(v).toFixed(0)}
    </div>
  </div>
);

const Row = ({ label, value }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
    <span style={{ color: 'var(--m-text-2)' }}>{label}</span>
    <span>Rs. {Number(value).toFixed(0)}</span>
  </div>
);

export default DaybookScreen;
