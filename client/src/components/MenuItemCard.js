import React, { memo } from 'react';

const MenuItemCard = memo(({
  item,
  quantity,
  onAddToCart,
  onUpdateQuantity,
  isTableCustomer,
  currentTable,
  isHappyHour = false
}) => {
  // Calculate discounted price during Happy Hour (10% off)
  const originalPrice = parseFloat(item.price);
  const discountedPrice = isHappyHour ? Math.round(originalPrice * 0.9) : originalPrice;
  const hasDiscount = isHappyHour && discountedPrice < originalPrice;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 hover:shadow-lg hover:border-slate-300 transition-all overflow-hidden relative flex flex-col">
      {/* Happy Hour Badge */}
      {hasDiscount && (
        <div className="absolute top-2 right-2 z-10 bg-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
          10% OFF
        </div>
      )}

      <div className="p-4 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="text-base font-semibold text-slate-800 leading-snug">
            {item.name}
            {item.is_vegetarian && <span className="ml-1.5 text-green-600" title="Vegetarian">🌿</span>}
            {item.is_spicy && <span className="ml-1 text-red-500" title="Spicy">🌶️</span>}
          </h3>
          <div className="flex-shrink-0 text-right">
            {hasDiscount ? (
              <>
                <div className="text-xs text-slate-400 line-through">NPR {originalPrice}</div>
                <div className="text-base font-bold text-orange-600">NPR {discountedPrice}</div>
              </>
            ) : (
              <div className="text-base font-bold text-orange-600">NPR {originalPrice}</div>
            )}
          </div>
        </div>
        {item.description && <p className="text-sm text-slate-500 mb-3 line-clamp-2">{item.description}</p>}

        <div className="mt-auto pt-1">
          {quantity === 0 ? (
            <button
              onClick={() => onAddToCart(item)}
              className="w-full px-4 py-2.5 rounded-lg bg-orange-500 text-white hover:bg-orange-600 active:scale-95 transition-all font-semibold"
            >
              {isTableCustomer ? `Add to Table ${currentTable}` : 'Add to Cart'}
            </button>
          ) : (
            <div className="flex items-center justify-between bg-slate-50 rounded-lg p-1.5">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => onUpdateQuantity(item.id, quantity - 1)}
                  className="bg-white border border-slate-200 text-slate-700 w-9 h-9 rounded-lg hover:bg-slate-100 active:scale-95 transition-all font-bold text-lg"
                >
                  −
                </button>
                <span className="font-semibold text-lg w-6 text-center text-slate-800">{quantity}</span>
                <button
                  onClick={() => onUpdateQuantity(item.id, quantity + 1)}
                  className="w-9 h-9 rounded-lg bg-orange-500 text-white hover:bg-orange-600 active:scale-95 transition-all font-bold text-lg"
                >
                  +
                </button>
              </div>
              <div className="text-right pr-2">
                <div className="text-[10px] uppercase tracking-wide text-slate-400">Total</div>
                <div className="text-sm font-bold text-slate-800">NPR {(discountedPrice * quantity)}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

MenuItemCard.displayName = 'MenuItemCard';

export default MenuItemCard;
