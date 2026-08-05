import React, { useCallback, useEffect, useState } from 'react';
import { fetchApi } from '../../services/apiService';
import { BookIcon, XIcon } from './icons';

// Slide-over daybook panel for the POS: today's summary, recent transactions,
// quick expense entry, and (for Manager/admin) day close.
const POSTransactions = ({ open, onClose, isManager, currency = 'Rs.' }) => {
  const [summary, setSummary] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expenseCause, setExpenseCause] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('');
  const [categories, setCategories] = useState([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

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
      const [summaryRes, txRes] = await Promise.all([
        fetchApi.get(`/api/daybook/summary?date=${today}`),
        fetchApi.get(`/api/daybook/recent-transactions?date=${today}&limit=50`),
      ]);
      setSummary(summaryRes.data || summaryRes);
      const tx = txRes.data || txRes;
      setTransactions(Array.isArray(tx) ? tx : tx.transactions || []);
    } catch (err) {
      console.error('Failed to load daybook:', err);
    } finally {
      setLoading(false);
    }
  }, [today]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const addExpense = async () => {
    if (!expenseCategory) {
      setMessage('Pick an expense category');
      return;
    }
    if (!expenseCause.trim() || !(parseFloat(expenseAmount) > 0)) {
      setMessage('Enter an expense description and amount');
      return;
    }
    setSaving(true);
    setMessage('');
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
      setMessage('✅ Expense recorded');
      load();
    } catch (err) {
      setMessage('Failed to record expense');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const s = summary || {};
  const stat = (label, value, cls = 'text-slate-900') => (
    <div className="bg-slate-50 rounded-xl p-3 text-center">
      <div className={`text-lg font-bold tabular-nums ${cls}`}>
        {currency}{parseFloat(value || 0).toLocaleString()}
      </div>
      <div className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">{label}</div>
    </div>
  );

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
                {stat('Cash sales', s.cash_sales ?? s.total_cash ?? 0, 'text-emerald-700')}
                {stat('Digital / card', s.online_sales ?? s.total_online ?? 0, 'text-blue-700')}
                {stat('Expenses', s.total_expenses ?? s.expenses ?? 0, 'text-rose-600')}
                {stat('Net total', s.net_total ?? s.total_sales ?? 0)}
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
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
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
                {message && <div className="text-xs text-slate-500">{message}</div>}
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
                        <div className={`text-sm font-bold tabular-nums ${tx.transaction_type === 'expense' ? 'text-rose-600' : 'text-emerald-700'}`}>
                          {tx.transaction_type === 'expense' ? '−' : '+'}{currency}{parseFloat(tx.amount).toLocaleString()}
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
