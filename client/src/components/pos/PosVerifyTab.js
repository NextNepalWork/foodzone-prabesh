import React, { useCallback, useEffect, useState } from 'react';
import { fetchApi } from '../../services/apiService';
import { getApiUrl } from '../../config/api';

// Queue of customer-uploaded QR payment screenshots (eSewa/Khalti/FonePay).
// Customers are told "staff will verify shortly" — this is where that happens.
const PosVerifyTab = ({ refreshTrigger, currency = 'Rs.', onToast }) => {
  const [receipts, setReceipts] = useState([]);
  const [filter, setFilter] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [preview, setPreview] = useState(null);

  const fetchReceipts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchApi.get(`/api/payment-qr/receipts${filter ? `?status=${filter}` : ''}`);
      setReceipts(res?.receipts || []);
    } catch (err) {
      console.error('Failed to fetch receipts:', err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { fetchReceipts(); }, [fetchReceipts, refreshTrigger]);

  const act = async (id, status) => {
    setBusyId(id);
    try {
      await fetchApi.post(`/api/payment-qr/receipts/${id}/verify`, { status, notes: `${status} at POS` });
      onToast?.(status === 'verified' ? 'Payment verified' : 'Receipt rejected', status === 'verified' ? 'success' : 'info');
      fetchReceipts();
    } catch (err) {
      onToast?.(`Failed: ${err.message}`, 'error');
    } finally {
      setBusyId(null);
    }
  };

  const imgUrl = (r) => `${getApiUrl()}${r.receipt_image_url}`;

  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="flex gap-2 mb-4">
        {['pending', 'verified', 'rejected'].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`h-9 px-4 rounded-full text-[13px] font-semibold capitalize transition ${
              filter === s ? 'bg-emerald-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-emerald-300'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center text-slate-400 py-16">Loading receipts…</div>
      ) : receipts.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <p className="text-4xl mb-2">🧾</p>
          <p className="text-[14px]">No {filter} payment receipts</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {receipts.map((r) => (
            <div key={r.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <button onClick={() => setPreview(imgUrl(r))} className="block w-full h-40 bg-slate-100 overflow-hidden" aria-label="View receipt screenshot full size">
                <img src={imgUrl(r)} alt={`Payment receipt for table ${r.table_id}`} className="w-full h-full object-cover hover:scale-105 transition-transform" loading="lazy" />
              </button>
              <div className="p-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[14px] font-extrabold text-slate-900">Table {r.table_id}</p>
                  <p className="text-[14px] font-extrabold text-emerald-700 tabular-nums">{currency}{parseFloat(r.total_amount).toFixed(0)}</p>
                </div>
                <p className="text-[12px] text-slate-500 capitalize">{r.payment_method} · {r.customer_name || 'Guest'}</p>
                <p className="text-[11px] text-slate-400">{new Date(r.created_at).toLocaleTimeString()}</p>
                {filter === 'pending' && (
                  <div className="flex gap-2 mt-2.5">
                    <button
                      onClick={() => act(r.id, 'verified')}
                      disabled={busyId === r.id}
                      className="flex-1 h-10 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[13px] font-bold disabled:opacity-50"
                    >
                      ✓ Verify
                    </button>
                    <button
                      onClick={() => act(r.id, 'rejected')}
                      disabled={busyId === r.id}
                      className="flex-1 h-10 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 text-[13px] font-bold disabled:opacity-50"
                    >
                      ✕ Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {preview && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setPreview(null)} role="dialog" aria-modal="true" aria-label="Receipt screenshot">
          <img src={preview} alt="Payment receipt full size" className="max-w-full max-h-full rounded-xl" />
        </div>
      )}
    </div>
  );
};

export default PosVerifyTab;
