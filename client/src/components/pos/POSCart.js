import React from 'react';
import { DineInIcon, TakeawayIcon, DeliveryIcon, PlusIcon, MinusIcon, XIcon, TrashIcon } from './icons';

const ORDER_TYPES = [
  { key: 'dine-in', label: 'Dine-in', Icon: DineInIcon },
  { key: 'takeaway', label: 'Takeaway', Icon: TakeawayIcon },
  { key: 'delivery', label: 'Delivery', Icon: DeliveryIcon },
];

// Dark-chrome cart panel: order type, customer fields, line items,
// discount, totals, charge CTA.
const POSCart = ({
  cart,
  onChangeQty,
  onRemoveItem,
  onClearCart,
  orderType,
  onOrderTypeChange,
  orderMeta,
  onOrderMetaChange,
  discount,
  discountMode,
  onDiscountChange,
  onDiscountModeChange,
  totals,
  onCheckout,
  processing,
  currency = 'Rs.',
}) => {
  const setMeta = (key) => (e) => onOrderMetaChange({ ...orderMeta, [key]: e.target.value });

  const inputCls =
    'w-full h-11 px-3.5 bg-slate-800 border border-slate-700 rounded-xl text-[14px] text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-colors';

  return (
    <div className="flex flex-col lg:h-full bg-slate-900 text-white">
      {/* Order type segmented control */}
      <div className="p-3 pb-0">
        <div className="grid grid-cols-3 gap-1 p-1 bg-slate-800 rounded-xl" role="tablist" aria-label="Order type">
          {ORDER_TYPES.map(({ key, label, Icon }) => {
            const active = orderType === key;
            return (
              <button
                key={key}
                role="tab"
                aria-selected={active}
                onClick={() => onOrderTypeChange(key)}
                className={`h-10 flex items-center justify-center gap-1.5 rounded-lg text-[12.5px] font-semibold cursor-pointer transition-colors duration-150 ${
                  active ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Icon size={15} />
                {label}
              </button>
            );
          })}
        </div>

        {/* Per-type fields */}
        <div className="mt-2.5 space-y-2">
          {orderType === 'dine-in' && (
            <input
              type="number" min="1" inputMode="numeric"
              value={orderMeta.tableId}
              onChange={setMeta('tableId')}
              placeholder="Table number *"
              className={inputCls}
            />
          )}
          <input
            type="text"
            value={orderMeta.customerName}
            onChange={setMeta('customerName')}
            placeholder="Customer name (optional)"
            autoComplete="off"
            className={inputCls}
          />
          {(orderType === 'delivery' || orderType === 'takeaway') && (
            <input
              type="tel" inputMode="tel"
              value={orderMeta.phone}
              onChange={setMeta('phone')}
              placeholder={orderType === 'delivery' ? 'Phone *' : 'Phone (optional)'}
              className={inputCls}
            />
          )}
          {orderType === 'delivery' && (
            <input
              type="text"
              value={orderMeta.address}
              onChange={setMeta('address')}
              placeholder="Delivery address *"
              className={inputCls}
            />
          )}
        </div>
      </div>

      {/* Line items */}
      <div className="lg:flex-1 lg:overflow-y-auto px-3 py-3 min-h-[80px]">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-1.5 py-8">
            <TakeawayIcon size={26} className="text-slate-600" />
            <p className="text-[13px]">Tap menu items to start a sale</p>
          </div>
        ) : (
          <ul className="space-y-1.5">
            {cart.map((line) => (
              <li key={line.id} className="flex items-center gap-2.5 bg-slate-800/70 rounded-xl px-3 py-2">
                <div className="flex-1 min-w-0">
                  <p className="text-[13.5px] font-medium text-white truncate">{line.name}</p>
                  <p className="text-[11.5px] text-slate-400 tabular-nums">
                    {currency}{parseFloat(line.price).toFixed(0)} × {line.quantity}
                  </p>
                </div>
                <div className="flex items-center gap-0.5 bg-slate-900 rounded-lg p-0.5">
                  <button
                    onClick={() => onChangeQty(line.id, line.quantity - 1)}
                    aria-label={`Decrease ${line.name}`}
                    className="w-9 h-9 flex items-center justify-center rounded-md text-slate-300 hover:bg-slate-700 active:bg-slate-600 cursor-pointer transition-colors"
                  >
                    <MinusIcon size={15} />
                  </button>
                  <span className="w-7 text-center text-[14px] font-bold tabular-nums">{line.quantity}</span>
                  <button
                    onClick={() => onChangeQty(line.id, line.quantity + 1)}
                    aria-label={`Increase ${line.name}`}
                    className="w-9 h-9 flex items-center justify-center rounded-md text-slate-300 hover:bg-slate-700 active:bg-slate-600 cursor-pointer transition-colors"
                  >
                    <PlusIcon size={15} />
                  </button>
                </div>
                <span className="w-[70px] text-right text-[14px] font-bold tabular-nums">
                  {currency}{(line.price * line.quantity).toFixed(0)}
                </span>
                <button
                  onClick={() => onRemoveItem(line.id)}
                  aria-label={`Remove ${line.name}`}
                  className="w-8 h-8 flex items-center justify-center rounded-md text-slate-500 hover:text-red-400 hover:bg-red-500/10 cursor-pointer transition-colors"
                >
                  <XIcon size={15} />
                </button>
              </li>
            ))}
          </ul>
        )}
        {cart.length > 0 && (
          <button
            onClick={onClearCart}
            className="mt-2.5 flex items-center gap-1.5 text-[12px] font-medium text-slate-500 hover:text-red-400 cursor-pointer transition-colors"
          >
            <TrashIcon size={13} />
            Clear sale
          </button>
        )}
      </div>

      {/* Discount + totals + CTA */}
      <div className="border-t border-slate-800 p-3 space-y-3">
        <div className="flex items-center gap-2">
          <label htmlFor="pos-discount" className="text-[12px] font-medium text-slate-400 w-[60px]">Discount</label>
          <input
            id="pos-discount"
            type="number" min="0" inputMode="decimal"
            value={discount}
            onChange={(e) => onDiscountChange(e.target.value)}
            placeholder="0"
            className="flex-1 h-10 px-3 bg-slate-800 border border-slate-700 rounded-lg text-[14px] text-right text-white tabular-nums placeholder-slate-500 focus:border-emerald-500 outline-none transition-colors"
          />
          <div className="flex p-0.5 bg-slate-800 rounded-lg" role="group" aria-label="Discount type">
            <button
              onClick={() => onDiscountModeChange('amount')}
              aria-pressed={discountMode === 'amount'}
              className={`h-9 px-3 rounded-md text-[12px] font-bold cursor-pointer transition-colors ${discountMode === 'amount' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              {currency}
            </button>
            <button
              onClick={() => onDiscountModeChange('percent')}
              aria-pressed={discountMode === 'percent'}
              className={`h-9 px-3 rounded-md text-[12px] font-bold cursor-pointer transition-colors ${discountMode === 'percent' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              %
            </button>
          </div>
        </div>

        <dl className="space-y-1">
          <div className="flex justify-between text-[13px] text-slate-400">
            <dt>Subtotal</dt>
            <dd className="tabular-nums">{currency}{totals.subtotal.toFixed(0)}</dd>
          </div>
          {totals.discount > 0 && (
            <div className="flex justify-between text-[13px] text-rose-400">
              <dt>Discount</dt>
              <dd className="tabular-nums">− {currency}{totals.discount.toFixed(0)}</dd>
            </div>
          )}
          <div className="flex justify-between items-baseline pt-1.5 border-t border-slate-800">
            <dt className="text-[14px] font-semibold text-slate-300">Total</dt>
            <dd className="text-[22px] font-extrabold tabular-nums">{currency}{totals.total.toFixed(0)}</dd>
          </div>
        </dl>

        <button
          onClick={onCheckout}
          disabled={cart.length === 0 || processing}
          className="w-full h-[52px] bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 rounded-xl font-extrabold text-[16px] cursor-pointer transition-colors duration-150 disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/20"
        >
          {processing ? 'Processing…' : `Charge ${currency}${totals.total.toFixed(0)}`}
        </button>
      </div>
    </div>
  );
};

export default POSCart;
