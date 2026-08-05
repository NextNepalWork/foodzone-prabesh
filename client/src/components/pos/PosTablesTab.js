import React, { useCallback, useEffect, useState } from 'react';
import { fetchApi } from '../../services/apiService';
import { useTableCount } from '../../hooks/useSettings';

const STATUS_STYLES = {
  available: 'bg-white border-slate-200 text-slate-400',
  occupied: 'bg-amber-50 border-amber-300 text-amber-700',
  ordering: 'bg-blue-50 border-blue-300 text-blue-700',
  dining: 'bg-emerald-50 border-emerald-300 text-emerald-700',
  payment_pending: 'bg-purple-50 border-purple-300 text-purple-700',
  completed: 'bg-slate-100 border-slate-300 text-slate-600',
};

// Table grid for the front desk: live status per table, click an occupied
// table for details + Clear. Parent bumps refreshTrigger on socket events.
const PosTablesTab = ({ refreshTrigger, currency = 'Rs.', onToast }) => {
  const tableCount = useTableCount();
  const [tables, setTables] = useState({});
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [clearing, setClearing] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const fetchTables = useCallback(async () => {
    try {
      const res = await fetchApi.get('/api/tables/status');
      const byId = {};
      const rows = res?.tables || res?.data || res || [];
      (Array.isArray(rows) ? rows : []).forEach((t) => { byId[t.table_id || t.id] = t; });
      setTables(byId);
    } catch (err) {
      console.error('Failed to fetch table status:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTables(); }, [fetchTables, refreshTrigger]);

  const handleClearTable = async () => {
    if (!selected) return;
    setClearing(true);
    try {
      await fetchApi.post(`/api/clear-table/${selected}`, {});
      onToast?.(`Table ${selected} cleared`);
      setSelected(null);
      setConfirmClear(false);
      fetchTables();
    } catch (err) {
      onToast?.(`Failed to clear table: ${err.message}`, 'error');
    } finally {
      setClearing(false);
    }
  };

  const selectedInfo = selected ? tables[selected] : null;

  return (
    <div className="h-full overflow-y-auto p-4">
      {loading ? (
        <div className="text-center text-slate-400 py-16">Loading tables…</div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3">
          {Array.from({ length: tableCount }, (_, i) => i + 1).map((n) => {
            const info = tables[n];
            const status = info?.status || 'available';
            const style = STATUS_STYLES[status] || STATUS_STYLES.available;
            const total = parseFloat(info?.total_amount || info?.total || 0);
            return (
              <button
                key={n}
                onClick={() => (status === 'available' ? null : setSelected(n))}
                className={`aspect-square rounded-2xl border-2 ${style} flex flex-col items-center justify-center gap-0.5 transition hover:shadow-md ${status === 'available' ? 'cursor-default' : 'cursor-pointer active:scale-95'}`}
                aria-label={`Table ${n}: ${status.replace('_', ' ')}`}
              >
                <span className="text-[18px] font-extrabold">{n}</span>
                <span className="text-[10px] font-semibold capitalize">{status.replace('_', ' ')}</span>
                {total > 0 && <span className="text-[10px] font-bold tabular-nums">{currency}{total.toFixed(0)}</span>}
              </button>
            );
          })}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5">
            <h3 className="text-[16px] font-extrabold text-slate-900 mb-1">Table {selected}</h3>
            <p className="text-[13px] text-slate-500 capitalize mb-3">{(selectedInfo?.status || 'occupied').replace('_', ' ')}</p>
            <dl className="text-[13px] space-y-1.5 mb-4">
              {selectedInfo?.customer_name && (
                <div className="flex justify-between"><dt className="text-slate-500">Customer</dt><dd className="font-semibold text-slate-800">{selectedInfo.customer_name}</dd></div>
              )}
              {selectedInfo?.order_count != null && (
                <div className="flex justify-between"><dt className="text-slate-500">Orders</dt><dd className="font-semibold text-slate-800">{selectedInfo.order_count}</dd></div>
              )}
              {(selectedInfo?.total_amount || selectedInfo?.total) && (
                <div className="flex justify-between"><dt className="text-slate-500">Running total</dt><dd className="font-extrabold text-slate-900 tabular-nums">{currency}{parseFloat(selectedInfo.total_amount || selectedInfo.total).toFixed(0)}</dd></div>
              )}
            </dl>
            {!confirmClear ? (
              <div className="flex gap-2">
                <button onClick={() => setSelected(null)} className="flex-1 h-11 rounded-xl bg-slate-100 text-slate-700 font-semibold text-[14px] hover:bg-slate-200">Close</button>
                <button onClick={() => setConfirmClear(true)} className="flex-1 h-11 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-[14px]">Clear table</button>
              </div>
            ) : (
              <div>
                <p className="text-[13px] text-red-700 bg-red-50 border border-red-200 rounded-lg p-2.5 mb-2">
                  Clearing ends this table's session. Make sure payment was collected first.
                </p>
                <div className="flex gap-2">
                  <button onClick={() => setConfirmClear(false)} className="flex-1 h-11 rounded-xl bg-slate-100 text-slate-700 font-semibold text-[14px]">Back</button>
                  <button onClick={handleClearTable} disabled={clearing} className="flex-1 h-11 rounded-xl bg-red-600 text-white font-bold text-[14px] disabled:opacity-50">
                    {clearing ? 'Clearing…' : 'Yes, clear it'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PosTablesTab;
