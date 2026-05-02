import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useDeliveryCart } from '../context/DeliveryCartContext';
// No longer need table URL mapping - using simple numeric IDs

const FloatingCart = () => {
  const location = useLocation();
  const { currentTable, cartItems, getTotalPrice } = useCart();
  const { deliveryCartItems, getDeliveryTotalPrice } = useDeliveryCart();
  
  // Don't show on admin page, delivery cart page, or table pages
  if (location.pathname === '/admin' || 
      location.pathname === '/delivery-cart') {
    return null;
  }
  
  // Don't show on table pages (they have their own cart UI)
  // Check for numeric table URLs like /1, /2, /3, etc.
  const isTablePage = location.pathname.match(/^\/\d+$/);
  
  if (isTablePage) {
    return null;
  }
  
  // Calculate cart totals
  const tableCartCount = cartItems.reduce((total, item) => total + item.quantity, 0);
  const deliveryCartCount = deliveryCartItems.reduce((total, item) => total + item.quantity, 0);
  
  // Determine which cart to show
  let cartItemCount = 0;
  let totalPrice = 0;
  let cartLink = '';
  let cartType = '';
  let cartColor = '';
  
  if (currentTable && tableCartCount > 0) {
    // Show table cart - simple numeric URL
    cartItemCount = tableCartCount;
    totalPrice = getTotalPrice();
    
    // Simple numeric table URL
    cartLink = `/${currentTable}`;
    
    cartType = `Table ${currentTable}`;
    cartColor = 'bg-primary hover:bg-orange-600';
  } else if (!currentTable && deliveryCartCount > 0) {
    // Show delivery cart
    cartItemCount = deliveryCartCount;
    totalPrice = getDeliveryTotalPrice();
    cartLink = '/delivery-cart';
    cartType = 'Delivery';
    cartColor = 'bg-green-600 hover:bg-green-700';
  }
  
  // Don't show if no items in cart
  if (cartItemCount === 0) {
    return null;
  }
  
  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Link
        to={cartLink}
        className={`${cartColor} text-white rounded-full shadow-lg transition-all duration-300 hover:scale-105 active:scale-95 flex items-center justify-center group touch-manipulation`}
        style={{
          minWidth: '60px',
          minHeight: '60px',
          padding: '12px',
          touchAction: 'manipulation'
        }}
      >
        {/* Mobile View - Compact */}
        <div className="flex items-center justify-center md:hidden">
          <div className="relative">
            <svg 
              className="w-6 h-6" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-1.5 6M7 13l-1.5 6m0 0h9M17 21a2 2 0 100-4 2 2 0 000 4zM9 21a2 2 0 100-4 2 2 0 000 4z" 
              />
            </svg>
            {/* Item count badge */}
            {cartItemCount > 0 && (
              <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                {cartItemCount}
              </div>
            )}
          </div>
        </div>
        
        {/* Desktop View - Expanded */}
        <div className="hidden md:flex items-center gap-3 px-2">
          <div className="relative">
            <svg 
              className="w-5 h-5" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-1.5 6M7 13l-1.5 6m0 0h9M17 21a2 2 0 100-4 2 2 0 000 4zM9 21a2 2 0 100-4 2 2 0 000 4z" 
              />
            </svg>
            {/* Item count badge */}
            {cartItemCount > 0 && (
              <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold text-[10px]">
                {cartItemCount}
              </div>
            )}
          </div>
          <div className="text-sm font-medium">
            <div className="whitespace-nowrap">{cartType} Cart</div>
            <div className="text-xs opacity-90">NPR {totalPrice}/-</div>
          </div>
        </div>
        
        {/* Hover tooltip for mobile */}
        <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-gray-800 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap md:hidden">
          {cartType} Cart: {cartItemCount} items
          <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
        </div>
      </Link>
    </div>
  );
};

export default FloatingCart;
