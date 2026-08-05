import React, { useMemo, useState } from 'react';
import { fetchApi } from '../../services/apiService';
import { XIcon } from './icons';

// Front-desk fix-up for a mistaken order: swap/add/remove items while the
// order is still pending. The server refuses the save once cooking started.
const EditOrderModal = ({ order, menuItems, currency = 'Rs.', onClose, onSaved }) => {
  const [lines, setLines] = useState(() =>
    (order.items || []).map((it) => ({
      id: it.menu_item_id || it.id || null,
      name: it.name || it.menu_item_name || it.item_name,
      category: it.category || it.menu_item_category || null,
      price: parseFloat(it.price),
      quantity: parseInt(it.quantity) || 1,
    }))
  );
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const available = useMemo(() => {
    const q = search.trim().toLowerCase();
    return menuItems
      .filter((m) => m.is_available !== false)
      .filter((m) => !q || m.name.toLowerCase().includes(q) || (m.category || '').toLowerCase().includes(q))
      .slice(0, 40);
  }, [menuItems, search]);

  const total = useMemo(() => lines.reduce((s, l) => s + l.price * l.quantity, 0), [lines]);

  const addLine = (item) => {
    setLines((prev) => {
      const existing = prev.find((l) => l.name === item.name);
      if (existing) return prev.map((l) => (l.name === item.name ? { ...l, quantity: l.quantity + 1 } : l));
      return [...prev, { id: item.id, name: item.name, category: item.category, price: parseFloat(item.price), quantity: 1 }];
    });
  };

  const changeQty = (index, qty) => {
    setLines((prev) => (qty <= 0 ? prev.filter((_, i) => i !== index) : prev.map((l, i) => (i === index ? { ...l, quantity: qty } : l))));
  };

  const handleSave = async () => {
    if (lines.length === 0) {
      setError('The order needs at least one item — delete the order instead if nothing is wanted.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await fetchApi.put(`/api/orders/${order.id}/items`, { items: lines });
      onSaved(res?.order || null);
    } catch (err) {
      setError(err?.message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={`Edit order ${order.order_number}`}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-[16px] font-extrabold text-slate-900">Edit order {order.order_number}</h2>
            <p className="text-[12px] text-slate-500">
              {order.table_id ? `Table ${order.table_id}` : order.order_type === 'delivery' ? 'Delivery' : 'Takeaway'} · only possible while the kitchen hasn't started
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100">
            <XIcon size={16} />
          </button>
        </div>

        <div className="flex-1 min-h-0 grid grid-cols-1 sm:grid-cols-2 gap-0 overflow-hidden">
          {/* Current items */}
          <div className="border-b sm:border-b-0 sm:border-r border-slate-200 flex flex-col min-h-0">
            <p className="px-4 pt-3 pb-1 text-[11px] font-bold uppercase tracking-wide text-slate-500 flex-shrink-0">In this order</p>
            <ul className="flex-1 overflow-y-auto px-4 pb-3 space-y-2">
              {lines.length === 0 && <li className="text-[13px] text-slate-400 py-4 text-center">No items — add from the menu →</li>}
              {lines.map((l, i) => (
                <li key={`${l.name}-${i}`} className="flex items-center gap-2 bg-slate-50 rounded-lg p-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-slate-800 truncate">{l.name}</p>
                    <p className="text-[11px] text-slate-500 tabular-nums">{currency}{l.price} each</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => changeQty(i, l.quantity - 1)} aria-label={`Decrease ${l.name}`} className="w-8 h-8 rounded-md bg-white border border-slate-200 text-slate-700 font-bold">−</button>
                    <span className="w-6 text-center text-[13px] font-bold tabular-nums">{l.quantity}</span>
                    <button onClick={() => changeQty(i, l.quantity + 1)} aria-label={`Increase ${l.name}`} className="w-8 h-8 rounded-md bg-emerald-600 text-white font-bold">+</button>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Menu picker */}
          <div className="flex flex-col min-h-0">
            <div className="px-4 pt-3 pb-2 flex-shrink-0">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search menu to add…"
                className="w-full h-10 px-3 text-[14px] border-2 border-slate-200 rounded-lg focus:border-emerald-500 outline-none"
              />
            </div>
            <ul className="flex-1 overflow-y-auto px-4 pb-3 space-y-1">
              {available.map((m) => (
                <li key={m.id}>
                  <button
                    onClick={() => addLine(m)}
                    className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg hover:bg-emerald-50 text-left"
                  >
                    <span className="text-[13px] text-slate-800 truncate">{m.name}</span>
                    <span className="text-[12px] font-semibold text-slate-500 tabular-nums shrink-0">{currency}{m.price}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-slate-200 flex items-center gap-3">
          <div className="flex-1">
            <p className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold">New total</p>
            <p className="text-[18px] font-extrabold text-slate-900 tabular-nums">{currency}{total.toFixed(0)}</p>
            {error && <p role="alert" className="text-[12px] text-red-600 mt-1">{error}</p>}
          </div>
          <button onClick={onClose} className="h-11 px-4 rounded-xl bg-slate-100 text-slate-700 font-semibold text-[14px] hover:bg-slate-200">Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="h-11 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-[14px] disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditOrderModal;
