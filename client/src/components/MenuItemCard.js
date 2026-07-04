import React, { memo } from 'react';

// Compact horizontal menu row — matches the table-order page list style.
// Used on the customer /menu (delivery) and table browsing pages. Adds to
// whichever cart the parent wires up (delivery cart or table cart).
const MenuItemCard = memo(({
  item,
  quantity,
  onAddToCart,
  onUpdateQuantity,
  isTableCustomer,
  currentTable,
  isHappyHour = false
}) => {
  const originalPrice = parseFloat(item.price);
  const discountedPrice = isHappyHour ? Math.round(originalPrice * 0.9) : originalPrice;
  const hasDiscount = isHappyHour && discountedPrice < originalPrice;

  return (
    <li className="flex items-center justify-between gap-3 p-3.5 bg-white rounded-xl border border-slate-200 shadow-sm hover:border-slate-300 transition-colors">
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-slate-800 text-sm sm:text-base leading-snug">
          {item.name}
          {item.is_vegetarian && <span className="ml-1.5 text-green-600" title="Vegetarian">🌿</span>}
          {item.is_spicy && <span className="ml-1 text-red-500" title="Spicy">🌶️</span>}
        </h4>
        {item.category && <div className="text-[11px] text-slate-500 truncate mt-0.5">{item.category}</div>}
        <div className="mt-0.5 flex items-center gap-2">
          {hasDiscount && <span className="text-xs text-slate-400 line-through">NPR {originalPrice}</span>}
          <span className="text-sm font-bold text-amber-600">NPR {discountedPrice}/-</span>
          {hasDiscount && <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">10% OFF</span>}
        </div>
      </div>

      {quantity === 0 ? (
        <button
          onClick={() => onAddToCart(item)}
          className="shrink-0 px-4 h-10 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold active:scale-95 transition shadow"
        >
          + Add
        </button>
      ) : (
        <div className="shrink-0 flex items-center gap-1.5 bg-slate-100 rounded-full p-1">
          <button
            onClick={() => onUpdateQuantity(item.id, quantity - 1)}
            className="w-8 h-8 rounded-full bg-white text-slate-700 font-bold text-base shadow active:scale-95"
          >
            −
          </button>
          <span className="text-sm font-semibold w-6 text-center">{quantity}</span>
          <button
            onClick={() => onUpdateQuantity(item.id, quantity + 1)}
            className="w-8 h-8 rounded-full bg-amber-500 text-white font-bold text-base shadow active:scale-95"
          >
            +
          </button>
        </div>
      )}
    </li>
  );
});

MenuItemCard.displayName = 'MenuItemCard';

export default MenuItemCard;
