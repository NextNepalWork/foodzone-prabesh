import React, { useCallback, useEffect, useState } from 'react';
import { fetchApi } from '../../services/apiService';
import { BookIcon, XIcon } from './icons';

const NOTE_VALUES = [1000, 500, 100, 50, 20, 10, 5];
const emptyNotes = () => Object.fromEntries(NOTE_VALUES.map((v) => [v, 0]));

// Slide-over daybook panel for the POS: today's summary, cash drawer cycle
// (opening/closing balance with a note counter, cash handover, day close),
// recent transactions and quick expense entry.
const POSTransactions = ({ open, onClose, isManager, currency = 'Rs.' }) => {
  const [summary, setSummary] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [dayStatus, setDayStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expenseCause, setExpenseCause] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('');
  const [categories, setCategories] = useState([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  // Cash-cycle sub-panel: null | 'opening' | 'closing' | 'handover' | 'closeday' | 'openday'
  const [mode, setMode] = useState(null);
  const [notes, setNotes] = useState(emptyNotes);
  const [handover, setHandover] = useState({ to: '', amount: '', reason: '' });
  const [dayClose, setDayClose] = useState({ balance: '', notes: '' });
  const [openReason, setOpenReason] = useState('');

  // Local (restaurant) date, not UTC — between midnight and 05:45 Nepal time
  // toISOString() is still on yesterday's date, which made late-night entries
  // land on the wrong daybook day (server sales rows use CURRENT_DATE in NPT).
  const today = new Date().toLocaleDateString('en-CA');

  // Same category list the Admin expense report uses, so entries recorded
  // here land in the same buckets there.
  useEffect(() => {
    if (!open || categories.length > 0) return;
    fetchApi.get('/api/reports/expense-categories')
      .then((res) => setCategories(res?.categories || []))
      .catch((err) => console.error('Failed to load expense categories:', err));
  }, [open, categories.length]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [summaryRes, txRes, statusRes] = await Promise.all([
        fetchApi.get(`/api/daybook/summary?date=${today}`),
        fetchApi.get(`/api/daybook/recent-transactions?date=${today}&limit=50`),
        fetchApi.get(`/api/daybook/day-status/${today}`),
      ]);
      setSummary(summaryRes.data || summaryRes);
      const tx = txRes.data || txRes;
      setTransactions(Array.isArray(tx) ? tx : tx.transactions || []);
      setDayStatus(statusRes.data || statusRes);
    } catch (err) {
      console.error('Failed to load daybook:', err);
    } finally {
      setLoading(false);
    }
  }, [today]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const flash = (text) => {
    setMessage(text);
    setTimeout(() => setMessage(''), 4000);
  };

  const notesTotal = NOTE_VALUES.reduce((sum, v) => sum + v * (notes[v] || 0), 0);
  const notesBreakdown = NOTE_VALUES.filter((v) => notes[v] > 0).map((v) => `${notes[v]}x${v}`).join(', ');

  const submitBalance = async () => {
    setSaving(true);
    try {
      await fetchApi.post('/api/daybook/transaction', {
        transaction_type: mode === 'opening' ? 'opening_balance' : 'closing_balance',
        amount: notesTotal,
        description: `${mode === 'opening' ? 'Opening' : 'Closing'} balance - Cash count: ${notesBreakdown || 'none'}`,
        date: today,
      });
      setMode(null);
      setNotes(emptyNotes());
      flash(`✅ ${mode === 'opening' ? 'Opening' : 'Closing'} balance recorded: ${currency}${notesTotal.toLocaleString()}`);
      load();
    } catch (err) {
      flash('Failed to record balance');
    } finally {
      setSaving(false);
    }
  };

  const submitHandover = async () => {
    if (!handover.to.trim() || !(parseFloat(handover.amount) > 0)) {
      flash('Enter the recipient and a valid amount');
      return;
    }
    setSaving(true);
    try {
      await fetchApi.post('/api/daybook/transaction', {
        transaction_type: 'cash_handover',
        amount: parseFloat(handover.amount),
        description: `Cash handover to ${handover.to.trim()}${handover.reason.trim() ? ` - ${handover.reason.trim()}` : ''}`,
        date: today,
      });
      setMode(null);
      flash(`✅ Handover recorded: ${currency}${parseFloat(handover.amount).toLocaleString()} to ${handover.to.trim()}`);
      setHandover({ to: '', amount: '', reason: '' });
      load();
    } catch (err) {
      flash('Failed to record handover');
    } finally {
      setSaving(false);
    }
  };

  const submitDayClose = async () => {
    if (!(parseFloat(dayClose.balance) >= 0)) {
      flash('Enter the counted closing balance');
      return;
    }
    if (!window.confirm(`Close today with a closing balance of ${currency}${parseFloat(dayClose.balance).toLocaleString()}?\n\nThis finalizes today and sets tomorrow's opening balance.`)) return;
    setSaving(true);
    try {
      await fetchApi.post('/api/daybook/close-day', {
        closing_balance: parseFloat(dayClose.balance),
        cash_count: '',
        notes: dayClose.notes,
        date: today,
      });
      setMode(null);
      setDayClose({ balance: '', notes: '' });
      flash('✅ Day closed — opening balance set for tomorrow');
      load();
    } catch (err) {
      flash('Failed to close the day');
    } finally {
      setSaving(false);
    }
  };

  const submitDayOpen = async () => {
    if (!window.confirm('Reopen today? The closing balance will be removed and you must close the day again when finished.')) return;
    setSaving(true);
    try {
      await fetchApi.post('/api/daybook/open-day', { date: today, reason: openReason });
      setMode(null);
      setOpenReason('');
      flash('✅ Day reopened');
      load();
    } catch (err) {
      flash('Failed to reopen the day');
    } finally {
      setSaving(false);
    }
  };

  const addExpense = async () => {
    if (!expenseCategory) {
      flash('Pick an expense category');
      return;
    }
    if (!expenseCause.trim() || !(parseFloat(expenseAmount) > 0)) {
      flash('Enter an expense description and amount');
      return;
    }
    setSaving(true);
    try {
      // Same endpoint the Admin expense manager uses — one ledger, so this
      // entry appears in Admin's daybook and expense reports immediately.
      await fetchApi.post('/api/reports/expenses', {
        expense_date: today,
        category: expenseCategory,
        description: expenseCause.trim(),
        amount: parseFloat(expenseAmount),
        payment_method: 'cash',
      });
      setExpenseCause('');
      setExpenseAmount('');
      flash('✅ Expense recorded');
      load();
    } catch (err) {
      flash('Failed to record expense');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const s = summary || {};
  const dayClosed = !!dayStatus?.is_closed;
  const stat = (label, value, cls = 'text-slate-900') => (
    <div className="bg-slate-50 rounded-xl p-3 text-center">
      <div className={`text-lg font-bold tabular-nums ${cls}`}>
        {currency}{parseFloat(value || 0).toLocaleString()}
      </div>
      <div className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">{label}</div>
    </div>
  );

  const actionBtn = (label, target, cls) => (
    <button
      onClick={() => setMode(mode === target ? null : target)}
      className={`flex-1 h-10 rounded-lg text-[12px] font-bold transition-colors ${
        mode === target ? 'bg-slate-900 text-white' : cls
      }`}
    >
      {label}
    </button>
  );

  const inputCls = 'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm';

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <div
        className="w-full max-w-md h-full bg-white shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <h3 className="flex items-center gap-2 font-bold text-slate-900">
            <BookIcon size={17} className="text-emerald-600" />
            Today's Daybook
            <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${dayClosed ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
              {dayClosed ? 'Day closed' : 'Day open'}
            </span>
          </h3>
          <button onClick={onClose} aria-label="Close daybook" className="w-9 h-9 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer transition-colors">
            <XIcon size={17} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="text-center text-slate-400 py-8">Loading…</div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2">
                {stat('Opening balance', s.opening_balance ?? 0, 'text-slate-700')}
                {stat('Expected in drawer', s.expected_closing ?? 0, 'text-indigo-700')}
                {stat('Cash sales', s.cash_payments ?? s.cash_sales ?? s.total_cash ?? 0, 'text-emerald-700')}
                {stat('Digital / card', (parseFloat(s.card_payments || 0) + parseFloat(s.online_payments || 0) + parseFloat(s.esewa_payments || 0) + parseFloat(s.khalti_payments || 0) + parseFloat(s.fonepay_payments || 0)) || s.online_sales || 0, 'text-blue-700')}
                {stat('Expenses', s.expenses ?? s.total_expenses ?? 0, 'text-rose-600')}
                {stat('Handovers', s.cash_handovers ?? 0, 'text-amber-700')}
              </div>

              {message && (
                <div role="status" className="text-xs font-medium text-slate-700 bg-slate-100 rounded-lg px-3 py-2">{message}</div>
              )}

              {/* Cash drawer actions */}
              <div className="border border-slate-200 rounded-xl p-3 space-y-2">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Cash drawer</div>
                <div className="flex gap-2">
                  {actionBtn('Opening balance', 'opening', 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100')}
                  {actionBtn('Closing balance', 'closing', 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100')}
                  {actionBtn('Handover', 'handover', 'bg-amber-50 text-amber-700 hover:bg-amber-100')}
                </div>
                <div className="flex gap-2">
                  {dayClosed
                    ? actionBtn('Reopen day', 'openday', 'bg-slate-100 text-slate-700 hover:bg-slate-200')
                    : actionBtn('Close day', 'closeday', 'bg-rose-50 text-rose-700 hover:bg-rose-100')}
                </div>

                {(mode === 'opening' || mode === 'closing') && (
                  <div className="pt-2 space-y-1.5 border-t border-slate-100">
                    <div className="text-xs text-slate-500">Count the notes in the drawer:</div>
                    {NOTE_VALUES.map((v) => (
                      <div key={v} className="flex items-center gap-2">
                        <span className="w-16 text-sm font-semibold text-slate-700 tabular-nums">{currency}{v}</span>
                        <button onClick={() => setNotes({ ...notes, [v]: Math.max(0, (notes[v] || 0) - 1) })} aria-label={`Fewer ${v} notes`} className="w-8 h-8 rounded-lg bg-slate-100 font-bold text-slate-600">−</button>
                        <input
                          type="number"
                          min="0"
                          value={notes[v] || 0}
                          onChange={(e) => setNotes({ ...notes, [v]: Math.max(0, parseInt(e.target.value) || 0) })}
                          aria-label={`${v} note count`}
                          className="w-16 h-8 text-center border border-slate-200 rounded-lg text-sm tabular-nums"
                        />
                        <button onClick={() => setNotes({ ...notes, [v]: (notes[v] || 0) + 1 })} aria-label={`More ${v} notes`} className="w-8 h-8 rounded-lg bg-slate-100 font-bold text-slate-600">+</button>
                        <span className="flex-1 text-right text-xs text-slate-500 tabular-nums">{currency}{(v * (notes[v] || 0)).toLocaleString()}</span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between pt-1.5 border-t border-slate-100">
                      <span className="text-sm font-bold text-slate-900">Total counted</span>
                      <span className="text-lg font-extrabold text-slate-900 tabular-nums">{currency}{notesTotal.toLocaleString()}</span>
                    </div>
                    <button
                      onClick={submitBalance}
                      disabled={saving}
                      className="w-full h-10 rounded-lg bg-slate-900 text-white text-sm font-bold disabled:opacity-50"
                    >
                      {saving ? 'Saving…' : `Save ${mode} balance`}
                    </button>
                  </div>
                )}

                {mode === 'handover' && (
                  <div className="pt-2 space-y-2 border-t border-slate-100">
                    <input type="text" value={handover.to} onChange={(e) => setHandover({ ...handover, to: e.target.value })} placeholder="Handed over to (name)" className={inputCls} />
                    <input type="number" min="0" value={handover.amount} onChange={(e) => setHandover({ ...handover, amount: e.target.value })} placeholder="Amount" className={`${inputCls} text-right tabular-nums`} />
                    <input type="text" value={handover.reason} onChange={(e) => setHandover({ ...handover, reason: e.target.value })} placeholder="Reason (optional)" className={inputCls} />
                    <button onClick={submitHandover} disabled={saving} className="w-full h-10 rounded-lg bg-amber-600 text-white text-sm font-bold disabled:opacity-50">
                      {saving ? 'Saving…' : 'Record handover'}
                    </button>
                  </div>
                )}

                {mode === 'closeday' && (
                  <div className="pt-2 space-y-2 border-t border-slate-100">
                    <div className="text-xs text-slate-500">
                      Expected in drawer: <span className="font-bold text-slate-800 tabular-nums">{currency}{parseFloat(s.expected_closing || 0).toLocaleString()}</span>
                    </div>
                    <input type="number" min="0" value={dayClose.balance} onChange={(e) => setDayClose({ ...dayClose, balance: e.target.value })} placeholder="Counted closing balance" className={`${inputCls} text-right tabular-nums`} />
                    <input type="text" value={dayClose.notes} onChange={(e) => setDayClose({ ...dayClose, notes: e.target.value })} placeholder="Notes (optional)" className={inputCls} />
                    <button onClick={submitDayClose} disabled={saving} className="w-full h-10 rounded-lg bg-rose-600 text-white text-sm font-bold disabled:opacity-50">
                      {saving ? 'Closing…' : 'Close the day'}
                    </button>
                  </div>
                )}

                {mode === 'openday' && (
                  <div className="pt-2 space-y-2 border-t border-slate-100">
                    <input type="text" value={openReason} onChange={(e) => setOpenReason(e.target.value)} placeholder="Why reopen? (optional)" className={inputCls} />
                    <button onClick={submitDayOpen} disabled={saving} className="w-full h-10 rounded-lg bg-slate-700 text-white text-sm font-bold disabled:opacity-50">
                      {saving ? 'Reopening…' : 'Reopen the day'}
                    </button>
                  </div>
                )}
              </div>

              {/* Quick expense */}
              <div className="border border-slate-200 rounded-xl p-3 space-y-2">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Record expense</div>
                <select
                  value={expenseCategory}
                  onChange={(e) => setExpenseCategory(e.target.value)}
                  aria-label="Expense category"
                  className={`w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white ${expenseCategory ? 'text-slate-900' : 'text-slate-400'}`}
                >
                  <option value="">Category…</option>
                  {categories.map((c) => (
                    <option key={c.name} value={c.name}>{c.name}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={expenseCause}
                  onChange={(e) => setExpenseCause(e.target.value)}
                  placeholder="What was it for?"
                  className={inputCls}
                />
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="0"
                    value={expenseAmount}
                    onChange={(e) => setExpenseAmount(e.target.value)}
                    placeholder="Amount"
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm text-right tabular-nums"
                  />
                  <button
                    onClick={addExpense}
                    disabled={saving}
                    className="px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-semibold hover:bg-rose-700 disabled:opacity-50"
                  >
                    {saving ? '…' : 'Add'}
                  </button>
                </div>
              </div>

              {/* Transactions list */}
              <div>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                  Recent transactions
                </div>
                {transactions.length === 0 ? (
                  <div className="text-sm text-slate-400 text-center py-6">No transactions yet today</div>
                ) : (
                  <div className="space-y-1.5">
                    {transactions.map((tx) => (
                      <div key={tx.id} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-medium text-slate-800 truncate">{tx.description}</div>
                          <div className="text-[10px] text-slate-400">
                            {tx.transaction_type} · {new Date(tx.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                        <div className={`text-sm font-bold tabular-nums ${['expense', 'cash_handover'].includes(tx.transaction_type) ? 'text-rose-600' : 'text-emerald-700'}`}>
                          {['expense', 'cash_handover'].includes(tx.transaction_type) ? '−' : '+'}{currency}{parseFloat(tx.amount).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {isManager && (
                <a
                  href="/admin"
                  className="block text-center text-xs text-blue-600 hover:text-blue-800 font-medium py-2"
                >
                  Open full reports & day close in Admin →
                </a>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default POSTransactions;
