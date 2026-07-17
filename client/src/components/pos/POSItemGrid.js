import React, { useMemo, useState } from 'react';
import { SearchIcon } from './icons';

// Menu grid for the POS: photo tiles, category pills, search.
// Light content surface inside the dark POS chrome so food photos read well.
const POSItemGrid = ({ menuItems, onAddItem, currency = 'Rs.' }) => {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [search, setSearch] = useState('');

  const categories = useMemo(
    () => ['All', ...new Set(menuItems.map((item) => item.category).filter(Boolean))],
    [menuItems]
  );

  const visibleItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return menuItems.filter((item) => {
      if (item.is_available === false) return false;
      if (selectedCategory !== 'All' && item.category !== selectedCategory) return false;
      if (q && !`${item.name} ${item.category || ''}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [menuItems, selectedCategory, search]);

  return (
    <div className="flex flex-col lg:h-full bg-slate-100">
      {/* Search + categories */}
      <div className="px-4 pt-3 pb-2 space-y-2.5 bg-white border-b border-slate-200">
        <div className="relative">
          <SearchIcon size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search menu…"
            className="w-full h-11 pl-10 pr-4 bg-slate-100 border border-transparent rounded-xl text-[15px] text-slate-900 placeholder-slate-400 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-colors"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 -mb-1 scrollbar-none">
          {categories.map((cat) => {
            const active = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`h-9 px-4 rounded-full text-[13px] font-semibold whitespace-nowrap cursor-pointer transition-colors duration-150 ${
                  active
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 active:bg-slate-300'
                }`}
                aria-pressed={active}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tiles */}
      <div className="lg:flex-1 lg:overflow-y-auto p-3">
        {visibleItems.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2">
            <SearchIcon size={28} className="text-slate-300" />
            <p className="text-sm font-medium">No items match</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2.5">
            {visibleItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onAddItem(item)}
                className="group text-left bg-white rounded-2xl overflow-hidden ring-1 ring-slate-200 hover:ring-emerald-400 hover:shadow-lg active:scale-[0.97] cursor-pointer transition-all duration-150"
              >
                <div className="aspect-[4/3] bg-slate-100 overflow-hidden relative">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-2xl font-bold text-slate-300 select-none">
                        {item.name?.slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <span className="absolute bottom-1.5 right-1.5 px-2 py-0.5 bg-slate-900/85 backdrop-blur-sm text-white text-[12px] font-bold rounded-lg tabular-nums">
                    {currency}{parseFloat(item.price).toFixed(0)}
                  </span>
                </div>
                <div className="px-2.5 py-2">
                  <p className="text-[13px] font-semibold text-slate-900 leading-snug line-clamp-2">{item.name}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default POSItemGrid;
