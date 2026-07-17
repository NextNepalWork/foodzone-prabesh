import React, { useEffect, useState } from 'react';
import { fetchApi } from '../../services/apiService';
import { getApiUrl } from '../../config/api';
import { BanknoteIcon, CreditCardIcon, QrCodeIcon, WalletIcon, XIcon, ImageOffIcon } from './icons';

const METHODS = [
  { key: 'cash', label: 'Cash', Icon: BanknoteIcon },
  { key: 'card', label: 'Card', Icon: CreditCardIcon },
  { key: 'fonepay', label: 'FonePay', Icon: QrCodeIcon, qr: true },
  { key: 'esewa', label: 'eSewa', Icon: WalletIcon, qr: true },
  { key: 'khalti', label: 'Khalti', Icon: WalletIcon, qr: true },
];

// Resolve QR image paths against the API origin (they live in /uploads or
// settings-stored URLs on the backend).
const resolveImageUrl = (url) => {
  if (!url) return null;
  if (/^https?:\/\//.test(url) || url.startsWith('data:')) return url;
  return `${getApiUrl()}${url.startsWith('/') ? '' : '/'}${url}`;
};

// Payment step of the POS checkout. Cash → tendered/change; QR methods →
// shows the restaurant's uploaded payment QR full-size so the customer can
// scan it at the counter.
const POSPaymentPanel = ({ total, onConfirm, onCancel, processing, error, currency = 'Rs.' }) => {
  const [method, setMethod] = useState('cash');
  const [amountReceived, setAmountReceived] = useState('');
  const [reference, setReference] = useState('');
  const [qrCodes, setQrCodes] = useState(null); // null = loading

  useEffect(() => {
    let cancelled = false;
    fetchApi.get('/api/payment-qr-codes')
      .then((data) => {
        if (cancelled) return;
        const list = Array.isArray(data) ? data : data?.qrCodes || [];
        setQrCodes(list);
      })
      .catch(() => { if (!cancelled) setQrCodes([]); });
    return () => { cancelled = true; };
  }, []);

  const received = parseFloat(amountReceived) || 0;
  const change = Math.max(0, received - total);
  const isQrMethod = METHODS.find((m) => m.key === method)?.qr;
  const activeQr = isQrMethod
    ? (qrCodes || []).find((qr) => qr.payment_method === method && qr.qr_image_url)
    : null;

  const canConfirm = method === 'cash' ? received >= total : true;

  const quickAmounts = [total, Math.ceil(total / 100) * 100, Math.ceil(total / 500) * 500, Math.ceil(total / 1000) * 1000]
    .filter((v, i, arr) => v >= total && arr.indexOf(v) === i)
    .slice(0, 4);

  const handleConfirm = () => {
    onConfirm({
      payment_method: method,
      amount: total,
      amount_received: method === 'cash' ? received : null,
      change_given: method === 'cash' ? change : null,
      invoice_number: method === 'cash' ? null : (reference.trim() || null),
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Take payment">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-slate-100">
          <div>
            <p className="text-[12px] font-medium text-slate-400 uppercase tracking-wide">Amount due</p>
            <p className="text-[28px] font-extrabold text-slate-900 tabular-nums leading-tight">
              {currency}{total.toFixed(0)}
            </p>
          </div>
          <button
            onClick={onCancel}
            disabled={processing}
            aria-label="Close payment"
            className="w-10 h-10 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer transition-colors"
          >
            <XIcon size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Method selector */}
          <div className="grid grid-cols-5 gap-1.5" role="radiogroup" aria-label="Payment method">
            {METHODS.map(({ key, label, Icon }) => {
              const active = method === key;
              return (
                <button
                  key={key}
                  role="radio"
                  aria-checked={active}
                  onClick={() => setMethod(key)}
                  className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border-2 cursor-pointer transition-colors duration-150 ${
                    active
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700'
                  }`}
                >
                  <Icon size={19} />
                  <span className="text-[10.5px] font-bold">{label}</span>
                </button>
              );
            })}
          </div>

          {/* Cash: tendered + change */}
          {method === 'cash' && (
            <div className="space-y-2.5">
              <div>
                <label htmlFor="pos-tendered" className="block text-[12px] font-semibold text-slate-500 mb-1.5">
                  Amount received
                </label>
                <input
                  id="pos-tendered"
                  type="number" inputMode="decimal"
                  value={amountReceived}
                  onChange={(e) => setAmountReceived(e.target.value)}
                  placeholder={`Min ${currency}${total.toFixed(0)}`}
                  min={total}
                  autoFocus
                  className="w-full h-14 px-4 border-2 border-slate-200 rounded-2xl text-[22px] text-right font-bold tabular-nums text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-colors"
                />
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {quickAmounts.map((amt) => (
                  <button
                    key={amt}
                    onClick={() => setAmountReceived(String(amt))}
                    className="h-11 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 rounded-xl text-[13px] font-bold tabular-nums text-slate-700 cursor-pointer transition-colors"
                  >
                    {amt}
                  </button>
                ))}
              </div>
              {received >= total && (
                <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3">
                  <span className="text-[13px] font-semibold text-emerald-900">Change to give</span>
                  <span className="text-[20px] font-extrabold text-emerald-700 tabular-nums">{currency}{change.toFixed(0)}</span>
                </div>
              )}
            </div>
          )}

          {/* QR methods: show the payment QR full-size */}
          {isQrMethod && (
            <div className="space-y-2.5">
              {qrCodes === null ? (
                <div className="aspect-square max-w-[280px] mx-auto bg-slate-100 rounded-2xl animate-pulse" />
              ) : activeQr ? (
                <div className="text-center">
                  <div className="inline-block p-3 bg-white rounded-2xl ring-1 ring-slate-200 shadow-sm">
                    <img
                      src={resolveImageUrl(activeQr.qr_image_url)}
                      alt={`${METHODS.find((m) => m.key === method)?.label} payment QR code`}
                      className="w-[240px] h-[240px] object-contain rounded-lg"
                    />
                  </div>
                  {(activeQr.account_name || activeQr.account_number) && (
                    <p className="mt-2 text-[13px] text-slate-600">
                      {activeQr.account_name}
                      {activeQr.account_name && activeQr.account_number ? ' · ' : ''}
                      {activeQr.account_number}
                    </p>
                  )}
                  <p className="mt-1 text-[12px] text-slate-400">
                    Ask the customer to scan and pay {currency}{total.toFixed(0)}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 py-6 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                  <ImageOffIcon size={26} className="text-slate-300" />
                  <p className="text-[13px] font-medium text-slate-500">
                    No {METHODS.find((m) => m.key === method)?.label} QR uploaded yet
                  </p>
                  <p className="text-[12px] text-slate-400 px-6">
                    Upload it in Admin → Settings → Tables &amp; QR payments
                  </p>
                </div>
              )}
              <div>
                <label htmlFor="pos-reference" className="block text-[12px] font-semibold text-slate-500 mb-1.5">
                  Transaction reference (optional)
                </label>
                <input
                  id="pos-reference"
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="e.g. last 4 digits of the transaction ID"
                  className="w-full h-11 px-3.5 border-2 border-slate-200 rounded-xl text-[14px] text-slate-900 focus:border-emerald-500 outline-none transition-colors"
                />
              </div>
            </div>
          )}

          {/* Card: reference only */}
          {method === 'card' && (
            <div>
              <label htmlFor="pos-card-ref" className="block text-[12px] font-semibold text-slate-500 mb-1.5">
                Card terminal reference (optional)
              </label>
              <input
                id="pos-card-ref"
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Terminal receipt number"
                className="w-full h-11 px-3.5 border-2 border-slate-200 rounded-xl text-[14px] text-slate-900 focus:border-emerald-500 outline-none transition-colors"
              />
            </div>
          )}

          {error && (
            <div role="alert" className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-[13px]">
              {error}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex gap-2 px-5 py-4 border-t border-slate-100 bg-white">
          <button
            onClick={onCancel}
            disabled={processing}
            className="h-12 px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-[14px] cursor-pointer transition-colors disabled:opacity-50"
          >
            Back
          </button>
          <button
            onClick={handleConfirm}
            disabled={processing || !canConfirm}
            className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-xl font-extrabold text-[15px] cursor-pointer transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {processing ? 'Processing…' : method === 'cash' ? 'Confirm & Print' : 'Payment received — Print'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default POSPaymentPanel;
